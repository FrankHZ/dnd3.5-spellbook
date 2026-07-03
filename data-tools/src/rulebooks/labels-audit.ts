import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { BOOK_LABEL_TO_ABBR } from "../zh-parser/mapping";
import {
  loadServerEnv,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";

export type RulebookLabelAuditStatus =
  | "keep"
  | "replace"
  | "needs-review"
  | "defer";

export type RulebookLabelAuditInputRow = {
  id: number;
  name: string;
  abbr: string;
  slug: string;
  editionSlug?: string | null;
  spellCount?: number;
  zhName?: string | null;
  currentDisplayName?: string | null;
  currentDisplayAbbr?: string | null;
  chmSourceLabels?: string[];
};

export type RulebookLabelAuditRow = {
  rulebookId: number;
  name: string;
  abbr: string;
  slug: string;
  editionSlug: string | null;
  spellCount: number;
  shownInRuntimeRulebookList: boolean;
  zhName: string | null;
  chmSourceLabels: string[];
  currentDisplayName: string | null;
  currentDisplayAbbr: string | null;
  proposedDisplayAbbr: string | null;
  proposedZhDisplayName: string | null;
  status: RulebookLabelAuditStatus;
  issues: string[];
};

export type RulebookLabelAuditReport = {
  schemaVersion: 1;
  generatedAt: string;
  counts: {
    rulebooks: number;
    shownInRuntimeRulebookList: number;
    keep: number;
    replace: number;
    needsReview: number;
    defer: number;
    missingZhNames: number;
    sourceArtifactAbbrs: number;
    duplicateProposedDisplayAbbrs: number;
    knownCommonAbbrMismatches: number;
  };
  rows: RulebookLabelAuditRow[];
};

type KnownDisplayDecision = {
  displayAbbr: string;
  issue: string;
};

const OUT_ROOT = path.join(repoRoot(), "data-tools", "out", "rulebook-labels");
const DEFAULT_OUTPUT_PATH = path.join(OUT_ROOT, "rulebook-label-audit.json");

const KNOWN_DISPLAY_DECISIONS: Record<string, KnownDisplayDecision> = {
  "spell-compendium": {
    displayAbbr: "SpC",
    issue: "known-common-abbr-mismatch",
  },
};

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rulebooks:labels:audit
  npm run -w data-tools rulebooks:labels:audit -- --output data-tools/out/rulebook-labels/audit.json

Audits legacy rules DB rulebook abbreviations against localized rulebook names,
CHM source-label mappings, and normalized content display-label fields. The
command is read-only against RULES_DATABASE_URL and CONTENT_DATABASE_URL.
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let output = DEFAULT_OUTPUT_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      const next = argv[index + 1];
      if (!next) usage();
      output = resolveCliPath(next);
      index += 1;
      continue;
    }
    usage();
  }

  return { output };
}

function resolveCliPath(value: string) {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function sqlitePathFromEnv(envName: string, fallbackEnvName?: string) {
  loadServerEnv();
  const raw =
    process.env[envName] ??
    (fallbackEnvName ? process.env[fallbackEnvName] : undefined);
  if (!raw) throw new Error(`${envName} is not set`);
  if (!raw.startsWith("file:")) {
    throw new Error(
      `Only file: SQLite URLs are supported for ${envName}, got ${raw}`,
    );
  }
  return resolveServerRelativePath(raw.slice("file:".length));
}

function rulesDbPath() {
  return sqlitePathFromEnv("RULES_DATABASE_URL");
}

function contentDbPath() {
  return sqlitePathFromEnv("CONTENT_DATABASE_URL", "APP_DATABASE_URL");
}

export function auditRulebookLabels(
  inputRows: RulebookLabelAuditInputRow[],
  generatedAt = new Date().toISOString(),
): RulebookLabelAuditReport {
  const rows = inputRows
    .map(auditRulebookLabelRow)
    .sort((a, b) => a.rulebookId - b.rulebookId);
  addDuplicateDisplayAbbrIssues(rows);
  for (const row of rows) {
    row.status = chooseStatus(row);
  }

  return {
    schemaVersion: 1,
    generatedAt,
    counts: {
      rulebooks: rows.length,
      shownInRuntimeRulebookList: rows.filter(
        (row) => row.shownInRuntimeRulebookList,
      ).length,
      keep: rows.filter((row) => row.status === "keep").length,
      replace: rows.filter((row) => row.status === "replace").length,
      needsReview: rows.filter((row) => row.status === "needs-review").length,
      defer: rows.filter((row) => row.status === "defer").length,
      missingZhNames: rows.filter((row) =>
        row.issues.includes("missing-zh-name"),
      ).length,
      sourceArtifactAbbrs: rows.filter((row) =>
        row.issues.includes("source-abbr-artifact"),
      ).length,
      duplicateProposedDisplayAbbrs: rows.filter((row) =>
        row.issues.includes("duplicate-proposed-display-abbr"),
      ).length,
      knownCommonAbbrMismatches: rows.filter((row) =>
        row.issues.includes("known-common-abbr-mismatch"),
      ).length,
    },
    rows,
  };
}

function auditRulebookLabelRow(
  row: RulebookLabelAuditInputRow,
): RulebookLabelAuditRow {
  const issues: string[] = [];
  const spellCount = row.spellCount ?? 0;
  const shownInRuntimeRulebookList = spellCount > 0;
  const zhName = cleanNullable(row.zhName);
  const currentDisplayName = cleanNullable(row.currentDisplayName);
  const currentDisplayAbbr = cleanNullable(row.currentDisplayAbbr);
  const knownDecision = KNOWN_DISPLAY_DECISIONS[row.slug];
  const hasSourceArtifact =
    /[_]/.test(row.abbr) || /[^\p{L}\p{N}&+.-]/u.test(row.abbr);

  if (shownInRuntimeRulebookList && !zhName) {
    issues.push("missing-zh-name");
  }
  if (hasSourceArtifact) {
    issues.push("source-abbr-artifact");
  }
  if (knownDecision && currentDisplayAbbr !== knownDecision.displayAbbr) {
    issues.push(knownDecision.issue);
  }
  if (
    shownInRuntimeRulebookList &&
    !currentDisplayAbbr &&
    hasSourceArtifact &&
    !knownDecision
  ) {
    issues.push("display-abbr-needs-review");
  }

  const proposedDisplayAbbr =
    currentDisplayAbbr ??
    knownDecision?.displayAbbr ??
    proposeDisplayAbbr(row.abbr);
  const proposedZhDisplayName = zhName;

  return {
    rulebookId: row.id,
    name: row.name,
    abbr: row.abbr,
    slug: row.slug,
    editionSlug: row.editionSlug ?? null,
    spellCount,
    shownInRuntimeRulebookList,
    zhName,
    chmSourceLabels: [...(row.chmSourceLabels ?? [])].sort((a, b) =>
      a.localeCompare(b),
    ),
    currentDisplayName,
    currentDisplayAbbr,
    proposedDisplayAbbr,
    proposedZhDisplayName,
    status: "keep",
    issues,
  };
}

function chooseStatus(row: RulebookLabelAuditRow): RulebookLabelAuditStatus {
  if (!row.shownInRuntimeRulebookList) return "defer";
  if (
    row.issues.includes("duplicate-proposed-display-abbr") ||
    row.issues.includes("display-abbr-needs-review") ||
    row.issues.includes("missing-zh-name")
  ) {
    return "needs-review";
  }
  if (row.issues.includes("known-common-abbr-mismatch")) return "replace";
  if (
    !row.currentDisplayAbbr &&
    row.issues.includes("source-abbr-artifact")
  ) {
    return "needs-review";
  }
  return "keep";
}

function addDuplicateDisplayAbbrIssues(rows: RulebookLabelAuditRow[]) {
  const byAbbr = new Map<string, RulebookLabelAuditRow[]>();
  for (const row of rows) {
    if (!row.shownInRuntimeRulebookList || !row.proposedDisplayAbbr) continue;
    const key = row.proposedDisplayAbbr.toLocaleLowerCase("en-US");
    byAbbr.set(key, [...(byAbbr.get(key) ?? []), row]);
  }
  for (const duplicateRows of byAbbr.values()) {
    if (duplicateRows.length <= 1) continue;
    for (const row of duplicateRows) {
      row.issues.push("duplicate-proposed-display-abbr");
    }
  }
}

function proposeDisplayAbbr(abbr: string) {
  const trimmed = abbr.trim();
  return trimmed.length > 0 ? trimmed.replace(/_+/g, "") : null;
}

function cleanNullable(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readAuditInputRows(
  rulesDb: Database.Database,
  contentDb: Database.Database,
) {
  const rulebooks = rulesDb
    .prepare(
      `
      SELECT rb.id,
             rb.name,
             rb.abbr,
             rb.slug,
             edition.slug AS editionSlug,
             COUNT(spell.id) AS spellCount
      FROM dnd_rulebook rb
      LEFT JOIN dnd_dndedition edition ON edition.id = rb.dnd_edition_id
      LEFT JOIN dnd_spell spell ON spell.rulebook_id = rb.id
      GROUP BY rb.id, rb.name, rb.abbr, rb.slug, edition.slug
      ORDER BY rb.id
    `,
    )
    .all() as Array<{
      id: number;
      name: string;
      abbr: string;
      slug: string;
      editionSlug: string | null;
      spellCount: number;
    }>;

  const zhNames = new Map(
    (
      contentDb
        .prepare(
          `
          SELECT rulebookId, name
          FROM I18nRulebookText
          WHERE lang = 'zh' AND variant = 'default'
        `,
        )
        .all() as Array<{ rulebookId: number; name: string | null }>
    ).map((row) => [row.rulebookId, row.name] as const),
  );

  const displayRows = new Map(
    (
      contentDb
        .prepare(
          `
          SELECT legacyRulebookId, displayName, displayAbbr
          FROM RulebookContent
        `,
        )
        .all() as Array<{
          legacyRulebookId: number;
          displayName: string | null;
          displayAbbr: string | null;
        }>
    ).map((row) => [row.legacyRulebookId, row] as const),
  );

  const sourceLabelsByAbbr = sourceLabelsByRulebookAbbr();

  return rulebooks.map((row): RulebookLabelAuditInputRow => {
    const displayRow = displayRows.get(row.id);
    return {
      id: row.id,
      name: row.name,
      abbr: row.abbr,
      slug: row.slug,
      editionSlug: row.editionSlug,
      spellCount: Number(row.spellCount),
      zhName: zhNames.get(row.id) ?? null,
      currentDisplayName: displayRow?.displayName ?? null,
      currentDisplayAbbr: displayRow?.displayAbbr ?? null,
      chmSourceLabels: sourceLabelsByAbbr.get(row.abbr) ?? [],
    };
  });
}

function sourceLabelsByRulebookAbbr() {
  const byAbbr = new Map<string, string[]>();
  for (const [label, abbr] of Object.entries(BOOK_LABEL_TO_ABBR)) {
    byAbbr.set(abbr, [...(byAbbr.get(abbr) ?? []), label]);
  }
  return byAbbr;
}

function writeReport(report: RulebookLabelAuditReport, outputPath: string) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const { output } = parseArgs(process.argv.slice(2));
  const rulesDb = new Database(rulesDbPath(), {
    readonly: true,
    fileMustExist: true,
  });
  const contentDb = new Database(contentDbPath(), {
    readonly: true,
    fileMustExist: true,
  });

  try {
    const rows = readAuditInputRows(rulesDb, contentDb);
    const report = auditRulebookLabels(rows);
    writeReport(report, output);

    console.log(`Rulebook label audit written: ${output}`);
    console.log(`Rulebooks: ${report.counts.rulebooks}`);
    console.log(
      `Runtime-visible rulebooks: ${report.counts.shownInRuntimeRulebookList}`,
    );
    console.log(`Keep: ${report.counts.keep}`);
    console.log(`Replace: ${report.counts.replace}`);
    console.log(`Needs review: ${report.counts.needsReview}`);
    console.log(`Defer: ${report.counts.defer}`);
  } finally {
    rulesDb.close();
    contentDb.close();
  }
}

if (require.main === module) {
  main();
}
