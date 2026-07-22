import { createHash } from "node:crypto";

import type { PilotErrataOverlayRow } from "./pilot-errata";
import type {
  FullDetachedTableEvidence,
  FullMineruTableEvidence,
  FullSpellEntity,
} from "./full-extraction";
import type {
  FullMineruLayoutEvidenceReference,
  FullMineruLayoutReview,
} from "./full-mineru";
import { fullMineruLayoutDecisionFingerprint } from "./full-mineru";
import {
  compareSpell,
  type DbSpell,
  type PhbComparisonCategory,
  type PilotClassListOccurrenceForComparison,
  type PilotComparisonSpell,
  type PilotDbComparisonRow,
} from "./pilot-comparison";

export type FullSourceEvidenceReference = {
  rowId: string;
  kind: "detached-table" | "mineru-table" | "mineru-layout";
  sha256: string;
};

export type FullDbComparisonRow = PilotDbComparisonRow & {
  setMembership: "both" | "source-only" | "db-only";
  sourceEvidence: FullSourceEvidenceReference[];
};

export function compareFullCorpus(input: {
  spells: FullSpellEntity[];
  overlays: PilotErrataOverlayRow[];
  classListOccurrences: Array<
    PilotClassListOccurrenceForComparison & {
      mineruLayoutEvidence?: FullMineruLayoutEvidenceReference[];
    }
  >;
  dbSpells: DbSpell[];
  detachedTables?: FullDetachedTableEvidence[];
  summonMonsterTable?: PilotComparisonSpell["summonTable"];
  dbSummonTableValue?: string;
}) {
  const sourceByName = groupByName(input.spells);
  const dbByName = groupByName(input.dbSpells);
  const overlayByCase = new Map(
    input.overlays.map((overlay) => [overlay.caseId, overlay]),
  );
  const occurrencesByName = groupByName(input.classListOccurrences);
  const keys = Array.from(
    new Set([...sourceByName.keys(), ...dbByName.keys()]),
  ).sort((left, right) => left.localeCompare(right, "en-US"));

  return keys.map((key): FullDbComparisonRow => {
    const sourceRows = sourceByName.get(key) ?? [];
    const dbRows = dbByName.get(key) ?? [];
    const occurrences = occurrencesByName.get(key) ?? [];
    if (sourceRows.length === 0) {
      const db = dbRows[0]!;
      return setOnlyRow({
        printedName: db.name,
        category: "extra-in-db",
        membership: "db-only",
        dbRows,
        occurrences,
      });
    }
    const source = sourceRows[0]!;
    const detachedEvidence = relatedDetachedTableEvidence(
      source,
      input.detachedTables ?? [],
    );
    const sourceEvidence: FullSourceEvidenceReference[] = [
      ...detachedEvidence.map(toDetachedTableReference),
      ...source.mineruTableEvidence.map((evidence) => ({
        rowId: evidence.rowId,
        kind: "mineru-table" as const,
        sha256: evidence.evidenceSha256,
      })),
      ...source.mineruLayoutEvidence.map(toLayoutEvidenceReference),
      ...occurrences.flatMap((occurrence) =>
        (occurrence.mineruLayoutEvidence ?? []).map(toLayoutEvidenceReference),
      ),
    ];
    const uniqueSourceEvidence = Array.from(
      new Map(
        sourceEvidence.map((evidence) => [evidence.rowId, evidence]),
      ).values(),
    ).sort((left, right) => left.rowId.localeCompare(right.rowId, "en-US"));
    const sourceReviewFlags = [
      ...source.reviewFlags,
      ...(detachedEvidence.some(
        (evidence) =>
          normalizeName(evidence.printedName) === "summon nature's ally",
      )
        ? ["uncertain:shared-summon-table-unparsed"]
        : []),
    ];
    if (sourceRows.length > 1) {
      return setOnlyRow({
        printedName: source.printedName,
        category: "manual-review",
        membership: dbRows.length > 0 ? "both" : "source-only",
        dbRows,
        occurrences,
        source,
        reviewFlags: [
          ...sourceReviewFlags,
          "parser-issue:duplicate-source-spell",
        ],
        sourceEvidence: uniqueSourceEvidence,
      });
    }
    const comparisonSpell = toComparisonSpell(
      { ...source, reviewFlags: sourceReviewFlags },
      source.printedName === "Summon Monster I"
        ? input.summonMonsterTable
        : undefined,
    );
    const overlay = overlayByCase.get(source.rowId);
    if (!overlay) {
      throw new Error(`PHB full errata overlay is missing: ${source.rowId}`);
    }
    const compared = compareSpell(
      comparisonSpell,
      overlay,
      occurrences,
      dbRows,
      comparisonSpell.summonTable ? input.dbSummonTableValue : undefined,
    );
    return {
      ...compared,
      setMembership: dbRows.length > 0 ? "both" : "source-only",
      sourceEvidence: uniqueSourceEvidence,
    };
  });
}

export function validateFullComparisonBalance(input: {
  rows: FullDbComparisonRow[];
  sourceSpellCount: number;
  dbSpellCount: number;
}) {
  const errors: string[] = [];
  const sourceCount = input.rows.filter(
    (row) => row.setMembership !== "db-only",
  ).length;
  const dbCount = input.rows.filter(
    (row) => row.setMembership !== "source-only",
  ).length;
  if (sourceCount !== input.sourceSpellCount) {
    errors.push(
      `source set does not balance: ${sourceCount} != ${input.sourceSpellCount}`,
    );
  }
  if (dbCount !== input.dbSpellCount) {
    errors.push(`DB set does not balance: ${dbCount} != ${input.dbSpellCount}`);
  }
  const rowIds = input.rows.map((row) => row.caseId);
  if (new Set(rowIds).size !== rowIds.length) {
    errors.push("comparison caseId values are not unique");
  }
  return errors;
}

export function validateFullComparisonSourceEvidence(
  rows: FullDbComparisonRow[],
  detachedTables: FullDetachedTableEvidence[],
  mineruTables: FullMineruTableEvidence[] = [],
  layoutReviews: FullMineruLayoutReview[] = [],
) {
  const errors: string[] = [];
  const detachedById = new Map(
    detachedTables.map((table) => [table.rowId, table]),
  );
  const mineruById = new Map(mineruTables.map((table) => [table.rowId, table]));
  const layoutById = new Map(
    layoutReviews.map((review) => [review.rowId, review]),
  );
  for (const row of rows) {
    const seen = new Set<string>();
    for (const evidence of row.sourceEvidence) {
      if (seen.has(evidence.rowId)) {
        errors.push(`${row.caseId} repeats source evidence ${evidence.rowId}`);
        continue;
      }
      seen.add(evidence.rowId);
      const expected =
        evidence.kind === "detached-table"
          ? detachedById.has(evidence.rowId)
            ? detachedTableSha256(detachedById.get(evidence.rowId)!)
            : null
          : evidence.kind === "mineru-table"
            ? (mineruById.get(evidence.rowId)?.evidenceSha256 ?? null)
            : layoutById.get(evidence.rowId)?.status === "accepted"
              ? fullMineruLayoutDecisionFingerprint(
                  layoutById.get(evidence.rowId)!,
                )
              : null;
      if (expected === null) {
        errors.push(
          `${row.caseId} source evidence is missing: ${evidence.rowId}`,
        );
        continue;
      }
      if (evidence.sha256 !== expected) {
        errors.push(
          `${row.caseId} source evidence is stale: ${evidence.rowId}`,
        );
      }
    }
  }
  return errors;
}

function toComparisonSpell(
  source: FullSpellEntity,
  summonTable: PilotComparisonSpell["summonTable"] | undefined,
): PilotComparisonSpell {
  return {
    caseId: source.rowId,
    printedName: source.printedName,
    sourcePages: source.sourcePages.flatMap((page) =>
      page.printedPageNumber === null ? [] : [page.printedPageNumber],
    ),
    school: source.school,
    fields: { ...source.fields },
    bodyText: source.bodyText,
    reviewFlags: source.reviewFlags,
    ...(summonTable ? { summonTable } : {}),
  };
}

function setOnlyRow(input: {
  printedName: string;
  category: PhbComparisonCategory;
  membership: FullDbComparisonRow["setMembership"];
  dbRows: DbSpell[];
  occurrences: PilotClassListOccurrenceForComparison[];
  source?: FullSpellEntity;
  reviewFlags?: string[];
  sourceEvidence?: FullSourceEvidenceReference[];
}): FullDbComparisonRow {
  const sourcePages = input.source
    ? input.source.sourcePages.flatMap((page) =>
        page.printedPageNumber === null ? [] : [page.printedPageNumber],
      )
    : [];
  return {
    schemaVersion: 1,
    caseId: input.source?.rowId ?? `spell:${slug(input.printedName)}`,
    printedName: input.printedName,
    category: input.category,
    setMembership: input.membership,
    sourceEvidence: input.sourceEvidence ?? [],
    sourcePages,
    dbSpellIds: input.dbRows.map((row) => row.id),
    components: [
      {
        component: "identity",
        category: "substantive-mismatch",
        sourceValue: input.source?.printedName ?? "",
        dbValue: input.dbRows.map((row) => row.name).join(" | "),
      },
    ],
    shortDescriptions: {
      occurrenceCount: input.occurrences.length,
      wordingGroupCount: new Set(
        input.occurrences.map((row) => row.wordingGroupKey),
      ).size,
      wordingGroupKeys: Array.from(
        new Set(input.occurrences.map((row) => row.wordingGroupKey)),
      ).sort(),
      dbSummaryText: input.dbRows[0]?.summaryText ?? null,
    },
    reviewFlags: Array.from(new Set(input.reviewFlags ?? [])).sort(),
  };
}

function relatedDetachedTableEvidence(
  source: FullSpellEntity,
  tables: FullDetachedTableEvidence[],
) {
  const spellName = normalizeName(source.printedName);
  return tables.filter((table) => {
    const tableName = normalizeName(table.printedName);
    return table.attachToSpell
      ? spellName === tableName
      : spellName.startsWith(`${tableName} `);
  });
}

function toDetachedTableReference(
  table: FullDetachedTableEvidence,
): FullSourceEvidenceReference {
  return {
    rowId: table.rowId,
    kind: "detached-table" as const,
    sha256: detachedTableSha256(table),
  };
}

function toLayoutEvidenceReference(
  evidence: FullMineruLayoutEvidenceReference,
): FullSourceEvidenceReference {
  return {
    rowId: evidence.rowId,
    kind: "mineru-layout",
    sha256: evidence.evidenceFingerprintSha256,
  };
}

function detachedTableSha256(table: FullDetachedTableEvidence) {
  return createHash("sha256").update(JSON.stringify(table)).digest("hex");
}

function groupByName<T extends { printedName?: string; name?: string }>(
  rows: T[],
) {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const name = row.printedName ?? row.name;
    if (!name) throw new Error("PHB comparison row has no name");
    const key = normalizeName(name);
    const values = result.get(key) ?? [];
    values.push(row);
    result.set(key, values);
  }
  return result;
}

function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[‘’]/gu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function slug(value: string) {
  return normalizeName(value)
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}
