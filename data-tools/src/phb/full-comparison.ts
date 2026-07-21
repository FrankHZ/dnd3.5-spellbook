import type { PilotErrataOverlayRow } from "./pilot-errata";
import type { FullSpellEntity } from "./full-extraction";
import {
  compareSpell,
  type DbSpell,
  type PhbComparisonCategory,
  type PilotClassListOccurrenceForComparison,
  type PilotComparisonSpell,
  type PilotDbComparisonRow,
} from "./pilot-comparison";

export type FullDbComparisonRow = PilotDbComparisonRow & {
  setMembership: "both" | "source-only" | "db-only";
};

export function compareFullCorpus(input: {
  spells: FullSpellEntity[];
  overlays: PilotErrataOverlayRow[];
  classListOccurrences: PilotClassListOccurrenceForComparison[];
  dbSpells: DbSpell[];
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
    if (sourceRows.length > 1) {
      return setOnlyRow({
        printedName: source.printedName,
        category: "manual-review",
        membership: dbRows.length > 0 ? "both" : "source-only",
        dbRows,
        occurrences,
        source,
        reviewFlags: ["parser-issue:duplicate-source-spell"],
      });
    }
    const comparisonSpell = toComparisonSpell(
      source,
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
