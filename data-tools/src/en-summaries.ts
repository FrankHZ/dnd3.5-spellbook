import * as cheerio from "cheerio";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { chooseExact, normalizeName } from "./en-summary-matching";
import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "./env";

type Mode = "candidates" | "probe" | "sources";

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
    offset: number;
    outputName: string | null;
    retries: number;
  };
  summary: {
    candidates: number;
    matched: number;
    missing: number;
    ambiguous: number;
  };
  results: CandidateProbeResult[];
};

type SourceIndexSource = {
  token: string;
  name: string;
  abbr: string;
  expectedCount: number | null;
  status: string;
  linesHref: string;
};

type SourceIndexSpell = SearchLineResult & {
  sourceToken: string;
  sourceName: string;
  sourceAbbr: string;
  sourceStatus: string;
};

type SourceIndexReport = {
  generatedAt: string;
  source: {
    name: "IMarvinTPA";
    sourceIndexUrl: string;
    mode: "Index_Sources.php plus per-source Small=5 lines";
  };
  options: {
    delayMs: number;
    retries: number;
    sourceOffset: number;
    sourceLimit: number | null;
    outputName: string | null;
    candidateInput: string | null;
  };
  summary: {
    sources: number;
    expectedRows: number;
    rows: number;
    uniqueImarvinIds: number;
    uniqueImarvinNames: number;
    candidates: number;
    matchedCandidates: number;
    missingCandidates: number;
    ambiguousCandidates: number;
  };
  sources: SourceIndexSource[];
  rows: SourceIndexSpell[];
  coverage: {
    matched: Array<{
      candidate: ProbeCandidate;
      matches: SourceIndexSpell[];
      warnings: string[];
    }>;
    missing: ProbeCandidate[];
    ambiguous: Array<{
      candidate: ProbeCandidate;
      matches: SourceIndexSpell[];
      warnings: string[];
    }>;
  };
};

type RulebookSourceCategory = {
  category: string;
  categorySource: "db" | "fallback";
  rulebookAbbr?: string;
  rulebookName?: string;
  editionSlug?: string;
};

const SEARCH_URL = "https://imarvintpa.com/dndlive/SearchList.php";
const SOURCE_INDEX_URL = "https://imarvintpa.com/dndlive/Index_Sources.php";
const DNDLIVE_BASE_URL = "https://imarvintpa.com/dndlive/";
const REPORT_ROOT = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "en-summaries",
);
const SOURCE_INDEX_DATA_ROOT = path.join(
  localDataDir(),
  "imarvin",
  "short-desc",
);
const MAX_CONCURRENCY = 3;
const DEFAULT_DELAY_MS = 750;
const DEFAULT_RETRIES = 2;
const DEFAULT_IMARVIN_CANDIDATES = "imarvin/short-desc/candidates.json";

const IMARVIN_SOURCE_RULEBOOK_ABBR: Record<string, string> = {
  Draconomicon: "Dr",
  SRD: "PH",
  "Magic of Faerun": "Mag",
  "Tome and Blood": "TB",
  DotF: "DF",
  MotW: "MW",
  FR: "FRCS",
  "Savage Species": "SS",
  "Song and Silence": "SaS",
  FnP: "FP",
  Ghostwalk: "Gh",
  "Complete Arcane": "CAr",
  SPC: "Sc_",
  Miniatures: "MH",
  PGtF: "PG",
  HoH: "HH",
  Libris: "LM",
  "Complete Adventurer": "CAd",
  Underdark: "Und",
  RoF: "Rac",
  "Complete Divine": "CD",
  OA: "OA",
  CR: "CR",
  MotP: "MP",
  "Planar Handbook": "PlH",
  "Unapproachable East": "Una",
  LD: "LD",
  CV: "CV",
  SK: "SK",
  FE: "FE",
  Stormwrack: "Sto",
  MMII: "MM2",
  RoD: "RD",
  Lords: "LoM",
  Frostburn: "Fr",
  CW: "CW",
  "Races of Stone": "RS",
  RE: "RE",
  RotW: "RW",
  SBG: "SB",
  HoB: "HB",
  CS: "CS",
  LostEmpiresOfFaerun: "LE",
  MOI: "MoI",
  PHBII: "PH2",
  MoE: "MoE",
  PGtE: "PE",
  RotDrg: "RDr",
  EH: "EH",
  Sh: "Sh",
  ShS: "ShS",
  CC: "CC",
  Ebberon: "ECS",
  "Book of Vile Darkness": "BV",
  Sandstorm: "Sa",
  "Book of Exalted Deeds": "BE",
};

const FALLBACK_SOURCE_CATEGORY_BY_TOKEN: Record<string, string> = {
  ATB: "third-party",
  Drew: "third-party",
  BoEM: "third-party",
  Cypren: "third-party",
  Necromancy: "third-party",
  SPELLSandSPELLCRAFT: "third-party",
  "seankreynolds.com": "third-party",
  DA5: "magazine",
};

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
  npm run -w data-tools en:summaries:candidates
  npm run -w data-tools en:summaries:probe -- --candidate "Spider Poison" --candidate "Blood Wind"
  npm run -w data-tools en:summaries:probe -- --input ${DEFAULT_IMARVIN_CANDIDATES} --limit 20
  npm run -w data-tools en:summaries:sources -- --input ${DEFAULT_IMARVIN_CANDIDATES} --delay-ms 1500

Options:
  candidates mode:
  --out <path>             Candidate JSON path. Relative paths resolve under data/.
  --include-tob            Include Tome of Battle maneuvers. Default excludes them.

  probe mode:
  --candidate <name>       Add a simple exact-name candidate.
  --input <path>           JSON candidate file. Relative paths resolve under data/.
  --offset <n>             Skip the first n candidates before applying --limit.
  --limit <n>              Probe at most n candidates.
  --output-name <name>     Stable report filename stem for resumable chunks.
  --concurrency <n>        Parallel candidate probes. Default 1, max ${MAX_CONCURRENCY}.
  --delay-ms <n>           Minimum spacing between HTTP requests. Default ${DEFAULT_DELAY_MS}.
  --retries <n>            Retry failed HTTP requests. Default ${DEFAULT_RETRIES}.

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

function parseNonNegativeInt(raw: string | undefined, label: string) {
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer, got ${raw}`);
  }
  return parsed;
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

function resolveLocalDataPath(rawPath: string) {
  if (path.isAbsolute(rawPath)) return rawPath;
  return path.resolve(localDataDir(), rawPath);
}

function rulesDbPath() {
  loadServerEnv();
  const raw = process.env.RULES_DATABASE_URL;
  if (!raw) throw new Error("RULES_DATABASE_URL is not set");
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported, got ${raw}`);
  }
  return resolveServerRelativePath(raw.slice("file:".length));
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
  let offset = 0;
  let outputName: string | undefined;
  let concurrency = 1;
  let delayMs = DEFAULT_DELAY_MS;
  let retries = DEFAULT_RETRIES;

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
      case "--offset":
        offset = parseNonNegativeInt(argv[index + 1], "--offset") ?? 0;
        index += 1;
        break;
      case "--limit":
        limit = parsePositiveInt(argv[index + 1], "--limit");
        index += 1;
        break;
      case "--output-name":
        if (!argv[index + 1]) usage();
        outputName = argv[index + 1] as string;
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
      case "--retries":
        retries = parseNonNegativeInt(argv[index + 1], "--retries") ?? DEFAULT_RETRIES;
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
  const slicedCandidates = candidates.slice(
    offset,
    limit ? offset + limit : undefined,
  );
  return {
    candidates: slicedCandidates,
    limit: limit ?? null,
    offset,
    outputName: outputName ?? null,
    concurrency,
    delayMs,
    retries,
  };
}

function parseSourceArgs(argv: string[]) {
  let inputPath: string | undefined = DEFAULT_IMARVIN_CANDIDATES;
  let sourceLimit: number | undefined;
  let sourceOffset = 0;
  let outputName: string | undefined = "source-index";
  let delayMs = DEFAULT_DELAY_MS;
  let retries = DEFAULT_RETRIES;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--input":
        if (!argv[index + 1]) usage();
        inputPath = argv[index + 1] as string;
        index += 1;
        break;
      case "--no-input":
        inputPath = undefined;
        break;
      case "--source-offset":
        sourceOffset = parseNonNegativeInt(argv[index + 1], "--source-offset") ?? 0;
        index += 1;
        break;
      case "--source-limit":
        sourceLimit = parsePositiveInt(argv[index + 1], "--source-limit");
        index += 1;
        break;
      case "--output-name":
        if (!argv[index + 1]) usage();
        outputName = argv[index + 1] as string;
        index += 1;
        break;
      case "--delay-ms":
        delayMs = parsePositiveInt(argv[index + 1], "--delay-ms") ?? DEFAULT_DELAY_MS;
        index += 1;
        break;
      case "--retries":
        retries = parseNonNegativeInt(argv[index + 1], "--retries") ?? DEFAULT_RETRIES;
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

  return {
    inputPath,
    sourceLimit: sourceLimit ?? null,
    sourceOffset,
    outputName: outputName ?? null,
    delayMs,
    retries,
  };
}

function parseCandidateArgs(argv: string[]) {
  let outPath = DEFAULT_IMARVIN_CANDIDATES;
  let includeTob = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--out":
        if (!argv[index + 1]) usage();
        outPath = argv[index + 1] as string;
        index += 1;
        break;
      case "--include-tob":
        includeTob = true;
        break;
      case "--help":
      case "-h":
        usage();
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { outPath, includeTob };
}

function writeCandidates(argv: string[]) {
  const options = parseCandidateArgs(argv);
  const dbPath = rulesDbPath();
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  const where = options.includeTob ? "1 = 1" : "tobRows = 0";
  const rows = db
    .prepare(
      `
        WITH grouped AS (
          SELECT
            s.name AS spellName,
            COUNT(*) AS rows,
            GROUP_CONCAT(DISTINCT rb.abbr) AS rulebooks,
            SUM(CASE WHEN rb.abbr = 'ToB' THEN 1 ELSE 0 END) AS tobRows
          FROM dnd_spell s
          LEFT JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
          WHERE s.name IS NOT NULL AND TRIM(s.name) <> ''
          GROUP BY LOWER(s.name)
        )
        SELECT *
        FROM grouped
        WHERE ${where}
        ORDER BY LOWER(spellName)
      `,
    )
    .all() as Array<{
    spellName: string;
    rows: number;
    rulebooks: string | null;
    tobRows: number;
  }>;

  const excluded = options.includeTob
    ? []
    : (db
        .prepare(
          `
            WITH grouped AS (
              SELECT
                s.name AS spellName,
                COUNT(*) AS rows,
                GROUP_CONCAT(DISTINCT rb.abbr) AS rulebooks,
                SUM(CASE WHEN rb.abbr = 'ToB' THEN 1 ELSE 0 END) AS tobRows
              FROM dnd_spell s
              LEFT JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
              WHERE s.name IS NOT NULL AND TRIM(s.name) <> ''
              GROUP BY LOWER(s.name)
            )
            SELECT *
            FROM grouped
            WHERE tobRows > 0
            ORDER BY LOWER(spellName)
          `,
        )
        .all() as Array<{ rows: number }>);
  db.close();

  const candidates = rows.map((row) => ({ name: row.spellName }));
  const resolvedOut = resolveLocalDataPath(options.outPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
  fs.writeFileSync(resolvedOut, `${JSON.stringify(candidates, null, 2)}\n`, "utf8");

  const meta = {
    generatedAt: new Date().toISOString(),
    dbPath,
    includeTob: options.includeTob,
    uniqueNames: candidates.length,
    sourceRows: rows.reduce((total, row) => total + Number(row.rows), 0),
    excludedToBUniqueNames: excluded.length,
    excludedToBRows: excluded.reduce(
      (total, row) => total + Number(row.rows),
      0,
    ),
  };
  const metaPath = resolvedOut.replace(/\.json$/i, ".meta.json");
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");

  console.log(`IMarvinTPA candidates OK: ${resolvedOut}`);
  console.log(JSON.stringify(meta, null, 2));
}

class RateLimitedFetcher {
  private nextRequestAt = 0;
  private gate: Promise<void> = Promise.resolve();

  constructor(
    private readonly delayMs: number,
    private readonly retries: number,
  ) {}

  async postSearch(params: URLSearchParams) {
    return this.fetchText(SEARCH_URL, {
      method: "POST",
      body: params,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "dnd3.5-spellbook-data-tools/imarvintpa-probe",
      },
    });
  }

  async getUrl(url: string) {
    return this.fetchText(url, {
      method: "GET",
      headers: {
        "user-agent": "dnd3.5-spellbook-data-tools/imarvintpa-source-index",
      },
    });
  }

  private async fetchText(url: string, init: RequestInit) {
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      await this.waitForTurn();
      try {
        const response = await fetch(url, init);

        if (!response.ok) {
          throw new Error(`IMarvinTPA request failed: ${response.status} ${url}`);
        }

        return response.text();
      } catch (error) {
        lastError = error;
        if (attempt >= this.retries) break;
        await sleep(this.delayMs * (attempt + 2));
      }
    }

    throw lastError;
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

function sourceToken(href: string | undefined) {
  if (!href) return null;
  const url = new URL(href, DNDLIVE_BASE_URL);
  return url.searchParams.get("Sources");
}

function absoluteDndLiveUrl(href: string) {
  return new URL(href, DNDLIVE_BASE_URL).toString();
}

function parseSourceIndex(html: string) {
  const $ = cheerio.load(html);
  const sources: SourceIndexSource[] = [];

  $("tbody tr").each((_, tr) => {
    const cells = $(tr).children("th,td").toArray();
    if (cells.length < 8) return;

    const sourceLink = $(cells[0]).find("a").first();
    const token = sourceToken(sourceLink.attr("href"));
    const lineLink = $(tr)
      .find("a")
      .toArray()
      .map((link) => ({
        text: textOf($, link),
        href: $(link).attr("href"),
      }))
      .find((link) => link.text === "Lines" && link.href);

    if (!token || !lineLink?.href) return;

    const expectedCountRaw = textOf($, cells[2]);
    const expectedCount = Number(expectedCountRaw);
    sources.push({
      token,
      name: textOf($, sourceLink),
      abbr: textOf($, cells[1]),
      expectedCount: Number.isInteger(expectedCount) ? expectedCount : null,
      status: textOf($, cells[3]),
      linesHref: lineLink.href,
    });
  });

  return sources;
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
    if (matched && normalizeName(matched.name) !== normalizeName(exactName)) {
      warnings.push(`Matched alias ${matched.name} for ${exactName}`);
    }
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

function safeReportName(outputName: string | null) {
  if (!outputName) return `${timestamp()}-imarvintpa-probe`;
  return outputName.replace(/[^A-Za-z0-9._-]/g, "-");
}

function slugifySource(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function rulebookLookupKeys(source: SourceIndexSource) {
  return [source.token, source.abbr, source.name].flatMap((value) => [
    normalizeName(value),
    slugifySource(value),
  ]);
}

function sourceAliasAbbr(source: SourceIndexSource) {
  for (const value of [source.token, source.abbr, source.name]) {
    const abbr = IMARVIN_SOURCE_RULEBOOK_ABBR[value];
    if (abbr) return abbr;
  }
  return undefined;
}

function loadRulebookSourceCategories(): Map<string, RulebookSourceCategory> {
  const db = new Database(rulesDbPath(), { readonly: true, fileMustExist: true });
  try {
    const rows = db
      .prepare(
        `
          SELECT
            rb.name AS rulebookName,
            rb.abbr AS rulebookAbbr,
            rb.slug AS rulebookSlug,
            ed.slug AS editionSlug
          FROM dnd_rulebook rb
          JOIN dnd_dndedition ed ON ed.id = rb.dnd_edition_id
        `,
      )
      .all() as Array<{
      rulebookName: string;
      rulebookAbbr: string;
      rulebookSlug: string;
      editionSlug: string;
    }>;

    const categories = new Map<string, RulebookSourceCategory>();
    for (const row of rows) {
      const category: RulebookSourceCategory = {
        category: row.editionSlug,
        categorySource: "db",
        rulebookAbbr: row.rulebookAbbr,
        rulebookName: row.rulebookName,
        editionSlug: row.editionSlug,
      };
      for (const key of [
        normalizeName(row.rulebookAbbr),
        normalizeName(row.rulebookName),
        slugifySource(row.rulebookName),
        normalizeName(row.rulebookSlug),
        slugifySource(row.rulebookSlug),
      ]) {
        categories.set(key, category);
      }
    }
    return categories;
  } finally {
    db.close();
  }
}

function sourceCategory(
  source: SourceIndexSource,
  categories: Map<string, RulebookSourceCategory>,
): RulebookSourceCategory {
  const aliasAbbr = sourceAliasAbbr(source);
  if (aliasAbbr) {
    const category = categories.get(normalizeName(aliasAbbr));
    if (category) return category;
  }

  for (const key of rulebookLookupKeys(source)) {
    const category = categories.get(key);
    if (category) return category;
  }

  if (/^Dragon Magazine #/i.test(source.name)) {
    return { category: "magazine", categorySource: "fallback" };
  }
  if (/^Dragon Annual #/i.test(source.name)) {
    return { category: "magazine", categorySource: "fallback" };
  }
  return {
    category: FALLBACK_SOURCE_CATEGORY_BY_TOKEN[source.token] ?? "unmatched-source",
    categorySource: "fallback",
  };
}

function safeSourceFileName(source: SourceIndexSource) {
  const slug =
    slugifySource(source.name) ||
    slugifySource(source.token) ||
    slugifySource(source.abbr) ||
    "source";
  return `${slug}.json`;
}

function assertInside(root: string, target: string) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${root}: ${target}`);
  }
}

function writeJsonReport(fileStem: string | null, report: unknown) {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  const reportPath = path.join(REPORT_ROOT, `${safeReportName(fileStem)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

function writeReport(report: ProbeReport) {
  return writeJsonReport(report.options.outputName, report);
}

function writeSourceIndexData(
  report: SourceIndexReport,
  categories: Map<string, RulebookSourceCategory>,
) {
  const folderName = safeReportName(report.options.outputName ?? "source-index");
  const dataDir = path.join(SOURCE_INDEX_DATA_ROOT, folderName);
  assertInside(SOURCE_INDEX_DATA_ROOT, dataDir);
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dataDir, "books"), { recursive: true });

  const sourceFiles = report.sources.map((source) => {
    const rows = report.rows.filter((row) => row.sourceToken === source.token);
    const classification = sourceCategory(source, categories);
    const file = path.join(
      "books",
      classification.category,
      safeSourceFileName(source),
    );
    fs.mkdirSync(path.dirname(path.join(dataDir, file)), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, file),
      `${JSON.stringify({ source, rows }, null, 2)}\n`,
      "utf8",
    );
    return { ...source, ...classification, file, rows: rows.length };
  });

  const manifest = {
    generatedAt: report.generatedAt,
    source: report.source,
    options: report.options,
    summary: report.summary,
    sources: sourceFiles,
  };
  fs.writeFileSync(
    path.join(dataDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  return { dataDir, manifest };
}

async function probe(argv: string[]) {
  const options = parseArgs(argv);
  const fetcher = new RateLimitedFetcher(options.delayMs, options.retries);

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
      offset: options.offset,
      outputName: options.outputName,
      retries: options.retries,
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

function coverageForCandidates(
  candidates: ProbeCandidate[],
  rows: SourceIndexSpell[],
) {
  const matched: SourceIndexReport["coverage"]["matched"] = [];
  const missing: ProbeCandidate[] = [];
  const ambiguous: SourceIndexReport["coverage"]["ambiguous"] = [];

  for (const candidate of candidates) {
    const exactName = candidate.exactName ?? candidate.name;
    const matches = chooseExact(rows, exactName);
    if (matches.length === 0) {
      missing.push(candidate);
      continue;
    }

    const warnings: string[] = [];
    const aliasMatches = matches.filter(
      (match) => normalizeName(match.name) !== normalizeName(exactName),
    );
    if (aliasMatches.length > 0) {
      warnings.push(
        `Matched alias names: ${[
          ...new Set(aliasMatches.map((match) => match.name)),
        ].join(", ")}`,
      );
    }

    const uniqueIds = new Set(
      matches.map((match) => match.id).filter((id): id is number => id !== null),
    );
    if (uniqueIds.size > 1) {
      ambiguous.push({ candidate, matches, warnings });
    } else {
      matched.push({ candidate, matches, warnings });
    }
  }

  return { matched, missing, ambiguous };
}

async function sources(argv: string[]) {
  const options = parseSourceArgs(argv);
  const categories = loadRulebookSourceCategories();
  const fetcher = new RateLimitedFetcher(options.delayMs, options.retries);
  const sourceIndexHtml = await fetcher.getUrl(SOURCE_INDEX_URL);
  const allSources = parseSourceIndex(sourceIndexHtml);
  const selectedSources = allSources.slice(
    options.sourceOffset,
    options.sourceLimit
      ? options.sourceOffset + options.sourceLimit
      : undefined,
  );

  const rows: SourceIndexSpell[] = [];
  for (const source of selectedSources) {
    const html = await fetcher.getUrl(absoluteDndLiveUrl(source.linesHref));
    const sourceRows = parseSmall5(html);
    rows.push(
      ...sourceRows.map((row) => ({
        ...row,
        sourceToken: source.token,
        sourceName: source.name,
        sourceAbbr: source.abbr,
        sourceStatus: source.status,
      })),
    );
  }

  const candidates = options.inputPath
    ? readCandidates(options.inputPath, [])
    : [];
  const coverage = coverageForCandidates(candidates, rows);
  const expectedRows = selectedSources.reduce(
    (total, source) => total + (source.expectedCount ?? 0),
    0,
  );

  const report: SourceIndexReport = {
    generatedAt: new Date().toISOString(),
    source: {
      name: "IMarvinTPA",
      sourceIndexUrl: SOURCE_INDEX_URL,
      mode: "Index_Sources.php plus per-source Small=5 lines",
    },
    options: {
      delayMs: options.delayMs,
      retries: options.retries,
      sourceOffset: options.sourceOffset,
      sourceLimit: options.sourceLimit,
      outputName: options.outputName,
      candidateInput: options.inputPath ?? null,
    },
    summary: {
      sources: selectedSources.length,
      expectedRows,
      rows: rows.length,
      uniqueImarvinIds: new Set(
        rows.map((row) => row.id).filter((id): id is number => id !== null),
      ).size,
      uniqueImarvinNames: new Set(rows.map((row) => normalizeName(row.name))).size,
      candidates: candidates.length,
      matchedCandidates: coverage.matched.length,
      missingCandidates: coverage.missing.length,
      ambiguousCandidates: coverage.ambiguous.length,
    },
    sources: selectedSources,
    rows,
    coverage,
  };

  const { dataDir, manifest } = writeSourceIndexData(report, categories);
  const reportPath = writeJsonReport(`${options.outputName}-run`, {
    ...manifest,
    coverage: report.coverage,
    dataDir,
  });
  console.log(`IMarvinTPA source index data OK: ${dataDir}`);
  console.log(`IMarvinTPA source index run report: ${reportPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

async function main() {
  const [mode, ...argv] = process.argv.slice(2);
  if (!mode) usage();

  switch (mode as Mode) {
    case "candidates":
      writeCandidates(argv);
      break;
    case "probe":
      await probe(argv);
      break;
    case "sources":
      await sources(argv);
      break;
    default:
      usage();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
