import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  buildEffectiveEnglishRow,
  PHB_EFFECTIVE_ENGLISH_RELATIVE_PATH,
  type EffectiveEnglishRow,
} from "./effective-english";
import type { FullDbComparisonRow } from "./full-comparison";
import {
  PHB_FULL_ENTITIES_RELATIVE_PATH,
  PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
  type FullSpellEntity,
} from "./full-extraction";
import type { FullListOccurrence } from "./full-lists";
import {
  PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
  PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH,
  PHB_FULL_ROW_REVIEW_RELATIVE_PATH,
  runFullComparison,
} from "./full-pipeline";
import type { FullRowReview } from "./full-row-review";
import type { PilotErrataOverlayRow } from "./pilot-errata";
import {
  normalizeName,
  PHB_SRD_EXTRACTION_MANIFEST_RELATIVE_PATH,
  PHB_SRD_ISSUES_RELATIVE_PATH,
  PHB_SRD_SPELLS_RELATIVE_PATH,
  type SrdSpellEntity,
} from "./srd-extraction";
import { readAndVerifySrdSourceManifest } from "./srd-source";
import {
  currentPhbAuthorityPolicyReference,
  PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH,
} from "./source-authority";
import {
  committedFileCommit,
  resolveInside,
  sha256File,
} from "./source-manifest";

export const PHB_SRD_ALIASES_RELATIVE_PATH =
  "phb35/review/srd-name-aliases.jsonl";
export const PHB_SRD_ADJUDICATION_RELATIVE_PATH =
  "phb35/review/srd-adjudication.jsonl";
export { PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH };

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
  | "srd-authoritative"
  | "phb-authoritative"
  | "phb-fallback"
  | "srd-missing-spell"
  | "unresolved";

export type SrdAdjudicationRow = {
  schemaVersion: 2;
  caseId: string;
  printedName: string;
  srdPrintedName: string | null;
  aliasId: string | null;
  comparisonCategory: FullDbComparisonRow["category"];
  status: "terminal-candidate" | "exception";
  rule: "field-resolved-effective-row" | "residual-exception";
  componentEvidence: Array<{
    component: string;
    originalCategory:
      "exact-match" | "formatting-only" | "substantive-mismatch";
    disposition: SrdComponentDisposition;
    effectiveAuthority: EffectiveEnglishRow["bodyText"]["authority"];
    srdValues: string[];
  }>;
  unresolvedReasons: string[];
  effectiveRowFingerprintSha256: string;
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
  const phbSpellsPath = resolveInside(
    dataRoot,
    PHB_FULL_ENTITIES_RELATIVE_PATH,
  );
  const errataPath = resolveInside(
    dataRoot,
    PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH,
  );
  const listOccurrencesPath = resolveInside(
    dataRoot,
    PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
  );
  const spellsPath = resolveInside(dataRoot, PHB_SRD_SPELLS_RELATIVE_PATH);
  const issuesPath = resolveInside(dataRoot, PHB_SRD_ISSUES_RELATIVE_PATH);
  const aliasesPath = resolveInside(dataRoot, PHB_SRD_ALIASES_RELATIVE_PATH);
  const comparisons = readJsonl<FullDbComparisonRow>(comparisonsPath);
  const reviews = readJsonl<FullRowReview>(reviewsPath);
  const phbSpells = readJsonl<FullSpellEntity>(phbSpellsPath);
  const errata = readJsonl<PilotErrataOverlayRow & { rowId: string }>(
    errataPath,
  );
  const listOccurrences = readJsonl<FullListOccurrence>(listOccurrencesPath);
  const spells = readJsonl<SrdSpellEntity>(spellsPath);
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
  const phbByCase = uniqueBy(phbSpells, (row) => row.rowId, "PHB spell");
  const errataByCase = uniqueBy(errata, (row) => row.caseId, "errata overlay");
  const occurrencesByName = groupOccurrencesByName(listOccurrences);
  if (
    comparisons.length !== 605 ||
    reviews.length !== 605 ||
    phbSpells.length !== 605 ||
    spells.length !== 605
  ) {
    throw new Error(
      `PHB effective English set is incomplete: comparison=${comparisons.length}, review=${reviews.length}, PHB=${phbSpells.length}, SRD=${spells.length}`,
    );
  }
  const effectiveRows = comparisons.map((comparison) => {
    const phb = phbByCase.get(comparison.caseId);
    const overlay = errataByCase.get(comparison.caseId);
    const alias =
      aliasesByPhb.get(normalizeName(comparison.printedName)) ?? null;
    const srdName = alias?.srdName ?? comparison.printedName;
    const srd = spellByName.get(normalizeName(srdName)) ?? null;
    if (!phb || !overlay) {
      throw new Error(
        `PHB effective English evidence is incomplete: ${comparison.caseId}`,
      );
    }
    return buildEffectiveEnglishRow({
      phb,
      errata: overlay,
      srd,
      alias,
      shortDescriptions:
        occurrencesByName.get(normalizeName(comparison.printedName)) ?? [],
      sourceEvidence: comparison.sourceEvidence,
      sourceEvidenceReasons: comparison.reviewFlags
        .filter((flag) => flag.startsWith("uncertain:shared-summon-table"))
        .map((flag) => `source-evidence:${flag}`),
    });
  });
  const effectivePath = resolveInside(
    dataRoot,
    PHB_EFFECTIVE_ENGLISH_RELATIVE_PATH,
  );
  writeJsonl(effectivePath, effectiveRows);
  const effectiveByCase = new Map(
    effectiveRows.map((row) => [row.caseId, row]),
  );
  const rows = comparisons.map((comparison) => {
    const review = reviewByCase.get(comparison.caseId);
    const effective = effectiveByCase.get(comparison.caseId);
    if (!review || !effective) {
      throw new Error(
        `PHB adjudication evidence is incomplete: ${comparison.caseId}`,
      );
    }
    return adjudicateComparison({ comparison, review, effective });
  });

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
    inputProposedRows: reviews.filter((review) => review.status === "proposed")
      .length,
    inputPriorTerminalRows: reviews.filter(
      (review) => review.reviewer === "data-tools:srd-adjudication",
    ).length,
    effectiveRows: effectiveRows.length,
    effectiveResolved: effectiveRows.filter(
      (row) => row.resolutionStatus === "resolved",
    ).length,
    effectiveExceptions: effectiveRows.filter(
      (row) => row.resolutionStatus === "exception",
    ).length,
    authoritySelections: countBy(
      effectiveRows.flatMap((row) => [
        row.effectiveName.authority,
        row.school.authority,
        row.bodyText.authority,
        ...Object.values(row.fields).map((field) => field.authority),
      ]),
    ),
    authorityRules: countBy(
      effectiveRows.flatMap((row) => [
        row.effectiveName.rule,
        row.school.rule,
        row.bodyText.rule,
        ...Object.values(row.fields).map((field) => field.rule),
      ]),
    ),
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
    schemaVersion: 2,
    inputs: {
      authorityPolicy: currentPhbAuthorityPolicyReference(),
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
      phbSpells: artifact(PHB_FULL_ENTITIES_RELATIVE_PATH, phbSpellsPath),
      errata: artifact(PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH, errataPath),
      listOccurrences: artifact(
        PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
        listOccurrencesPath,
      ),
    },
    outputs: {
      adjudication: artifact(PHB_SRD_ADJUDICATION_RELATIVE_PATH, outputPath),
      effectiveEnglish: artifact(
        PHB_EFFECTIVE_ENGLISH_RELATIVE_PATH,
        effectivePath,
      ),
    },
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
  const effectivePath = resolveInside(
    dataRoot,
    PHB_EFFECTIVE_ENGLISH_RELATIVE_PATH,
  );
  verifyAdjudicationManifest(dataRoot, manifestPath);
  committedFileCommit(dataRoot, manifestPath);
  committedFileCommit(dataRoot, adjudicationPath);
  committedFileCommit(dataRoot, effectivePath);
  const adjudications = readJsonl<SrdAdjudicationRow>(adjudicationPath);
  const accepted = new Map(
    adjudications
      .filter((row) => row.status === "terminal-candidate")
      .map((row) => [row.caseId, row]),
  );
  const exceptions = new Set(
    adjudications
      .filter((row) => row.status === "exception")
      .map((row) => row.caseId),
  );
  const reviewsPath = resolveInside(
    dataRoot,
    PHB_FULL_ROW_REVIEW_RELATIVE_PATH,
  );
  let applied = 0;
  let reset = 0;
  const reviews = readJsonl<FullRowReview>(reviewsPath).map((review) => {
    const adjudication = accepted.get(review.caseId);
    if (adjudication) {
      const decisionNote = `Accepted by SRD adjudication ${adjudication.evidenceFingerprintSha256}: ${adjudication.rule}.`;
      if (
        review.status !== "accepted" ||
        review.reviewer !== "data-tools:srd-adjudication" ||
        review.decisionNote !== decisionNote
      ) {
        applied += 1;
      }
      return {
        ...review,
        status: "accepted" as const,
        reviewer: "data-tools:srd-adjudication",
        decisionNote,
      };
    }
    if (
      exceptions.has(review.caseId) &&
      (review.reviewer === "data-tools:auto" ||
        review.reviewer === "data-tools:srd-adjudication")
    ) {
      reset += 1;
      return {
        ...review,
        status: "proposed" as const,
        reviewer: null,
        decisionNote: null,
      };
    }
    return review;
  });
  writeJsonl(reviewsPath, reviews);
  runFullComparison();
  runSrdAdjudication(dataRoot);
  return {
    accepted: applied,
    reset,
    remaining: reviews.filter((row) => row.status === "proposed").length,
  };
}

export function verifySrdAdjudicationArtifacts(dataRoot: string) {
  const manifestPath = resolveInside(
    dataRoot,
    PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH,
  );
  verifyAdjudicationManifest(dataRoot, manifestPath);
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
  effective: EffectiveEnglishRow;
}): SrdAdjudicationRow {
  const componentEvidence = input.comparison.components.map((component) => {
    const selection = selectionForComponent(
      component.component,
      input.effective,
    );
    return {
      component: component.component,
      originalCategory: component.category,
      disposition: selection.disposition,
      effectiveAuthority: selection.authority,
      srdValues:
        selection.authority === "official-srd-3.5" ? selection.values : [],
    };
  });
  const unresolvedReasons = [...input.effective.unresolvedReasons];
  const status =
    unresolvedReasons.length === 0 ? "terminal-candidate" : "exception";
  const evidenceRowIds = Array.from(
    new Set([
      ...input.review.evidenceRowIds,
      ...input.effective.evidenceRowIds,
    ]),
  ).sort();
  const fingerprintInput = {
    comparison: input.comparison,
    reviewFingerprintSha256: input.review.evidenceFingerprintSha256,
    effectiveRowFingerprintSha256: input.effective.evidenceFingerprintSha256,
    componentEvidence,
    unresolvedReasons,
  };
  return {
    schemaVersion: 2,
    caseId: input.comparison.caseId,
    printedName: input.comparison.printedName,
    srdPrintedName: input.effective.srdPrintedName,
    aliasId:
      input.effective.aliases.length > 0
        ? (input.effective.aliases[0]!.evidenceRowIds.find((id) =>
            id.startsWith("srd-alias:"),
          ) ?? null)
        : null,
    comparisonCategory: input.comparison.category,
    status,
    rule:
      status === "terminal-candidate"
        ? "field-resolved-effective-row"
        : "residual-exception",
    componentEvidence,
    unresolvedReasons,
    effectiveRowFingerprintSha256: input.effective.evidenceFingerprintSha256,
    evidenceRowIds,
    evidenceFingerprintSha256: hashJson(fingerprintInput),
  };
}

function selectionForComponent(
  component: string,
  row: EffectiveEnglishRow,
): {
  disposition: SrdComponentDisposition;
  authority: EffectiveEnglishRow["bodyText"]["authority"];
  values: string[];
} {
  if (component === "name") {
    return selection(
      row.effectiveName,
      row.aliases.length > 0 ? "alias-backed" : undefined,
    );
  }
  if (
    component === "page" ||
    component === "summonTable" ||
    component.startsWith("shortDescription:")
  ) {
    return {
      disposition: "phb-authoritative",
      authority: "phb-3.5-plus-accepted-errata",
      values: [],
    };
  }
  if (component === "school") return selection(row.school);
  if (component === "body") return selection(row.bodyText);
  if (component === "targetEffectArea") {
    const targetFields = [
      "target",
      "targetOrArea",
      "targetEffectOrArea",
      "targetEffect",
      "areaOrTarget",
      "effect",
      "area",
    ].flatMap((name) => (row.fields[name] ? [row.fields[name]!] : []));
    if (targetFields.length === 0) {
      return {
        disposition: "unresolved",
        authority: "phb-3.5-plus-accepted-errata",
        values: [],
      };
    }
    return selection(
      targetFields[0]!,
      undefined,
      targetFields.map((field) => field.value),
    );
  }
  const field = row.fields[component];
  if (field) return selection(field);
  return {
    disposition: row.srdPrintedName ? "unresolved" : "srd-missing-spell",
    authority: "phb-3.5-plus-accepted-errata",
    values: [],
  };
}

function selection(
  value: EffectiveEnglishRow["bodyText"],
  override?: SrdComponentDisposition,
  values: string[] = [value.value],
) {
  return {
    disposition:
      override ??
      (value.authority === "official-srd-3.5"
        ? ("srd-authoritative" as const)
        : value.rule === "srd-omission"
          ? ("phb-fallback" as const)
          : ("phb-authoritative" as const)),
    authority: value.authority,
    values,
  };
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
    schemaVersion: number;
    inputs: {
      authorityPolicy: { revision: string; sha256: string };
      extractionManifest: { relativePath: string; sha256: string };
      comparisons: { relativePath: string; sha256: string };
      aliases: { relativePath: string; sha256: string };
      phbSpells: { relativePath: string; sha256: string };
      errata: { relativePath: string; sha256: string };
      listOccurrences: { relativePath: string; sha256: string };
      rowReviewEvidenceSha256: string;
    };
    outputs: {
      adjudication: { relativePath: string; sha256: string };
      effectiveEnglish: { relativePath: string; sha256: string };
    };
  };
  if (manifest.schemaVersion !== 2) {
    throw new Error("PHB SRD adjudication manifest schema is stale");
  }
  const expectedPolicy = currentPhbAuthorityPolicyReference();
  if (
    manifest.inputs.authorityPolicy?.revision !== expectedPolicy.revision ||
    manifest.inputs.authorityPolicy.sha256 !== expectedPolicy.sha256
  ) {
    throw new Error("PHB SRD adjudication authority policy is stale");
  }
  for (const artifactValue of [
    manifest.inputs.extractionManifest,
    manifest.inputs.comparisons,
    manifest.inputs.aliases,
    manifest.inputs.phbSpells,
    manifest.inputs.errata,
    manifest.inputs.listOccurrences,
    manifest.outputs.adjudication,
    manifest.outputs.effectiveEnglish,
  ]) {
    if (!artifactValue?.relativePath || !artifactValue.sha256) {
      throw new Error("PHB SRD adjudication manifest is incomplete");
    }
    const filePath = resolveInside(dataRoot, artifactValue.relativePath);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `PHB SRD adjudication artifact is missing: ${artifactValue.relativePath}`,
      );
    }
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
  const effectiveRows = readJsonl<EffectiveEnglishRow>(
    resolveInside(dataRoot, PHB_EFFECTIVE_ENGLISH_RELATIVE_PATH),
  );
  const adjudications = readJsonl<SrdAdjudicationRow>(
    resolveInside(dataRoot, PHB_SRD_ADJUDICATION_RELATIVE_PATH),
  );
  if (
    effectiveRows.length === 0 ||
    effectiveRows.length !== adjudications.length
  ) {
    throw new Error(
      `PHB effective English outputs are incomplete: effective=${effectiveRows.length}, adjudication=${adjudications.length}`,
    );
  }
  const effectiveByCase = uniqueBy(
    effectiveRows,
    (row) => row.caseId,
    "effective English row",
  );
  for (const adjudication of adjudications) {
    const effective = effectiveByCase.get(adjudication.caseId);
    if (
      adjudication.schemaVersion !== 2 ||
      !effective ||
      effective.authorityPolicy.revision !== expectedPolicy.revision ||
      effective.authorityPolicy.sha256 !== expectedPolicy.sha256 ||
      adjudication.effectiveRowFingerprintSha256 !==
        effective.evidenceFingerprintSha256
    ) {
      throw new Error(
        `PHB SRD adjudication effective row is stale: ${adjudication.caseId}`,
      );
    }
  }
}

function groupOccurrencesByName(rows: FullListOccurrence[]) {
  const result = new Map<string, FullListOccurrence[]>();
  for (const row of rows) {
    const key = normalizeName(row.printedName);
    result.set(key, [...(result.get(key) ?? []), row]);
  }
  return result;
}

function uniqueBy<T>(rows: T[], key: (row: T) => string, label: string) {
  const result = new Map<string, T>();
  for (const row of rows) {
    const value = key(row);
    if (result.has(value)) throw new Error(`${label} is duplicated: ${value}`);
    result.set(value, row);
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
