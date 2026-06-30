import * as cheerio from "cheerio";
import fs from "node:fs";
import path from "node:path";

import { localDataDir, repoRoot } from "./env";

type Mode = "probe";

type ProbeCandidate = {
  name: string;
  queryName?: string;
  exactName?: string;
  source?: string;
  note?: string;
};

type SearchLineResult = {
  id: number | null;
  name: string;
  schoolCode: string;
  saveCode: string;
  resistanceCode: string;
  durationCode: string;
  castingTimeCode: string;
  rangeCode: string;
  rechargeCode: string;
  shortDescription: string;
};

type DetailResult = {
  id: number | null;
  name: string;
  sourceLabel: string | null;
  levels: string | null;
  displayDescription: string | null;
};

type CandidateProbeResult = {
  candidate: ProbeCandidate;
  query: {
    name: string;
    exactName: string;
    source: string | null;
  };
  status: "matched" | "missing" | "ambiguous";
  matched: SearchLineResult | null;
  sourceDetail: DetailResult | null;
  resultCount: number;
  nearbyNames: string[];
  warnings: string[];
};

type ProbeReport = {
  generatedAt: string;
  source: {
    name: "IMarvinTPA";
    searchUrl: string;
    mode: "Small=5 for short descriptions; Small=2 for source hints";
  };
  options: {
    concurrency: number;
    delayMs: number;
    limit: number | null;
  };
  summary: {
    candidates: number;
    matched: number;
    missing: number;
    ambiguous: number;
  };
  results: CandidateProbeResult[];
};

const SEARCH_URL = "https://imarvintpa.com/dndlive/SearchList.php";
const REPORT_ROOT = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "en-summaries",
);
const MAX_CONCURRENCY = 3;
const DEFAULT_DELAY_MS = 750;

const DEFAULT_CANDIDATES: ProbeCandidate[] = [
  { name: "Fireball" },
  { name: "Spider Poison" },
  {
    name: "Shield of Faith, Legion",
    queryName: "*Shield*Faith*",
    exactName: "Mass Shield of Faith",
    source: "Miniatures",
    note: "IMarvinTPA appears to use the Mass naming family.",
  },
  { name: "Blood Wind" },
  {
    name: "Fiery Assault",
    note: "Expected miss: Tome of Battle maneuver, not a spell.",
  },
];

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools en:summaries:probe
  npm run -w data-tools en:summaries:probe -- --candidate "Spider Poison" --candidate "Blood Wind"
  npm run -w data-tools en:summaries:probe -- --input short-desc/imarvin-candidates.json --limit 20

Options:
  --candidate <name>       Add a simple exact-name candidate.
  --input <path>           JSON candidate file. Relative paths resolve under data/.
  --limit <n>              Probe at most n candidates.
  --concurrency <n>        Parallel candidate probes. Default 1, max ${MAX_CONCURRENCY}.
  --delay-ms <n>           Minimum spacing between HTTP requests. Default ${DEFAULT_DELAY_MS}.

Input JSON can be an array of strings or objects:
  { "name": "Shield of Faith, Legion", "queryName": "*Shield*Faith*", "exactName": "Mass Shield of Faith", "source": "Miniatures" }
`);
  process.exit(1);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePositiveInt(raw: string | undefined, label: string) {
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer, got ${raw}`);
  }
  return parsed;
}

function normalizeName(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[’]/g, "'")
    .trim()
    .toLowerCase();
}

function textOf(
  $: cheerio.CheerioAPI,
  element: Parameters<cheerio.CheerioAPI>[0],
) {
  return $(element).text().replace(/\s+/g, " ").trim();
}

function rowCells(
  $: cheerio.CheerioAPI,
  row: Parameters<cheerio.CheerioAPI>[0] | undefined,
) {
  if (!row) return [];
  return $(row)
    .children("th,td")
    .map((_, cell) => textOf($, cell))
    .get()
    .filter(Boolean);
}

function hrefSpellId(href: string | undefined) {
  if (!href) return null;
  const match = href.match(/[?&]ID=(\d+)/i);
  return match?.[1] ? Number(match[1]) : null;
}

function resolveInputPath(rawPath: string) {
  if (path.isAbsolute(rawPath)) return rawPath;
  return path.resolve(localDataDir(), rawPath);
}

function asCandidate(value: unknown): ProbeCandidate {
  if (typeof value === "string") {
    const name = value.trim();
    if (!name) throw new Error("Candidate name cannot be empty");
    return { name };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Candidate must be a string or object");
  }

  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || !record.name.trim()) {
    throw new Error("Candidate object requires non-empty string name");
  }

  const candidate: ProbeCandidate = { name: record.name.trim() };
  if (typeof record.queryName === "string" && record.queryName.trim()) {
    candidate.queryName = record.queryName.trim();
  }
  if (typeof record.exactName === "string" && record.exactName.trim()) {
    candidate.exactName = record.exactName.trim();
  }
  if (typeof record.source === "string" && record.source.trim()) {
    candidate.source = record.source.trim();
  }
  if (typeof record.note === "string" && record.note.trim()) {
    candidate.note = record.note.trim();
  }
  return candidate;
}

function readCandidates(inputPath: string | undefined, cliCandidates: string[]) {
  const candidates: ProbeCandidate[] = [];

  if (inputPath) {
    const resolved = resolveInputPath(inputPath);
    const parsed = JSON.parse(fs.readFileSync(resolved, "utf-8")) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`Input candidate JSON must be an array: ${resolved}`);
    }
    candidates.push(...parsed.map(asCandidate));
  }

  candidates.push(...cliCandidates.map(asCandidate));

  return candidates.length > 0 ? candidates : DEFAULT_CANDIDATES;
}

function parseArgs(argv: string[]) {
  const cliCandidates: string[] = [];
  let inputPath: string | undefined;
  let limit: number | undefined;
  let concurrency = 1;
  let delayMs = DEFAULT_DELAY_MS;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--candidate":
        if (!argv[index + 1]) usage();
        cliCandidates.push(argv[index + 1] as string);
        index += 1;
        break;
      case "--input":
        if (!argv[index + 1]) usage();
        inputPath = argv[index + 1] as string;
        index += 1;
        break;
      case "--limit":
        limit = parsePositiveInt(argv[index + 1], "--limit");
        index += 1;
        break;
      case "--concurrency":
        concurrency = parsePositiveInt(argv[index + 1], "--concurrency") ?? 1;
        index += 1;
        break;
      case "--delay-ms":
        delayMs = parsePositiveInt(argv[index + 1], "--delay-ms") ?? DEFAULT_DELAY_MS;
        index += 1;
        break;
      case "--help":
      case "-h":
        usage();
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (concurrency > MAX_CONCURRENCY) {
    throw new Error(`--concurrency must be ${MAX_CONCURRENCY} or lower`);
  }

  const candidates = readCandidates(inputPath, cliCandidates);
  return {
    candidates: limit ? candidates.slice(0, limit) : candidates,
    limit: limit ?? null,
    concurrency,
    delayMs,
  };
}

class RateLimitedFetcher {
  private nextRequestAt = 0;
  private gate: Promise<void> = Promise.resolve();

  constructor(private readonly delayMs: number) {}

  async postSearch(params: URLSearchParams) {
    await this.waitForTurn();
    const response = await fetch(SEARCH_URL, {
      method: "POST",
      body: params,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "dnd3.5-spellbook-data-tools/imarvintpa-probe",
      },
    });

    if (!response.ok) {
      throw new Error(`IMarvinTPA request failed: ${response.status}`);
    }

    return response.text();
  }

  private async waitForTurn() {
    let release = () => {};
    const previous = this.gate;
    this.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    const waitMs = this.nextRequestAt - Date.now();
    if (waitMs > 0) await sleep(waitMs);
    this.nextRequestAt = Date.now() + this.delayMs;
    release();
  }
}

function buildSearchParams(candidate: ProbeCandidate, small: "2" | "5") {
  const params = new URLSearchParams({
    Name: candidate.queryName ?? candidate.name,
    Small: small,
    Submit: "Search",
  });
  if (candidate.source) params.append("Sources", candidate.source);
  return params;
}

function parseSmall5(html: string) {
  const $ = cheerio.load(html);
  const results: SearchLineResult[] = [];

  $("tr").each((_, tr) => {
    const cells = $(tr)
      .children("th,td")
      .map((__, cell) => textOf($, cell))
      .get()
      .filter(Boolean);

    if (cells.length !== 9 || cells[0] === "Name") return;
    if (/^Example of /.test(cells[0] ?? "")) return;

    const spellHref = $(tr)
      .find("a")
      .toArray()
      .map((link) => $(link).attr("href"))
      .find((href) => href?.includes("spells.php"));

    results.push({
      id: hrefSpellId(spellHref),
      name: cells[0] ?? "",
      schoolCode: cells[1] ?? "",
      saveCode: cells[2] ?? "",
      resistanceCode: cells[3] ?? "",
      durationCode: cells[4] ?? "",
      castingTimeCode: cells[5] ?? "",
      rangeCode: cells[6] ?? "",
      rechargeCode: cells[7] ?? "",
      shortDescription: cells[8] ?? "",
    });
  });

  return results;
}

function parseSmall2(html: string) {
  const $ = cheerio.load(html);
  const rows = $("tr").toArray();
  const results: DetailResult[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) continue;
    const spellLink = $(row)
      .find("a")
      .toArray()
      .find((link) => $(link).attr("href")?.includes("spells.php"));
    if (!spellLink) continue;

    const name = textOf($, row);
    const id = hrefSpellId($(spellLink).attr("href"));
    const sourceRow = rows[index + 1];
    const levelRow = rows[index + 2];
    const descriptionRow = rows[index + 4];
    const levelCells = rowCells($, levelRow);
    const descriptionCells = rowCells($, descriptionRow);

    const sourceLink = sourceRow
      ? $(sourceRow)
          .find("a")
          .toArray()
          .find((link) => $(link).attr("href")?.includes("Index_Source.php"))
      : undefined;

    results.push({
      id,
      name,
      sourceLabel: sourceLink ? textOf($, sourceLink) : null,
      levels: (levelCells.length === 3 ? levelCells[1] : levelCells[0]) ?? null,
      displayDescription: descriptionCells[0] ?? null,
    });
  }

  return results;
}

function chooseExact<T extends { name: string }>(rows: T[], exactName: string) {
  const target = normalizeName(exactName);
  return rows.filter((row) => normalizeName(row.name) === target);
}

async function probeCandidate(
  candidate: ProbeCandidate,
  fetcher: RateLimitedFetcher,
): Promise<CandidateProbeResult> {
  const exactName = candidate.exactName ?? candidate.name;
  const warnings: string[] = [];

  const small5Html = await fetcher.postSearch(buildSearchParams(candidate, "5"));
  const lineRows = parseSmall5(small5Html);
  const exactRows = chooseExact(lineRows, exactName);

  let matched: SearchLineResult | null = null;
  let sourceDetail: DetailResult | null = null;
  let status: CandidateProbeResult["status"] = "missing";

  if (exactRows.length === 1) {
    matched = exactRows[0] ?? null;
    status = "matched";
  } else if (exactRows.length > 1) {
    matched = exactRows[0] ?? null;
    status = "ambiguous";
    warnings.push(`Found ${exactRows.length} exact rows for ${exactName}`);
  }

  if (matched) {
    const small2Html = await fetcher.postSearch(buildSearchParams(candidate, "2"));
    const details = chooseExact(parseSmall2(small2Html), matched.name);
    if (details.length === 1) {
      sourceDetail = details[0] ?? null;
    } else if (details.length > 1) {
      sourceDetail = details[0] ?? null;
      warnings.push(`Found ${details.length} source-detail rows for ${matched.name}`);
    } else {
      warnings.push(`No source-detail row found for ${matched.name}`);
    }
  }

  if (candidate.note) warnings.push(candidate.note);

  return {
    candidate,
    query: {
      name: candidate.queryName ?? candidate.name,
      exactName,
      source: candidate.source ?? null,
    },
    status,
    matched,
    sourceDetail,
    resultCount: lineRows.length,
    nearbyNames: lineRows.map((row) => row.name).slice(0, 20),
    warnings,
  };
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function runWorker() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index] as T);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker),
  );
  return results;
}

function writeReport(report: ProbeReport) {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  const reportPath = path.join(
    REPORT_ROOT,
    `${timestamp()}-imarvintpa-probe.json`,
  );
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

async function probe(argv: string[]) {
  const options = parseArgs(argv);
  const fetcher = new RateLimitedFetcher(options.delayMs);

  const results = await mapConcurrent(
    options.candidates,
    options.concurrency,
    (candidate) => probeCandidate(candidate, fetcher),
  );

  const report: ProbeReport = {
    generatedAt: new Date().toISOString(),
    source: {
      name: "IMarvinTPA",
      searchUrl: SEARCH_URL,
      mode: "Small=5 for short descriptions; Small=2 for source hints",
    },
    options: {
      concurrency: options.concurrency,
      delayMs: options.delayMs,
      limit: options.limit,
    },
    summary: {
      candidates: results.length,
      matched: results.filter((result) => result.status === "matched").length,
      missing: results.filter((result) => result.status === "missing").length,
      ambiguous: results.filter((result) => result.status === "ambiguous").length,
    },
    results,
  };

  const reportPath = writeReport(report);
  console.log(`IMarvinTPA probe OK: ${reportPath}`);
  console.log(JSON.stringify(report.summary, null, 2));

  for (const result of report.results) {
    const label = result.matched
      ? `${result.matched.name}: ${result.matched.shortDescription}`
      : `${result.candidate.name}: ${result.status}`;
    console.log(`- ${label}`);
  }
}

async function main() {
  const [mode, ...argv] = process.argv.slice(2);
  if (!mode) usage();

  switch (mode as Mode) {
    case "probe":
      await probe(argv);
      break;
    default:
      usage();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
