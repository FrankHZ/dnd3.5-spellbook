import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { chooseExact, normalizeName } from "./en-summary-matching";
import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";

type StrictDecision = {
  queue?: "en-strict35-missing";
  key?: string;
  name?: string;
  resolvedName?: string;
  decision?: "add_candidate" | "rules_db_gap" | "source_mismatch" | string;
  recommendedAction?: string;
  sources?: string[];
  descriptionSamples?: string[];
  evidence?: string[];
  notes?: string;
  confidence?: string;
};

type SourceManifest = {
  sources?: SourceEntry[];
};

type SourceEntry = {
  token?: string;
  name?: string;
  abbr?: string;
  status?: string;
  file?: string;
  category?: string;
  categorySource?: string;
  rulebookAbbr?: string;
  rulebookName?: string;
  editionSlug?: string;
};

type SourceBook = {
  rows?: SourceRow[];
};

type SourceRow = {
  id?: number | null;
  name?: string;
  shortDescription?: string;
  sourceToken?: string;
  sourceName?: string;
  sourceAbbr?: string;
  sourceStatus?: string;
};

type SpellRow = {
  id: number;
  name: string;
  rulebookId: number;
  rulebookAbbr: string;
  rulebookName: string;
  editionSlug: string;
};

type NormalizedSummaryRow = {
  schemaVersion: 1;
  stableKey: string;
  spellId: number;
  rulebookId: number;
  rulebookAbbr: string;
  lang: "en";
  variant: "imarvin";
  summaryText: string;
  sourceKey: string;
  sourceName: string;
  sourceKind: string;
  reviewStatus: "accepted";
  provenance: Record<string, unknown>;
};

type ReadyLedgerRow = {
  schemaVersion: 1;
  queue: "en-strict35-ready";
  key: string;
  name: string;
  resolvedName?: string;
  sourceDecision: "add_candidate" | "rules_db_gap" | "source_mismatch";
  readyStatus: "pending_normalized" | "already_covered";
  stableKey: string;
  summaryText: string;
  source: {
    sourceToken: string | null;
    sourceName: string;
    sourceRulebookAbbr: string;
    sourceRulebookName: string | null;
    sourceEditionSlug: string | null;
    sourceStatus: string | null;
    imarvinId: number | null;
    imarvinName: string;
  };
  target: {
    spellId: number;
    spellName: string;
    rulebookId: number;
    rulebookAbbr: string;
    rulebookName: string;
    editionSlug: string;
  };
  recommendedAction?: string;
  notes?: string;
  confidence?: string;
};

const DEFAULT_DECISIONS = path.join(
  localDataDir(),
  "short-desc-review",
  "qa",
  "en-strict35-missing.decisions.jsonl",
);
const DEFAULT_SOURCE_INDEX = path.join(
  localDataDir(),
  "imarvin",
  "short-desc",
  "source-index",
);
const DEFAULT_NORMALIZED = path.join(
  localDataDir(),
  "short-desc-normalized",
  "summaries.generated.jsonl",
);
const DEFAULT_REVIEW_OUT = path.join(
  localDataDir(),
  "short-desc-review",
  "qa",
  "en-strict35-ready.generated.jsonl",
);
const DEFAULT_PENDING_OUT = path.join(
  localDataDir(),
  "short-desc-normalized",
  "pending",
  "en-strict35-ready.generated.jsonl",
);
const DEFAULT_REPORT = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "short-desc-qa",
  "en-strict35-ready.summary.json",
);
const DEFAULT_SCOPE = [
  "core-35",
  "supplementals-35",
  "eberron-35",
  "forgotten-realms-35",
];

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools summaries:strict35-ready

Options:
  --decisions <path>      Reviewed en-strict35 decision JSONL.
  --sourceIndexDir <path> IMarvin source-index directory.
  --normalized <path>     Current normalized summary JSONL.
  --reviewOut <path>      Ready ledger JSONL output.
  --pendingOut <path>     Pending normalized-row JSONL output.
  --report <path>         Summary report path.
  --scope <slugs|all>     Comma-separated source edition slugs. Default: 3.5 scopes.
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") usage();
    if (!arg?.startsWith("--")) continue;
    const next = argv[index + 1];
    args.set(arg, next && !next.startsWith("--") ? next : "true");
    if (next && !next.startsWith("--")) index += 1;
  }
  return {
    decisions: resolvePath(args.get("--decisions") ?? DEFAULT_DECISIONS),
    sourceIndexDir: resolvePath(args.get("--sourceIndexDir") ?? DEFAULT_SOURCE_INDEX),
    normalized: resolvePath(args.get("--normalized") ?? DEFAULT_NORMALIZED),
    reviewOut: resolvePath(args.get("--reviewOut") ?? DEFAULT_REVIEW_OUT),
    pendingOut: resolvePath(args.get("--pendingOut") ?? DEFAULT_PENDING_OUT),
    report: resolvePath(args.get("--report") ?? DEFAULT_REPORT),
    scope:
      args.get("--scope") === "all"
        ? null
        : new Set(
            (args.get("--scope") ?? DEFAULT_SCOPE.join(","))
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          ),
  };
}

function resolvePath(rawPath: string) {
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, rows: unknown[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    rows.map((row) => JSON.stringify(row)).join("\n") +
      (rows.length > 0 ? "\n" : ""),
    "utf8",
  );
}

function loadSpells(db: Database.Database) {
  return db
    .prepare(
      `
        SELECT s.id, s.name, s.rulebook_id AS rulebookId,
               rb.abbr AS rulebookAbbr, rb.name AS rulebookName,
               edition.slug AS editionSlug
        FROM dnd_spell s
        JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
        JOIN dnd_dndedition edition ON edition.id = rb.dnd_edition_id
      `,
    )
    .all() as SpellRow[];
}

function loadSourceRows(sourceIndexDir: string) {
  const manifest = readJson<SourceManifest>(path.join(sourceIndexDir, "manifest.json"));
  return (manifest.sources ?? []).flatMap((source) => {
    if (!source.file) return [];
    const filePath = path.join(sourceIndexDir, source.file);
    if (!fs.existsSync(filePath)) return [];
    const book = readJson<SourceBook>(filePath);
    return (book.rows ?? [])
      .filter((row) => row.name?.trim() && row.shortDescription?.trim())
      .map((row) => ({ source, row }));
  });
}

function sourceKey(source: SourceEntry, row: SourceRow) {
  const token = source.token ?? row.sourceToken ?? "unknown";
  const itemKey = row.id ?? normalizeName(row.name ?? "");
  return `imarvin:${token}:${itemKey}`;
}

function rowFromMatch(params: {
  decision: StrictDecision;
  source: SourceEntry;
  row: SourceRow;
  spell: SpellRow;
}): NormalizedSummaryRow {
  const { decision, source, row, spell } = params;
  const sourceToken = source.token ?? row.sourceToken ?? "unknown";
  const sourceName = source.name ?? row.sourceName ?? sourceToken;
  return {
    schemaVersion: 1,
    stableKey: `${spell.id}:en:imarvin`,
    spellId: spell.id,
    rulebookId: spell.rulebookId,
    rulebookAbbr: spell.rulebookAbbr,
    lang: "en",
    variant: "imarvin",
    summaryText: row.shortDescription!.trim(),
    sourceKey: `strict35-ready:${sourceKey(source, row)}`,
    sourceName,
    sourceKind: "imarvin-strict35-ready",
    reviewStatus: "accepted",
    provenance: {
      reviewQueue: decision.queue ?? "en-strict35-missing",
      reviewKey: decision.key,
      reviewDecision: decision.decision,
      reviewedName: decision.name,
      resolvedName: decision.resolvedName ?? null,
      recommendedAction: decision.recommendedAction ?? null,
      confidence: decision.confidence ?? null,
      imarvinId: row.id ?? null,
      imarvinName: row.name,
      sourceToken,
      sourceAbbr: source.abbr ?? row.sourceAbbr,
      sourceStatus: source.status ?? row.sourceStatus,
      category: source.category,
      categorySource: source.categorySource,
    },
  };
}

function ledgerFromMatch(params: {
  decision: StrictDecision;
  source: SourceEntry;
  row: SourceRow;
  spell: SpellRow;
  readyStatus: ReadyLedgerRow["readyStatus"];
}): ReadyLedgerRow {
  const { decision, source, row, spell, readyStatus } = params;
  const sourceToken = source.token ?? row.sourceToken ?? null;
  return {
    schemaVersion: 1,
    queue: "en-strict35-ready",
    key: decision.key!,
    name: decision.name!,
    ...(decision.resolvedName ? { resolvedName: decision.resolvedName } : {}),
    sourceDecision: decision.decision as ReadyLedgerRow["sourceDecision"],
    readyStatus,
    stableKey: `${spell.id}:en:imarvin`,
    summaryText: row.shortDescription!.trim(),
    source: {
      sourceToken,
      sourceName: source.name ?? row.sourceName ?? sourceToken ?? "unknown",
      sourceRulebookAbbr: source.rulebookAbbr!,
      sourceRulebookName: source.rulebookName ?? null,
      sourceEditionSlug: source.editionSlug ?? null,
      sourceStatus: source.status ?? row.sourceStatus ?? null,
      imarvinId: row.id ?? null,
      imarvinName: row.name!,
    },
    target: {
      spellId: spell.id,
      spellName: spell.name,
      rulebookId: spell.rulebookId,
      rulebookAbbr: spell.rulebookAbbr,
      rulebookName: spell.rulebookName,
      editionSlug: spell.editionSlug,
    },
    ...(decision.recommendedAction
      ? { recommendedAction: decision.recommendedAction }
      : {}),
    ...(decision.notes ? { notes: decision.notes } : {}),
    ...(decision.confidence ? { confidence: decision.confidence } : {}),
  };
}

function decisionNames(decision: StrictDecision) {
  return [decision.resolvedName, decision.name].filter(
    (name): name is string => Boolean(name?.trim()),
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const decisions = readJsonl<StrictDecision>(options.decisions).filter(
    (decision) =>
      decision.key &&
      decision.name &&
      (decision.decision === "add_candidate" ||
        decision.decision === "rules_db_gap" ||
        decision.decision === "source_mismatch"),
  );
  const existingRows = readJsonl<NormalizedSummaryRow>(options.normalized);
  const existingStableKeys = new Set(existingRows.map((row) => row.stableKey));
  const db = new Database(rulesDbPath(), { readonly: true });
  try {
    const spellsByRulebook = new Map<string, SpellRow[]>();
    for (const spell of loadSpells(db)) {
      spellsByRulebook.set(spell.rulebookAbbr, [
        ...(spellsByRulebook.get(spell.rulebookAbbr) ?? []),
        spell,
      ]);
    }

    const sourceRows = loadSourceRows(options.sourceIndexDir);
    const ledgerRows: ReadyLedgerRow[] = [];
    const pendingRows: NormalizedSummaryRow[] = [];
    const seenLedger = new Set<string>();
    const seenPending = new Set<string>();
    const skipped: Record<string, number> = {};
    const bump = (key: string) => {
      skipped[key] = (skipped[key] ?? 0) + 1;
    };

    for (const decision of decisions) {
      const matchingSourceRows = sourceRows.filter(({ row }) =>
        decisionNames(decision).some(
          (name) => chooseExact([row as { name: string }], name).length > 0,
        ),
      );

      if (matchingSourceRows.length === 0) {
        bump("source_row_not_found");
        continue;
      }

      let emittedForDecision = 0;
      for (const { source, row } of matchingSourceRows) {
        const rulebookAbbr = source.rulebookAbbr;
        if (!rulebookAbbr) {
          bump("source_without_rulebook");
          continue;
        }
        if (
          options.scope &&
          (!source.editionSlug || !options.scope.has(source.editionSlug))
        ) {
          bump("source_out_of_scope");
          continue;
        }
        const spells = spellsByRulebook.get(rulebookAbbr);
        if (!spells) {
          bump("source_rulebook_not_in_db");
          continue;
        }

        const matches = decisionNames(decision)
          .flatMap((name) => chooseExact(spells, name))
          .filter(
            (spell, index, array) =>
              array.findIndex((candidate) => candidate.id === spell.id) === index,
          );
        if (matches.length === 0) {
          bump("target_spell_not_found");
          continue;
        }
        if (matches.length > 1) {
          bump("ambiguous_target_spell");
          continue;
        }

        const spell = matches[0]!;
        const stableKey = `${spell.id}:en:imarvin`;
        const readyStatus = existingStableKeys.has(stableKey)
          ? "already_covered"
          : "pending_normalized";
        const ledgerKey = `${decision.key}:${sourceKey(source, row)}:${spell.id}`;
        if (!seenLedger.has(ledgerKey)) {
          seenLedger.add(ledgerKey);
          ledgerRows.push(
            ledgerFromMatch({ decision, source, row, spell, readyStatus }),
          );
        }
        if (readyStatus === "pending_normalized" && !seenPending.has(stableKey)) {
          seenPending.add(stableKey);
          pendingRows.push(rowFromMatch({ decision, source, row, spell }));
        }
        emittedForDecision += 1;
      }
      if (emittedForDecision === 0) bump("decision_without_ready_row");
    }

    const sortLedger = (a: ReadyLedgerRow, b: ReadyLedgerRow) =>
      a.sourceDecision.localeCompare(b.sourceDecision) ||
      a.key.localeCompare(b.key) ||
      a.target.rulebookAbbr.localeCompare(b.target.rulebookAbbr) ||
      a.target.spellId - b.target.spellId;
    const sortNormalized = (a: NormalizedSummaryRow, b: NormalizedSummaryRow) =>
      a.rulebookAbbr.localeCompare(b.rulebookAbbr) ||
      a.spellId - b.spellId ||
      a.sourceKey.localeCompare(b.sourceKey);

    const sortedLedger = ledgerRows.sort(sortLedger);
    const sortedPending = pendingRows.sort(sortNormalized);
    writeJsonl(options.reviewOut, sortedLedger);
    writeJsonl(options.pendingOut, sortedPending);

    const report = {
      generatedAt: new Date().toISOString(),
      decisions: decisions.length,
      readyRows: sortedLedger.length,
      pendingRows: sortedPending.length,
      alreadyCoveredRows: sortedLedger.filter(
        (row) => row.readyStatus === "already_covered",
      ).length,
      byDecision: sortedLedger.reduce<Record<string, number>>((counts, row) => {
        counts[row.sourceDecision] = (counts[row.sourceDecision] ?? 0) + 1;
        return counts;
      }, {}),
      byReadyStatus: sortedLedger.reduce<Record<string, number>>((counts, row) => {
        counts[row.readyStatus] = (counts[row.readyStatus] ?? 0) + 1;
        return counts;
      }, {}),
      scope: options.scope ? [...options.scope] : "all",
      skipped,
      reviewOut: options.reviewOut,
      pendingOut: options.pendingOut,
    };
    writeJson(options.report, report);

    console.log("short-desc strict35 ready done");
    console.log(report);
  } finally {
    db.close();
  }
}

main();
