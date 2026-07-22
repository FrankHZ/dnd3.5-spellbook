import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { FullDbComparisonRow } from "./full-comparison";
import {
  PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
  PHB_FULL_ROW_REVIEW_RELATIVE_PATH,
  runFullComparison,
} from "./full-pipeline";
import type { FullRowReview } from "./full-row-review";
import { compareComponent } from "./pilot-comparison";
import {
  normalizeName,
  PHB_SRD_EXTRACTION_MANIFEST_RELATIVE_PATH,
  PHB_SRD_ISSUES_RELATIVE_PATH,
  PHB_SRD_SPELLS_RELATIVE_PATH,
  PHB_SRD_SUMMARIES_RELATIVE_PATH,
  type SrdShortDescription,
  type SrdSpellEntity,
} from "./srd-extraction";
import { readAndVerifySrdSourceManifest } from "./srd-source";
import {
  committedFileCommit,
  resolveInside,
  sha256File,
} from "./source-manifest";

export const PHB_SRD_ALIASES_RELATIVE_PATH =
  "phb35/review/srd-name-aliases.jsonl";
export const PHB_SRD_ADJUDICATION_RELATIVE_PATH =
  "phb35/review/srd-adjudication.jsonl";
export const PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH =
  "phb35/review/srd-adjudication-manifest.json";

export type SrdNameAlias = {
  schemaVersion: 1;
  aliasId: string;
  phbName: string;
  srdName: string;
  kind: "product-identity";
  status: "accepted";
  decisionNote: string;
};

export type SrdComponentDisposition =
  | "alias-backed"
  | "corroborated"
  | "phb-srd-agree-db-drift"
  | "srd-db-agree-phb-drift"
  | "srd-variant-ambiguous"
  | "srd-missing-component"
  | "srd-missing-spell"
  | "three-way-drift"
  | "unsupported-page";

export type SrdAdjudicationRow = {
  schemaVersion: 1;
  caseId: string;
  printedName: string;
  srdPrintedName: string | null;
  aliasId: string | null;
  comparisonCategory: FullDbComparisonRow["category"];
  status: "terminal-candidate" | "exception";
  rule:
    | "source-backed-db-correction"
    | "srd-corroborated-phb"
    | "canonical-summary-supported"
    | "residual-exception";
  componentEvidence: Array<{
    component: string;
    originalCategory:
      "exact-match" | "formatting-only" | "substantive-mismatch";
    disposition: SrdComponentDisposition;
    srdValues: string[];
  }>;
  unresolvedReasons: string[];
  evidenceRowIds: string[];
  evidenceFingerprintSha256: string;
};

export function runSrdAdjudication(dataRoot: string) {
  const extractionManifestPath = resolveInside(
    dataRoot,
    PHB_SRD_EXTRACTION_MANIFEST_RELATIVE_PATH,
  );
  const source = readAndVerifySrdSourceManifest(dataRoot);
  verifyExtractionManifest(
    dataRoot,
    extractionManifestPath,
    source.manifestSha256,
  );
  const comparisonsPath = resolveInside(
    dataRoot,
    PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
  );
  const reviewsPath = resolveInside(
    dataRoot,
    PHB_FULL_ROW_REVIEW_RELATIVE_PATH,
  );
  const spellsPath = resolveInside(dataRoot, PHB_SRD_SPELLS_RELATIVE_PATH);
  const summariesPath = resolveInside(
    dataRoot,
    PHB_SRD_SUMMARIES_RELATIVE_PATH,
  );
  const issuesPath = resolveInside(dataRoot, PHB_SRD_ISSUES_RELATIVE_PATH);
  const aliasesPath = resolveInside(dataRoot, PHB_SRD_ALIASES_RELATIVE_PATH);
  const comparisons = readJsonl<FullDbComparisonRow>(comparisonsPath);
  const reviews = readJsonl<FullRowReview>(reviewsPath);
  const spells = readJsonl<SrdSpellEntity>(spellsPath);
  const summaries = readJsonl<SrdShortDescription>(summariesPath);
  const aliases = readJsonl<SrdNameAlias>(aliasesPath);
  const issues = readJsonl<unknown>(issuesPath);
  if (issues.length > 0) {
    throw new Error(
      `PHB SRD extraction has ${issues.length} unresolved issues`,
    );
  }
  const aliasErrors = validateSrdAliases({
    aliases,
    phbNames: comparisons.map((row) => row.printedName),
    srdNames: spells.map((row) => row.printedName),
  });
  if (aliasErrors.length > 0) {
    throw new Error(`PHB SRD aliases are invalid:\n${aliasErrors.join("\n")}`);
  }

  const reviewByCase = new Map(reviews.map((row) => [row.caseId, row]));
  const spellByName = new Map(
    spells.map((spell) => [normalizeName(spell.printedName), spell]),
  );
  const aliasesByPhb = new Map(
    aliases.map((alias) => [normalizeName(alias.phbName), alias]),
  );
  const summariesByName = groupByName(summaries);
  const selected = comparisons.flatMap((comparison) => {
    const review = reviewByCase.get(comparison.caseId);
    return review && isSrdAdjudicationInput(review)
      ? [{ comparison, review }]
      : [];
  });
  const rows = selected.map(({ comparison, review }) =>
    adjudicateComparison({
      comparison,
      review,
      aliases,
      alias: aliasesByPhb.get(normalizeName(comparison.printedName)) ?? null,
      spellByName,
      summariesByName,
    }),
  );

  const outputPath = resolveInside(
    dataRoot,
    PHB_SRD_ADJUDICATION_RELATIVE_PATH,
  );
  writeJsonl(outputPath, rows);
  const manifestPath = resolveInside(
    dataRoot,
    PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH,
  );
  const counts = {
    inputReviewRows: rows.length,
    inputProposedRows: selected.filter(
      ({ review }) => review.status === "proposed",
    ).length,
    inputPriorTerminalRows: selected.filter(
      ({ review }) => review.reviewer === "data-tools:srd-adjudication",
    ).length,
    terminalCandidates: rows.filter(
      (row) => row.status === "terminal-candidate",
    ).length,
    proposedTerminalCandidates: rows.filter(
      (row) =>
        row.status === "terminal-candidate" &&
        reviewByCase.get(row.caseId)?.status === "proposed",
    ).length,
    exceptions: rows.filter((row) => row.status === "exception").length,
    rules: countBy(rows.map((row) => row.rule)),
    dispositions: countBy(
      rows.flatMap((row) =>
        row.componentEvidence.map((component) => component.disposition),
      ),
    ),
  };
  const manifest = {
    schemaVersion: 1,
    inputs: {
      extractionManifest: artifact(
        PHB_SRD_EXTRACTION_MANIFEST_RELATIVE_PATH,
        extractionManifestPath,
      ),
      comparisons: artifact(
        PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
        comparisonsPath,
      ),
      rowReviewEvidenceSha256: hashJson(
        reviews.map((row) => ({
          caseId: row.caseId,
          proposedCategory: row.proposedCategory,
          evidenceRowIds: row.evidenceRowIds,
          evidenceFingerprintSha256: row.evidenceFingerprintSha256,
        })),
      ),
      aliases: artifact(PHB_SRD_ALIASES_RELATIVE_PATH, aliasesPath),
    },
    output: artifact(PHB_SRD_ADJUDICATION_RELATIVE_PATH, outputPath),
    counts,
  };
  writeJson(manifestPath, manifest);
  return { manifestPath, manifest };
}

export function applySrdTerminalCandidates(dataRoot: string) {
  const manifestPath = resolveInside(
    dataRoot,
    PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH,
  );
  const adjudicationPath = resolveInside(
    dataRoot,
    PHB_SRD_ADJUDICATION_RELATIVE_PATH,
  );
  verifyAdjudicationManifest(dataRoot, manifestPath);
  committedFileCommit(dataRoot, manifestPath);
  committedFileCommit(dataRoot, adjudicationPath);
  const adjudications = readJsonl<SrdAdjudicationRow>(adjudicationPath);
  const accepted = new Map(
    adjudications
      .filter((row) => row.status === "terminal-candidate")
      .map((row) => [row.caseId, row]),
  );
  const reviewsPath = resolveInside(
    dataRoot,
    PHB_FULL_ROW_REVIEW_RELATIVE_PATH,
  );
  let applied = 0;
  const reviews = readJsonl<FullRowReview>(reviewsPath).map((review) => {
    const adjudication = accepted.get(review.caseId);
    if (!adjudication || review.status !== "proposed") return review;
    applied += 1;
    return {
      ...review,
      status: "accepted" as const,
      reviewer: "data-tools:srd-adjudication",
      decisionNote: `Accepted by SRD adjudication ${adjudication.evidenceFingerprintSha256}: ${adjudication.rule}.`,
    };
  });
  writeJsonl(reviewsPath, reviews);
  runFullComparison();
  runSrdAdjudication(dataRoot);
  return {
    accepted: applied,
    remaining: reviews.filter((row) => row.status === "proposed").length,
  };
}

export function isSrdAdjudicationInput(review: FullRowReview) {
  return (
    review.status === "proposed" ||
    review.reviewer === "data-tools:srd-adjudication"
  );
}

export function validateSrdAliases(input: {
  aliases: SrdNameAlias[];
  phbNames: string[];
  srdNames: string[];
}) {
  const errors: string[] = [];
  const phbSet = new Set(input.phbNames.map(normalizeName));
  const srdSet = new Set(input.srdNames.map(normalizeName));
  const phbOnly = new Set(
    Array.from(phbSet).filter((name) => !srdSet.has(name)),
  );
  const srdOnly = new Set(
    Array.from(srdSet).filter((name) => !phbSet.has(name)),
  );
  const seenIds = new Set<string>();
  const seenPhb = new Set<string>();
  const seenSrd = new Set<string>();
  input.aliases.forEach((alias, index) => {
    const prefix = `aliases[${index}]`;
    if (alias.schemaVersion !== 1)
      errors.push(`${prefix}.schemaVersion must be 1`);
    if (!alias.aliasId.trim()) errors.push(`${prefix}.aliasId is empty`);
    if (seenIds.has(alias.aliasId))
      errors.push(`${prefix}.aliasId is duplicated`);
    seenIds.add(alias.aliasId);
    if (alias.kind !== "product-identity")
      errors.push(`${prefix}.kind is invalid`);
    if (alias.status !== "accepted")
      errors.push(`${prefix}.status must be accepted`);
    if (!alias.decisionNote.trim())
      errors.push(`${prefix}.decisionNote is empty`);
    const phb = normalizeName(alias.phbName);
    const srd = normalizeName(alias.srdName);
    if (!phbOnly.has(phb)) errors.push(`${prefix}.phbName is not PHB-only`);
    if (!srdOnly.has(srd)) errors.push(`${prefix}.srdName is not SRD-only`);
    if (seenPhb.has(phb)) errors.push(`${prefix}.phbName is duplicated`);
    if (seenSrd.has(srd)) errors.push(`${prefix}.srdName is duplicated`);
    seenPhb.add(phb);
    seenSrd.add(srd);
  });
  for (const name of phbOnly) {
    if (!seenPhb.has(name)) errors.push(`PHB-only spell has no alias: ${name}`);
  }
  for (const name of srdOnly) {
    if (!seenSrd.has(name)) errors.push(`SRD-only spell has no alias: ${name}`);
  }
  return errors;
}

export function adjudicateComparison(input: {
  comparison: FullDbComparisonRow;
  review: FullRowReview;
  aliases: SrdNameAlias[];
  alias: SrdNameAlias | null;
  spellByName: Map<string, SrdSpellEntity>;
  summariesByName: Map<string, SrdShortDescription[]>;
}): SrdAdjudicationRow {
  const srdName = input.alias?.srdName ?? input.comparison.printedName;
  const spell = input.spellByName.get(normalizeName(srdName));
  const summaries = input.summariesByName.get(normalizeName(srdName)) ?? [];
  const componentEvidence = input.comparison.components.map((component) => {
    if (component.component === "name") {
      return {
        component: component.component,
        originalCategory: component.category,
        disposition: (input.alias
          ? "alias-backed"
          : "corroborated") as SrdComponentDisposition,
        srdValues: spell ? [spell.printedName] : [],
      };
    }
    if (component.component === "page") {
      return {
        component: component.component,
        originalCategory: component.category,
        disposition: "unsupported-page" as const,
        srdValues: [],
      };
    }
    const srdValues = component.component.startsWith("shortDescription:")
      ? Array.from(new Set(summaries.map((row) => row.summaryText))).sort()
      : spell
        ? srdComponentValues(component.component, spell)
        : [];
    return {
      component: component.component,
      originalCategory: component.category,
      disposition: componentDisposition({
        component: component.component,
        sourceValue: component.sourceValue,
        dbValue: component.dbValue,
        srdValues,
        aliases: input.aliases,
        spellMissing: !spell,
      }),
      srdValues,
    };
  });

  const substantive = componentEvidence.filter(
    (component) => component.originalCategory === "substantive-mismatch",
  );
  const hardFlags = input.comparison.reviewFlags.filter(isHardResidualFlag);
  const unresolvedReasons = [
    ...hardFlags.map((flag) => `review-flag:${flag}`),
    ...substantive
      .filter((component) => component.disposition !== "phb-srd-agree-db-drift")
      .map((component) => `${component.component}:${component.disposition}`),
  ];
  const summaryCanonical =
    input.comparison.reviewFlags.includes(
      "short-description-wording-conflict",
    ) &&
    componentEvidence
      .filter((component) =>
        component.component.startsWith("shortDescription:"),
      )
      .some((component) => component.disposition === "corroborated");
  const summaryOfficialVariant = componentEvidence
    .filter((component) => component.component.startsWith("shortDescription:"))
    .some((component) => component.disposition === "srd-variant-ambiguous");
  if (summaryCanonical || summaryOfficialVariant) {
    for (let index = unresolvedReasons.length - 1; index >= 0; index -= 1) {
      if (unresolvedReasons[index]?.startsWith("shortDescription:")) {
        unresolvedReasons.splice(index, 1);
      }
    }
  }
  const status =
    unresolvedReasons.length === 0 ? "terminal-candidate" : "exception";
  const hasDbCorrection = substantive.some(
    (component) => component.disposition === "phb-srd-agree-db-drift",
  );
  const rule =
    status === "exception"
      ? "residual-exception"
      : summaryCanonical || summaryOfficialVariant
        ? "canonical-summary-supported"
        : hasDbCorrection
          ? "source-backed-db-correction"
          : "srd-corroborated-phb";
  const evidenceRowIds = Array.from(
    new Set([
      ...input.review.evidenceRowIds,
      ...(spell ? [spell.rowId] : []),
      ...summaries.map((row) => row.rowId),
      ...(input.alias ? [input.alias.aliasId] : []),
    ]),
  ).sort();
  const fingerprintInput = {
    comparison: input.comparison,
    reviewFingerprintSha256: input.review.evidenceFingerprintSha256,
    spell,
    summaries,
    alias: input.alias,
    componentEvidence,
    unresolvedReasons,
  };
  return {
    schemaVersion: 1,
    caseId: input.comparison.caseId,
    printedName: input.comparison.printedName,
    srdPrintedName: spell?.printedName ?? null,
    aliasId: input.alias?.aliasId ?? null,
    comparisonCategory: input.comparison.category,
    status,
    rule,
    componentEvidence,
    unresolvedReasons,
    evidenceRowIds,
    evidenceFingerprintSha256: hashJson(fingerprintInput),
  };
}

function componentDisposition(input: {
  component: string;
  sourceValue: string;
  dbValue: string;
  srdValues: string[];
  aliases: SrdNameAlias[];
  spellMissing: boolean;
}): SrdComponentDisposition {
  if (input.srdValues.length === 0) {
    return input.spellMissing ? "srd-missing-spell" : "srd-missing-component";
  }
  const source = canonicalizeAliases(input.sourceValue, input.aliases);
  const db = canonicalizeAliases(input.dbValue, input.aliases);
  const matches = input.srdValues.map((value) => {
    const srd = canonicalizeAliases(value, input.aliases);
    return {
      source:
        compareComponent(input.component, source, srd).category !==
        "substantive-mismatch",
      db:
        compareComponent(input.component, srd, db).category !==
        "substantive-mismatch",
    };
  });
  if (matches.some((match) => match.source && match.db)) return "corroborated";
  if (
    matches.some((match) => match.source) &&
    matches.some((match) => match.db)
  ) {
    return "srd-variant-ambiguous";
  }
  if (matches.some((match) => match.source)) return "phb-srd-agree-db-drift";
  if (matches.some((match) => match.db)) return "srd-db-agree-phb-drift";
  return "three-way-drift";
}

function srdComponentValues(component: string, spell: SrdSpellEntity) {
  if (component === "school") return [spell.school];
  if (component === "body") return [spell.bodyText];
  if (component === "targetEffectArea") {
    const value = srdTargetEffectArea(spell.fields);
    return value ? [value] : [];
  }
  if (component === "level") {
    return spell.fields.level ? [normalizeLevel(spell.fields.level)] : [];
  }
  const fieldNames: Record<string, string> = {
    components: "components",
    castingTime: "castingTime",
    range: "range",
    duration: "duration",
    savingThrow: "savingThrow",
    spellResistance: "spellResistance",
  };
  const field = fieldNames[component];
  return field && spell.fields[field] ? [spell.fields[field]!] : [];
}

function srdTargetEffectArea(fields: Record<string, string>) {
  const values: Array<readonly [string, string | undefined]> = [
    ["Target", fields.targets ?? fields.target],
    ["Effect", fields.effect],
    ["Area", fields.area],
    ["Target or Area", fields.targetorarea],
    ["Target, Effect, or Area", fields.targeteffectorarea],
    ["Target/Effect", fields.targeteffect],
    ["Area or Target", fields.areaortarget],
  ];
  return values
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `${label}: ${value}`)
    .join(" / ");
}

function normalizeLevel(value: string) {
  const aliases: Record<string, string> = {
    brd: "bard",
    clr: "cleric",
    drd: "druid",
    pal: "paladin",
    rgr: "ranger",
    "sor/wiz": "sor/wiz",
    wiz: "wizard",
  };
  return value
    .split(/,\s*/u)
    .map((part) => {
      const match = /^(.*?)\s+(\d+)$/u.exec(part.trim());
      if (!match?.[1] || !match[2]) return part.toLocaleLowerCase("en-US");
      return `${aliases[match[1].toLocaleLowerCase("en-US")] ?? match[1].toLocaleLowerCase("en-US")} ${match[2]}`;
    })
    .sort()
    .join(",");
}

function canonicalizeAliases(value: string, aliases: SrdNameAlias[]) {
  let result = value.normalize("NFKC").replace(/[‘’]/gu, "'");
  for (const alias of aliases) {
    const canonical = alias.srdName.replace(/[‘’]/gu, "'");
    for (const name of [alias.phbName, alias.srdName]) {
      result = result.replace(
        new RegExp(escapeRegExp(name.replace(/[‘’]/gu, "'")), "giu"),
        canonical,
      );
    }
  }
  return result;
}

function isHardResidualFlag(value: string) {
  return (
    value === "inventory-review-required" ||
    value.startsWith("parser-issue:") ||
    value.startsWith("uncertain:shared-summon-table")
  );
}

function verifyExtractionManifest(
  dataRoot: string,
  manifestPath: string,
  sourceManifestSha256: string,
) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    sourceManifest: { sha256: string };
    outputs: Record<
      string,
      { relativePath: string; bytes: number; sha256: string }
    >;
  };
  if (manifest.sourceManifest.sha256 !== sourceManifestSha256) {
    throw new Error("SRD extraction source manifest is stale");
  }
  for (const [name, artifactValue] of Object.entries(manifest.outputs)) {
    const filePath = resolveInside(dataRoot, artifactValue.relativePath);
    if (!fs.existsSync(filePath))
      throw new Error(`SRD extraction ${name} is missing`);
    if (
      fs.statSync(filePath).size !== artifactValue.bytes ||
      sha256File(filePath) !== artifactValue.sha256
    ) {
      throw new Error(`SRD extraction ${name} is stale`);
    }
  }
}

function verifyAdjudicationManifest(dataRoot: string, manifestPath: string) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    inputs: {
      extractionManifest: { relativePath: string; sha256: string };
      comparisons: { relativePath: string; sha256: string };
      aliases: { relativePath: string; sha256: string };
      rowReviewEvidenceSha256: string;
    };
    output: { relativePath: string; sha256: string };
  };
  for (const artifactValue of [
    manifest.inputs.extractionManifest,
    manifest.inputs.comparisons,
    manifest.inputs.aliases,
    manifest.output,
  ]) {
    const filePath = resolveInside(dataRoot, artifactValue.relativePath);
    if (sha256File(filePath) !== artifactValue.sha256) {
      throw new Error(
        `PHB SRD adjudication artifact is stale: ${artifactValue.relativePath}`,
      );
    }
  }
  const reviews = readJsonl<FullRowReview>(
    resolveInside(dataRoot, PHB_FULL_ROW_REVIEW_RELATIVE_PATH),
  );
  const currentReviewEvidence = hashJson(
    reviews.map((row) => ({
      caseId: row.caseId,
      proposedCategory: row.proposedCategory,
      evidenceRowIds: row.evidenceRowIds,
      evidenceFingerprintSha256: row.evidenceFingerprintSha256,
    })),
  );
  if (currentReviewEvidence !== manifest.inputs.rowReviewEvidenceSha256) {
    throw new Error("PHB SRD adjudication row review evidence is stale");
  }
}

function groupByName(rows: SrdShortDescription[]) {
  const result = new Map<string, SrdShortDescription[]>();
  for (const row of rows) {
    const key = normalizeName(row.printedName);
    result.set(key, [...(result.get(key) ?? []), row]);
  }
  return result;
}

function readJsonl<T>(filePath: string): T[] {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function writeJsonl(filePath: string, rows: unknown[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    "utf8",
  );
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function artifact(relativePath: string, filePath: string) {
  return {
    relativePath,
    bytes: fs.statSync(filePath).size,
    sha256: sha256File(filePath),
  };
}

function countBy(values: string[]) {
  return Object.fromEntries(
    Array.from(new Set(values))
      .sort()
      .map((value) => [
        value,
        values.filter((candidate) => candidate === value).length,
      ]),
  );
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
