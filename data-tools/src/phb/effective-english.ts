import crypto from "node:crypto";

import type { FullSourceEvidenceReference } from "./full-comparison";
import type { FullSpellEntity } from "./full-extraction";
import type { FullListOccurrence } from "./full-lists";
import type { PilotErrataOverlayRow } from "./pilot-errata";
import type { SrdNameAlias } from "./srd-adjudication";
import type { SrdSpellEntity } from "./srd-extraction";
import {
  currentPhbAuthorityPolicyReference,
  PHB_EFFECTIVE_ENGLISH_RELATIVE_PATH,
  type PhbAuthorityPolicyReference,
} from "./source-authority";

export { PHB_EFFECTIVE_ENGLISH_RELATIVE_PATH };

export type EffectiveEnglishAuthority =
  "official-srd-3.5" | "phb-3.5-plus-accepted-errata";

export type EffectiveEnglishValue<T> = {
  value: T;
  authority: EffectiveEnglishAuthority;
  rule:
    | "srd-default"
    | "srd-omission"
    | "product-identity-name"
    | "phb-class-list"
    | "phb-page-table-layout";
  evidenceRowIds: string[];
};

export type EffectiveEnglishRow = {
  schemaVersion: 1;
  authorityPolicy: PhbAuthorityPolicyReference;
  caseId: string;
  phbPrintedName: string;
  srdPrintedName: string | null;
  effectiveName: EffectiveEnglishValue<string>;
  aliases: Array<{
    name: string;
    kind: "product-identity-counterpart";
    authority: EffectiveEnglishAuthority;
    evidenceRowIds: string[];
  }>;
  school: EffectiveEnglishValue<string>;
  fields: Record<string, EffectiveEnglishValue<string>>;
  bodyText: EffectiveEnglishValue<string>;
  shortDescriptions: Array<{
    occurrenceId: string;
    ownerKind: FullListOccurrence["ownerKind"];
    owner: string;
    level: number;
    summaryText: string;
    sourcePages: FullListOccurrence["sourcePages"];
    authority: "phb-3.5-plus-accepted-errata";
  }>;
  sourcePages: EffectiveEnglishValue<FullSpellEntity["sourcePages"]>;
  tableEvidence: EffectiveEnglishValue<{
    references: FullSourceEvidenceReference[];
    mineruTables: FullSpellEntity["mineruTableEvidence"];
    mineruLayout: FullSpellEntity["mineruLayoutEvidence"];
  }>;
  errataEvidence: {
    rowId: string;
    entryId: string | null;
    disposition: PilotErrataOverlayRow["disposition"];
    overlayPolicy: PilotErrataOverlayRow["overlayPolicy"];
  };
  resolutionStatus: "resolved" | "exception";
  unresolvedReasons: string[];
  evidenceRowIds: string[];
  evidenceFingerprintSha256: string;
};

type ErrataOverlayWithRowId = PilotErrataOverlayRow & { rowId: string };

const TARGET_FIELD_NAMES = new Set([
  "target",
  "targetOrArea",
  "targetEffectOrArea",
  "targetEffect",
  "areaOrTarget",
  "effect",
  "area",
]);

export function buildEffectiveEnglishRow(input: {
  phb: FullSpellEntity;
  errata: ErrataOverlayWithRowId;
  srd: SrdSpellEntity | null;
  alias: SrdNameAlias | null;
  shortDescriptions: FullListOccurrence[];
  sourceEvidence: FullSourceEvidenceReference[];
  sourceEvidenceReasons?: string[];
}): EffectiveEnglishRow {
  const authorityPolicy = currentPhbAuthorityPolicyReference();
  const unresolvedReasons = [...(input.sourceEvidenceReasons ?? [])];
  if (!input.srd) unresolvedReasons.push("srd-missing-spell");
  if (input.alias && !input.srd) unresolvedReasons.push("alias-target-missing");
  if (input.errata.caseId !== input.phb.rowId)
    unresolvedReasons.push("errata-case-mismatch");

  const srd = input.srd;
  const effectiveName = input.alias
    ? effectiveValue(
        input.phb.printedName,
        "phb-3.5-plus-accepted-errata",
        "product-identity-name",
        [input.phb.rowId, input.alias.aliasId],
      )
    : srd
      ? effectiveValue(srd.printedName, "official-srd-3.5", "srd-default", [
          srd.rowId,
        ])
      : effectiveValue(
          input.phb.printedName,
          "phb-3.5-plus-accepted-errata",
          "srd-omission",
          [input.phb.rowId, input.errata.rowId],
        );
  const aliases =
    input.alias && srd
      ? [
          {
            name: srd.printedName,
            kind: "product-identity-counterpart" as const,
            authority: "official-srd-3.5" as const,
            evidenceRowIds: [srd.rowId, input.alias.aliasId],
          },
        ]
      : [];
  const school = srd?.school
    ? effectiveValue(srd.school, "official-srd-3.5", "srd-default", [srd.rowId])
    : effectiveValue(
        input.errata.effectiveSchool ?? input.phb.school,
        "phb-3.5-plus-accepted-errata",
        "srd-omission",
        [input.phb.rowId, input.errata.rowId],
      );
  const fields = resolveFields(input.phb, input.errata, srd);
  const bodyText = srd?.bodyText
    ? effectiveValue(srd.bodyText, "official-srd-3.5", "srd-default", [
        srd.rowId,
      ])
    : effectiveValue(
        input.errata.effectiveBodyText,
        "phb-3.5-plus-accepted-errata",
        "srd-omission",
        [input.phb.rowId, input.errata.rowId],
      );
  const shortDescriptions = [...input.shortDescriptions]
    .sort((left, right) =>
      left.occurrenceId.localeCompare(right.occurrenceId, "en-US"),
    )
    .map((row) => ({
      occurrenceId: row.occurrenceId,
      ownerKind: row.ownerKind,
      owner: row.owner,
      level: row.level,
      summaryText: row.summaryText,
      sourcePages: row.sourcePages,
      authority: "phb-3.5-plus-accepted-errata" as const,
    }));
  const sourcePages = effectiveValue(
    input.phb.sourcePages,
    "phb-3.5-plus-accepted-errata",
    "phb-page-table-layout",
    [input.phb.rowId],
  );
  const tableEvidenceIds = [
    ...input.sourceEvidence.map((row) => row.rowId),
    ...input.phb.mineruTableEvidence.map((row) => row.rowId),
    ...input.phb.mineruLayoutEvidence.map((row) => row.rowId),
  ];
  const tableEvidence = effectiveValue(
    {
      references: input.sourceEvidence,
      mineruTables: input.phb.mineruTableEvidence,
      mineruLayout: input.phb.mineruLayoutEvidence,
    },
    "phb-3.5-plus-accepted-errata",
    "phb-page-table-layout",
    tableEvidenceIds,
  );
  const evidenceRowIds = Array.from(
    new Set([
      input.phb.rowId,
      input.errata.rowId,
      ...(srd ? [srd.rowId] : []),
      ...(input.alias ? [input.alias.aliasId] : []),
      ...shortDescriptions.map((row) => row.occurrenceId),
      ...tableEvidenceIds,
    ]),
  ).sort();
  const fingerprintInput = {
    authorityPolicy,
    phb: input.phb,
    errata: input.errata,
    srd,
    alias: input.alias,
    effectiveName,
    aliases,
    school,
    fields,
    bodyText,
    shortDescriptions,
    sourcePages,
    tableEvidence,
    unresolvedReasons,
  };

  return {
    schemaVersion: 1,
    authorityPolicy,
    caseId: input.phb.rowId,
    phbPrintedName: input.phb.printedName,
    srdPrintedName: srd?.printedName ?? null,
    effectiveName,
    aliases,
    school,
    fields,
    bodyText,
    shortDescriptions,
    sourcePages,
    tableEvidence,
    errataEvidence: {
      rowId: input.errata.rowId,
      entryId: input.errata.entryId,
      disposition: input.errata.disposition,
      overlayPolicy: input.errata.overlayPolicy,
    },
    resolutionStatus: unresolvedReasons.length === 0 ? "resolved" : "exception",
    unresolvedReasons,
    evidenceRowIds,
    evidenceFingerprintSha256: hashJson(fingerprintInput),
  };
}

function resolveFields(
  phb: FullSpellEntity,
  errata: ErrataOverlayWithRowId,
  srd: SrdSpellEntity | null,
) {
  const phbFields = canonicalFields(errata.effectiveFields);
  const srdFields = canonicalFields(srd?.fields ?? {});
  const result: Record<string, EffectiveEnglishValue<string>> = {};
  const groups = [
    ["level"],
    ["components"],
    ["castingTime"],
    ["range"],
    Array.from(TARGET_FIELD_NAMES),
    ["duration"],
    ["savingThrow"],
    ["spellResistance"],
  ];
  for (const group of groups) {
    const srdGroup = entriesForGroup(srdFields, group);
    const selected =
      srdGroup.length > 0 ? srdGroup : entriesForGroup(phbFields, group);
    const authority =
      srdGroup.length > 0
        ? ("official-srd-3.5" as const)
        : ("phb-3.5-plus-accepted-errata" as const);
    const rule =
      srdGroup.length > 0
        ? ("srd-default" as const)
        : ("srd-omission" as const);
    const evidenceRowIds =
      srdGroup.length > 0 && srd ? [srd.rowId] : [phb.rowId, errata.rowId];
    for (const [name, value] of selected) {
      result[name] = effectiveValue(value, authority, rule, evidenceRowIds);
    }
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) =>
      left.localeCompare(right, "en-US"),
    ),
  );
}

function canonicalFields(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [
      canonicalFieldName(name),
      value,
    ]),
  );
}

function canonicalFieldName(name: string) {
  const compact = name.toLocaleLowerCase("en-US").replace(/[^a-z]/gu, "");
  const names: Record<string, string> = {
    castingtime: "castingTime",
    savingthrow: "savingThrow",
    spellresistance: "spellResistance",
    targets: "target",
    targetorarea: "targetOrArea",
    targeteffectorarea: "targetEffectOrArea",
    targeteffect: "targetEffect",
    areaortarget: "areaOrTarget",
  };
  return names[compact] ?? compact;
}

function entriesForGroup(
  fields: Record<string, string>,
  names: string[],
): Array<[string, string]> {
  const allowed = new Set(names);
  return Object.entries(fields).filter(
    (entry): entry is [string, string] =>
      allowed.has(entry[0]) && Boolean(entry[1].trim()),
  );
}

function effectiveValue<T>(
  value: T,
  authority: EffectiveEnglishAuthority,
  rule: EffectiveEnglishValue<T>["rule"],
  evidenceRowIds: string[],
): EffectiveEnglishValue<T> {
  return {
    value,
    authority,
    rule,
    evidenceRowIds: Array.from(new Set(evidenceRowIds)).sort(),
  };
}

function hashJson(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right, "en-US"))
      .map(([key, nested]) => [key, stableValue(nested)]),
  );
}
