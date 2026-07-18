import crypto from "node:crypto";

import type { RulesContentArtifactMetadata } from "./artifact";
import {
  normalizeMechanicValue,
  type MechanicDisplayCoverage,
  type MechanicType,
} from "./mechanics";

export const RULES_CONTENT_GENERATOR_VERSION = "rules-content-normalizer-v8";

export type LegacyRulebookRow = {
  id: number;
  dndEditionId: number;
  name: string;
  abbr: string;
  slug: string;
  description?: string | null;
  editionSlug?: string | null;
  editionCore?: boolean | number | null;
  year?: string | null;
  published?: string | null;
  officialUrl?: string | null;
  image?: string | null;
  displayName?: string | null;
  displayAbbr?: string | null;
  publicationCategory: string;
  publicationFamily: string;
  publicationSourceKind: string;
  publicationDisplayOrder: number;
  publicationYear: string | null;
  publicationDate: string | null;
  publicationUrl: string | null;
  publicationImage: string | null;
  publicationReviewStatus: string;
};

export type LegacySpellRow = {
  id: number;
  added: string;
  rulebookId: number;
  page?: number | null;
  name: string;
  slug: string;
  schoolId: number;
  schoolName: string;
  schoolSlug: string;
  subSchoolId?: number | null;
  subSchoolName?: string | null;
  subSchoolSlug?: string | null;
  verbalComponent: boolean;
  somaticComponent: boolean;
  materialComponent: boolean;
  arcaneFocusComponent: boolean;
  divineFocusComponent: boolean;
  xpComponent: boolean;
  metaBreathComponent: boolean;
  trueNameComponent: boolean;
  corruptComponent: boolean;
  corruptLevel?: number | null;
  extraComponents?: string | null;
  castingTime?: string | null;
  range?: string | null;
  target?: string | null;
  effect?: string | null;
  area?: string | null;
  duration?: string | null;
  savingThrow?: string | null;
  spellResistance?: string | null;
  description: string;
  descriptionHtml?: string | null;
  verified: boolean;
  verifiedAuthorId?: number | null;
  verifiedTime?: string | null;
};

export type LegacyDescriptorRow = {
  spellId: number;
  descriptorId: number;
  name: string;
  slug: string;
};

export type LegacyListEntryRow = {
  id: number;
  spellId: number;
  listType: "class" | "domain";
  ownerId: number;
  ownerName: string;
  ownerSlug: string;
  ownerPrestige?: boolean | null;
  level: number;
  rulebookId?: number | null;
  extra?: string | null;
  sourceTable: string;
};

export type LegacyRulesContentInput = {
  rulebooks: LegacyRulebookRow[];
  spells: LegacySpellRow[];
  descriptors: LegacyDescriptorRow[];
  listEntries: LegacyListEntryRow[];
};

export type NormalizedRulesContent = {
  schemaVersion: 2;
  generatorVersion: string;
  generatedAt: string;
  artifact: RulesContentArtifactMetadata | null;
  counts: Record<string, number>;
  rulebooks: NormalizedRulebookRow[];
  spells: NormalizedSpellRow[];
  appearances: NormalizedSpellAppearanceRow[];
  taxonomyFacets: NormalizedSpellTaxonomyFacetRow[];
  listEntries: NormalizedSpellListEntryRow[];
  components: NormalizedSpellComponentRow[];
  mechanicFacets: NormalizedSpellMechanicFacetRow[];
  issues: NormalizedRulesContentIssueRow[];
};

export type NormalizedRulebookRow = {
  id: string;
  legacyRulebookId: number;
  editionId: number;
  name: string;
  abbr: string;
  slug: string;
  displayName: string | null;
  displayAbbr: string | null;
  publicationCategory: string;
  publicationFamily: string;
  publicationSourceKind: string;
  publicationDisplayOrder: number;
  publicationYear: string | null;
  publicationDate: string | null;
  publicationUrl: string | null;
  publicationImage: string | null;
  publicationReviewStatus: string;
  rawJson: string;
};

export type NormalizedSpellRow = {
  id: string;
  legacySpellId: number;
  canonicalName: string;
  slug: string;
  sourceRulebookId: number;
  sourcePage: number | null;
  schoolRaw: string | null;
  subschoolRaw: string | null;
  castingTimeRaw: string | null;
  rangeRaw: string | null;
  targetRaw: string | null;
  effectRaw: string | null;
  areaRaw: string | null;
  durationRaw: string | null;
  savingThrowRaw: string | null;
  resistanceRaw: string | null;
  componentsRaw: string | null;
  corruptLevel: number | null;
  descriptionText: string;
  descriptionHtml: string | null;
  descriptionHash: string;
  addedAt: string;
  verified: boolean;
  verifiedAuthorId: number | null;
  verifiedTime: string | null;
  rawJson: string;
};

export type NormalizedSpellAppearanceRow = {
  id: string;
  spellId: string;
  legacySpellId: number;
  rulebookId: number;
  page: number | null;
  printedName: string;
  sourceSlug: string;
  sourceKey: string;
  sourceNote: string | null;
};

export type NormalizedSpellTaxonomyFacetRow = {
  id: string;
  spellId: string;
  facetType: "school" | "subschool" | "descriptor";
  facetKey: string;
  legacyFacetId: number | null;
  name: string;
  slug: string | null;
  sortOrder: number;
  rawText: string | null;
  sourceField: string;
  reviewStatus: "accepted" | "review";
  issueCode: string | null;
};

export type NormalizedSpellListEntryRow = {
  id: string;
  spellId: string;
  listType: "class" | "domain";
  ownerLegacyId: number;
  ownerName: string;
  ownerSlug: string;
  ownerPrestige: boolean | null;
  level: number;
  rulebookId: number | null;
  rawExtra: string | null;
  variantLabel: string | null;
  note: string | null;
  sourceRowId: number;
  sourceTable: string;
  reviewStatus: "accepted" | "review";
  issueCode: string | null;
};

export type NormalizedSpellComponentRow = {
  id: string;
  spellId: string;
  componentType: string;
  present: boolean;
  rawText: string | null;
  detailText: string | null;
  sourceField: string;
  reviewStatus: "accepted" | "review";
  issueCode: string | null;
};

export type NormalizedSpellMechanicFacetRow = {
  id: string;
  spellId: string;
  mechanicType: MechanicType;
  rawText: string | null;
  category: string;
  amount: number | null;
  unit: string | null;
  flagsJson: string;
  normalizedText: string | null;
  displayCoverage: MechanicDisplayCoverage;
  sourceField: string;
  reviewStatus: "accepted" | "review";
  issueCode: string | null;
};

export type NormalizedRulesContentIssueRow = {
  id: string;
  spellId: string | null;
  sourceTable: string;
  sourceField: string;
  rawText: string | null;
  issueCode: string;
  severity: "info" | "warning";
  detail: string | null;
};

const COMPONENTS: Array<{
  type: string;
  field: keyof LegacySpellRow;
}> = [
  { type: "verbal", field: "verbalComponent" },
  { type: "somatic", field: "somaticComponent" },
  { type: "material", field: "materialComponent" },
  { type: "arcane_focus", field: "arcaneFocusComponent" },
  { type: "divine_focus", field: "divineFocusComponent" },
  { type: "xp", field: "xpComponent" },
  { type: "metabreath", field: "metaBreathComponent" },
  { type: "truename", field: "trueNameComponent" },
  { type: "corrupt", field: "corruptComponent" },
];

const COMBINED_SCHOOL_FACETS: Record<
  string,
  Array<{ id: number; name: string; slug: string }>
> = {
  "Conjuration/Evocation": [
    { id: 2, name: "Conjuration", slug: "conjuration" },
    { id: 5, name: "Evocation", slug: "evocation" },
  ],
  "Transmutation/Evocation": [
    { id: 7, name: "Transmutation", slug: "transmutation" },
    { id: 5, name: "Evocation", slug: "evocation" },
  ],
  "Conjuration/Necromancy": [
    { id: 2, name: "Conjuration", slug: "conjuration" },
    { id: 6, name: "Necromancy", slug: "necromancy" },
  ],
  "Divination/Evocation": [
    { id: 3, name: "Divination", slug: "divination" },
    { id: 5, name: "Evocation", slug: "evocation" },
  ],
  "Evocation/Transmutation": [
    { id: 5, name: "Evocation", slug: "evocation" },
    { id: 7, name: "Transmutation", slug: "transmutation" },
  ],
  "Transmutation/Divination": [
    { id: 7, name: "Transmutation", slug: "transmutation" },
    { id: 3, name: "Divination", slug: "divination" },
  ],
  "Abjuration/Evocation": [
    { id: 1, name: "Abjuration", slug: "abjuration" },
    { id: 5, name: "Evocation", slug: "evocation" },
  ],
};

const COMBINED_SUBSCHOOL_FACETS: Record<
  string,
  Array<{ id: number; name: string; slug: string }>
> = {
  "Creation or Calling": [
    { id: 2, name: "Creation", slug: "creation" },
    { id: 3, name: "Calling", slug: "calling" },
  ],
  "Figment and Glamer": [
    { id: 12, name: "Figment", slug: "figment" },
    { id: 7, name: "Glamer", slug: "glamer" },
  ],
};

const OTHER_DESCRIPTOR_FACET = {
  id: null,
  name: "See text",
  slug: "see-text",
};

export function normalizeRulesContent(
  input: LegacyRulesContentInput,
  generatedAt = new Date().toISOString(),
): NormalizedRulesContent {
  const issues: NormalizedRulesContentIssueRow[] = [];
  const descriptorsBySpell = groupBy(input.descriptors, (row) => row.spellId);
  const listEntriesBySpell = groupBy(input.listEntries, (row) => row.spellId);

  const rulebooks = input.rulebooks.map((row): NormalizedRulebookRow => ({
    id: `rulebook:${row.id}`,
    legacyRulebookId: row.id,
    editionId: row.dndEditionId,
    name: row.name,
    abbr: row.abbr,
    slug: row.slug,
    displayName: clean(row.displayName),
    displayAbbr: clean(row.displayAbbr),
    publicationCategory: row.publicationCategory,
    publicationFamily: row.publicationFamily,
    publicationSourceKind: row.publicationSourceKind,
    publicationDisplayOrder: row.publicationDisplayOrder,
    publicationYear: row.publicationYear,
    publicationDate: row.publicationDate,
    publicationUrl: row.publicationUrl,
    publicationImage: row.publicationImage,
    publicationReviewStatus: row.publicationReviewStatus,
    rawJson: stableJson(row),
  }));

  const spells: NormalizedSpellRow[] = [];
  const appearances: NormalizedSpellAppearanceRow[] = [];
  const taxonomyFacets: NormalizedSpellTaxonomyFacetRow[] = [];
  const listEntries: NormalizedSpellListEntryRow[] = [];
  const components: NormalizedSpellComponentRow[] = [];
  const mechanicFacets: NormalizedSpellMechanicFacetRow[] = [];

  for (const spell of input.spells) {
    const spellId = `spell:${spell.id}`;
    const normalizedSpell: NormalizedSpellRow = {
      id: spellId,
      legacySpellId: spell.id,
      canonicalName: spell.name,
      slug: spell.slug,
      sourceRulebookId: spell.rulebookId,
      sourcePage: spell.page ?? null,
      schoolRaw: spell.schoolName,
      subschoolRaw: clean(spell.subSchoolName),
      castingTimeRaw: clean(spell.castingTime),
      rangeRaw: clean(spell.range),
      targetRaw: clean(spell.target),
      effectRaw: clean(spell.effect),
      areaRaw: clean(spell.area),
      durationRaw: clean(spell.duration),
      savingThrowRaw: clean(spell.savingThrow),
      resistanceRaw: clean(spell.spellResistance),
      componentsRaw: clean(spell.extraComponents),
      corruptLevel: spell.corruptLevel ?? null,
      descriptionText: spell.description,
      descriptionHtml: spell.descriptionHtml ?? null,
      descriptionHash: sha256(spell.descriptionHtml ?? spell.description),
      addedAt: spell.added,
      verified: spell.verified,
      verifiedAuthorId: spell.verifiedAuthorId ?? null,
      verifiedTime: spell.verifiedTime ?? null,
      rawJson: stableJson(spell),
    };
    spells.push(normalizedSpell);

    appearances.push({
      id: `${spellId}:appearance:${spell.rulebookId}`,
      spellId,
      legacySpellId: spell.id,
      rulebookId: spell.rulebookId,
      page: spell.page ?? null,
      printedName: spell.name,
      sourceSlug: spell.slug,
      sourceKey: `rules-clean:dnd_spell:${spell.id}`,
      sourceNote: null,
    });

    for (const [index, school] of schoolTaxonomyFacets(spell).entries()) {
      taxonomyFacets.push({
        id: `${spellId}:taxonomy:school:${school.id}:${index}`,
        spellId,
        facetType: "school",
        facetKey: school.slug,
        legacyFacetId: school.id,
        name: school.name,
        slug: school.slug,
        sortOrder: index,
        rawText: spell.schoolName,
        sourceField: "school_id",
        reviewStatus: "accepted",
        issueCode: null,
      });
    }

    if (spell.subSchoolId && spell.subSchoolName) {
      for (const [index, subschool] of subSchoolTaxonomyFacets(
        spell,
      ).entries()) {
        taxonomyFacets.push({
          id: `${spellId}:taxonomy:subschool:${subschool.id}:${index}`,
          spellId,
          facetType: "subschool",
          facetKey: subschool.slug,
          legacyFacetId: subschool.id,
          name: subschool.name,
          slug: subschool.slug,
          sortOrder: index,
          rawText: spell.subSchoolName,
          sourceField: "sub_school_id",
          reviewStatus: "accepted",
          issueCode: null,
        });
      }
    }

    for (const [index, descriptor] of (
      descriptorsBySpell.get(spell.id) ?? []
    ).entries()) {
      const descriptorFacet = descriptorTaxonomyFacet(descriptor);
      taxonomyFacets.push({
        id: `${spellId}:taxonomy:descriptor:${descriptorFacet.slug}:${index}`,
        spellId,
        facetType: "descriptor",
        facetKey: descriptorFacet.slug,
        legacyFacetId: descriptorFacet.id,
        name: descriptorFacet.name,
        slug: descriptorFacet.slug,
        sortOrder: index,
        rawText: descriptor.name,
        sourceField: "dnd_spell_descriptors",
        reviewStatus: "accepted",
        issueCode: null,
      });
    }

    for (const entry of listEntriesBySpell.get(spell.id) ?? []) {
      const extra = normalizeListExtra(entry.extra);
      listEntries.push({
        id: `${spellId}:list:${entry.listType}:${entry.ownerId}:${entry.level}:${entry.rulebookId ?? "none"}:${entry.id}`,
        spellId,
        listType: entry.listType,
        ownerLegacyId: entry.ownerId,
        ownerName: entry.ownerName,
        ownerSlug: entry.ownerSlug,
        ownerPrestige: entry.ownerPrestige ?? null,
        level: entry.level,
        rulebookId: entry.rulebookId ?? null,
        rawExtra: clean(entry.extra),
        variantLabel: extra.variantLabel,
        note: extra.note,
        sourceRowId: entry.id,
        sourceTable: entry.sourceTable,
        reviewStatus: extra.issueCode ? "review" : "accepted",
        issueCode: extra.issueCode,
      });
      if (extra.issueCode) {
        issues.push(
          issue(
            spellId,
            entry.sourceTable,
            "extra",
            entry.extra,
            extra.issueCode,
            "warning",
            "List-entry extra text needs review before it becomes a filter.",
          ),
        );
      }
    }

    for (const component of COMPONENTS) {
      const present = Boolean(spell[component.field]);
      components.push({
        id: `${spellId}:component:${component.type}`,
        spellId,
        componentType: component.type,
        present,
        rawText: null,
        detailText: null,
        sourceField: String(component.field),
        reviewStatus: "accepted",
        issueCode: null,
      });
    }

    const extraComponents = clean(spell.extraComponents);
    if (extraComponents) {
      const issueCode = hasComplexText(extraComponents)
        ? "component.extra.review"
        : null;
      components.push({
        id: `${spellId}:component:extra`,
        spellId,
        componentType: "other",
        present: true,
        rawText: extraComponents,
        detailText: extraComponents,
        sourceField: "extra_components",
        reviewStatus: issueCode ? "review" : "accepted",
        issueCode,
      });
      if (issueCode) {
        issues.push(
          issue(
            spellId,
            "dnd_spell",
            "extra_components",
            extraComponents,
            issueCode,
            "warning",
            "Extra component text is preserved but not structurally parsed.",
          ),
        );
      }
    }

    addMechanicFacet(
      mechanicFacets,
      issues,
      spellId,
      "casting_time",
      "casting_time",
      spell.castingTime,
    );
    addMechanicFacet(
      mechanicFacets,
      issues,
      spellId,
      "range",
      "range",
      spell.range,
    );
    addMechanicFacet(
      mechanicFacets,
      issues,
      spellId,
      "target",
      "target",
      spell.target,
    );
    addMechanicFacet(
      mechanicFacets,
      issues,
      spellId,
      "effect",
      "effect",
      spell.effect,
    );
    addMechanicFacet(
      mechanicFacets,
      issues,
      spellId,
      "area",
      "area",
      spell.area,
    );
    addMechanicFacet(
      mechanicFacets,
      issues,
      spellId,
      "duration",
      "duration",
      spell.duration,
    );
    addMechanicFacet(
      mechanicFacets,
      issues,
      spellId,
      "saving_throw",
      "saving_throw",
      spell.savingThrow,
    );
    addMechanicFacet(
      mechanicFacets,
      issues,
      spellId,
      "spell_resistance",
      "spell_resistance",
      spell.spellResistance,
    );
  }

  return {
    schemaVersion: 2,
    generatorVersion: RULES_CONTENT_GENERATOR_VERSION,
    generatedAt,
    artifact: null,
    counts: {
      rulebooks: rulebooks.length,
      spells: spells.length,
      appearances: appearances.length,
      taxonomyFacets: taxonomyFacets.length,
      listEntries: listEntries.length,
      components: components.length,
      mechanicFacets: mechanicFacets.length,
      issues: issues.length,
    },
    rulebooks,
    spells,
    appearances,
    taxonomyFacets,
    listEntries,
    components,
    mechanicFacets,
    issues,
  };
}

export function auditNormalizedContent(content: NormalizedRulesContent) {
  const issueCounts = countBy(content.issues, (row) => row.issueCode);
  const reviewCounts = {
    taxonomyFacets: countRows(content.taxonomyFacets, "reviewStatus", "review"),
    listEntries: countRows(content.listEntries, "reviewStatus", "review"),
    components: countRows(content.components, "reviewStatus", "review"),
    mechanicFacets: countRows(content.mechanicFacets, "reviewStatus", "review"),
  };
  const mechanicCategories = countBy(
    content.mechanicFacets,
    (row) => `${row.mechanicType}:${row.category}`,
  );
  const mechanicDisplayCoverage = countBy(
    content.mechanicFacets,
    (row) => row.displayCoverage,
  );
  const mechanicDisplayCoverageByType = countBy(
    content.mechanicFacets,
    (row) => `${row.mechanicType}:${row.displayCoverage}`,
  );
  const listExtras = countBy(
    content.listEntries.filter((row) => row.rawExtra),
    (row) => row.rawExtra ?? "",
  );

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generatorVersion: content.generatorVersion,
    counts: content.counts,
    issueCounts,
    reviewCounts,
    mechanicCategories,
    mechanicDisplayCoverage,
    mechanicDisplayCoverageByType,
    dirtyListExtras: listExtras,
    issueSamples: content.issues.slice(0, 100),
  };
}

function schoolTaxonomyFacets(spell: LegacySpellRow) {
  return (
    COMBINED_SCHOOL_FACETS[spell.schoolName] ?? [
      { id: spell.schoolId, name: spell.schoolName, slug: spell.schoolSlug },
    ]
  );
}

function subSchoolTaxonomyFacets(spell: LegacySpellRow) {
  if (!spell.subSchoolId || !spell.subSchoolName) return [];
  return (
    COMBINED_SUBSCHOOL_FACETS[spell.subSchoolName] ?? [
      {
        id: spell.subSchoolId,
        name: spell.subSchoolName,
        slug: spell.subSchoolSlug ?? slugify(spell.subSchoolName),
      },
    ]
  );
}

function descriptorTaxonomyFacet(descriptor: LegacyDescriptorRow) {
  if (isOtherDescriptor(descriptor)) return OTHER_DESCRIPTOR_FACET;
  return {
    id: descriptor.descriptorId,
    name: descriptor.name,
    slug: descriptor.slug,
  };
}

function isOtherDescriptor(descriptor: LegacyDescriptorRow) {
  return /^see[\s-]+text\b/i.test(descriptor.name);
}

function addMechanicFacet(
  mechanicFacets: NormalizedSpellMechanicFacetRow[],
  issues: NormalizedRulesContentIssueRow[],
  spellId: string,
  mechanicType: NormalizedSpellMechanicFacetRow["mechanicType"],
  sourceField: string,
  raw: string | null | undefined,
) {
  const rawText = clean(raw);
  const parsed = normalizeMechanicValue(mechanicType, rawText);
  mechanicFacets.push({
    id: `${spellId}:mechanic:${mechanicType}`,
    spellId,
    mechanicType,
    rawText,
    category: parsed.category,
    amount: parsed.amount,
    unit: parsed.unit,
    flagsJson: stableJson(parsed.flags),
    normalizedText: parsed.normalizedText,
    displayCoverage: parsed.displayCoverage,
    sourceField,
    reviewStatus: parsed.issueCode ? "review" : "accepted",
    issueCode: parsed.issueCode,
  });
  if (parsed.issueCode) {
    issues.push(
      issue(
        spellId,
        "dnd_spell",
        sourceField,
        rawText,
        parsed.issueCode,
        "warning",
        "Mechanics text is preserved but needs normalization review.",
      ),
    );
  }
}

function normalizeListExtra(raw: string | null | undefined) {
  const text = clean(raw);
  if (!text) {
    return { variantLabel: null, note: null, issueCode: null };
  }
  if (/^\(([^)]+)\)$/.test(text)) {
    return {
      variantLabel: text.slice(1, -1).trim(),
      note: null,
      issueCode: null,
    };
  }
  if (/^(see|except|only|including|as )/i.test(text) || hasComplexText(text)) {
    return {
      variantLabel: null,
      note: text,
      issueCode: "list.extra.review",
    };
  }
  return { variantLabel: text, note: null, issueCode: null };
}

function issue(
  spellId: string | null,
  sourceTable: string,
  sourceField: string,
  rawText: string | null | undefined,
  issueCode: string,
  severity: NormalizedRulesContentIssueRow["severity"],
  detail: string,
): NormalizedRulesContentIssueRow {
  return {
    id: `${spellId ?? "global"}:${sourceTable}:${sourceField}:${issueCode}:${sha256(`${rawText ?? ""}:${detail}`).slice(0, 12)}`,
    spellId,
    sourceTable,
    sourceField,
    rawText: clean(rawText),
    issueCode,
    severity,
    detail,
  };
}

function groupBy<T, K>(rows: T[], key: (row: T) => K) {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const value = key(row);
    const bucket = map.get(value);
    if (bucket) bucket.push(row);
    else map.set(value, [row]);
  }
  return map;
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[key(row)] = (counts[key(row)] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

function countRows<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
  value: unknown,
) {
  return rows.filter((row) => row[key] === value).length;
}

function clean(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}

function stableJson(value: unknown) {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJsonValue(nested)]),
    );
  }
  return value;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasComplexText(value: string) {
  return /[;,]|\bor\b|\band\b|\d+\s*gp|\d+\s*xp/i.test(value);
}
