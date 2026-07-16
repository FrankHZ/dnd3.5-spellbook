import type { I18nSpellOverlay } from "../i18n.js";
import type { Class } from "./class.js";
import type { Domain } from "./domain.js";
import type { RulebookMin } from "./rulebook.js";

export type SpellID = number;

export const SPELL_DESCRIPTOR_BUCKET_KEYS = ["see-text"] as const;

export type SpellDescriptorBucketKey =
  (typeof SPELL_DESCRIPTOR_BUCKET_KEYS)[number];

export type SpellTaxonomyFilterIds = {
  schoolIds: number[];
  subschoolIds: number[];
  descriptorIds: number[];
  descriptorBuckets: SpellDescriptorBucketKey[];
};

export const SPELL_COMPONENT_FILTER_KEYS = [
  "verbal",
  "somatic",
  "material",
  "arcane_focus",
  "divine_focus",
  "xp",
  "metabreath",
  "truename",
  "corrupt",
] as const;

export type SpellComponentFilterKey =
  (typeof SPELL_COMPONENT_FILTER_KEYS)[number];

export type SpellComponentFilters = {
  componentKeys: SpellComponentFilterKey[];
};

export const SPELL_CASTING_TIME_FILTER_KEYS = [
  "immediate_action",
  "swift_action",
  "free_action",
  "standard_action",
  "full_round_action",
  "round",
  "minute",
  "hour",
] as const;

export type SpellCastingTimeFilterKey =
  (typeof SPELL_CASTING_TIME_FILTER_KEYS)[number];

export const SPELL_RANGE_FILTER_KEYS = [
  "personal",
  "touch",
  "close",
  "medium",
  "long",
  "fixed",
  "unlimited",
] as const;

export type SpellRangeFilterKey =
  (typeof SPELL_RANGE_FILTER_KEYS)[number];

export const SPELL_DURATION_FILTER_KEYS = [
  "instantaneous",
  "timed",
  "concentration",
  "permanent",
] as const;

export type SpellDurationFilterKey =
  (typeof SPELL_DURATION_FILTER_KEYS)[number];

export const SPELL_SAVING_THROW_FILTER_KEYS = [
  "none",
  "fortitude",
  "reflex",
  "will",
] as const;

export type SpellSavingThrowFilterKey =
  (typeof SPELL_SAVING_THROW_FILTER_KEYS)[number];

export const SPELL_RESISTANCE_FILTER_KEYS = ["yes", "no"] as const;

export type SpellResistanceFilterKey =
  (typeof SPELL_RESISTANCE_FILTER_KEYS)[number];

export type SpellMechanicFilters = {
  castingTimeKeys: SpellCastingTimeFilterKey[];
  rangeKeys: SpellRangeFilterKey[];
  durationKeys: SpellDurationFilterKey[];
  savingThrowKeys: SpellSavingThrowFilterKey[];
  spellResistanceKeys: SpellResistanceFilterKey[];
};

export type SpellNormalizedFilterScope = SpellTaxonomyFilterIds &
  SpellComponentFilters &
  SpellMechanicFilters;

export const SPELL_SEARCH_MODES = ["name", "full"] as const;

export type SpellSearchMode = (typeof SPELL_SEARCH_MODES)[number];

export type SpellSearchQuery = SpellNormalizedFilterScope & {
  mode: SpellSearchMode;
  q: string;
  rulebookIds: number[];
  classIds: number[];
  domainIds: number[];
  level: number | "all" | null;
  page: number;
  pageSize: number;
};

export type SpellByLevelQuery = SpellNormalizedFilterScope & {
  classIds: number[];
  domainIds: number[];
  level: number | "all";
  rulebookIds: number[];
  page: number;
  pageSize: number;
};

export type SpellItem = {
  id: SpellID;
  slug: string;
  name: string;

  rulebook: RulebookMin;
  page: number | null;

  school: { id: number; name: string; slug: string } | null;
  subSchool: { id: number; name: string; slug: string } | null;
  descriptors: Array<{
    id?: number | undefined;
    key?: SpellDescriptorBucketKey | undefined;
    name: string;
    slug: string;
    rawText?: string | undefined;
    note?: string | undefined;
  }>;
  components: SpellComponents;

  classLevels: Array<ClassLevel>;
  domainLevels: Array<DomainLevel>;

  casting: SpellCasting;

  corrupt?: {
    level?: number | null;
  };
};

export type SpellItemView = SpellItem & {
  i18n?: I18nSpellOverlay | undefined;
};

export type SpellSearchResponse = {
  mode: SpellSearchMode;
  page: number;
  pageSize: number;
  total: number;
  q: string;
  rulebookIds: number[];
  schoolIds: number[];
  subschoolIds: number[];
  descriptorIds: number[];
  descriptorBuckets: SpellDescriptorBucketKey[];
  componentKeys: SpellComponentFilterKey[];
  castingTimeKeys: SpellCastingTimeFilterKey[];
  rangeKeys: SpellRangeFilterKey[];
  durationKeys: SpellDurationFilterKey[];
  savingThrowKeys: SpellSavingThrowFilterKey[];
  spellResistanceKeys: SpellResistanceFilterKey[];
  items: SpellItemView[];
};

export type SpellsByLevelGroup = {
  level: number;
  items: SpellItemView[];
};

export type SpellByLevelResponse = {
  page: number;
  pageSize: number;
  total: number;
  classIds: number[];
  domainIds: number[];
  rulebookIds: number[];
  schoolIds: number[];
  subschoolIds: number[];
  descriptorIds: number[];
  descriptorBuckets: SpellDescriptorBucketKey[];
  componentKeys: SpellComponentFilterKey[];
  castingTimeKeys: SpellCastingTimeFilterKey[];
  rangeKeys: SpellRangeFilterKey[];
  durationKeys: SpellDurationFilterKey[];
  savingThrowKeys: SpellSavingThrowFilterKey[];
  spellResistanceKeys: SpellResistanceFilterKey[];
  groups: SpellsByLevelGroup[];
};

export type SpellComponents = {
  V: boolean;
  S: boolean;
  M: boolean;
  AF: boolean;
  DF: boolean;
  XP: boolean;
  metabreath: boolean;
  truename: boolean;
  corrupt: boolean;
  extra?: string | null;
};

export type SpellCasting = {
  castingTime?: string | null;
  range?: string | null;
  target?: string | null;
  effect?: string | null;
  area?: string | null;
  duration?: string | null;
  savingThrow?: string | null;
  spellResistance?: string | null;
  mechanics?: SpellMechanicDetailMetadata | undefined;
};

export const SPELL_MECHANIC_DISPLAY_COVERAGES = [
  "complete",
  "partial",
  "review",
  "empty",
] as const;

export type SpellMechanicDisplayCoverage =
  (typeof SPELL_MECHANIC_DISPLAY_COVERAGES)[number];

export type SpellMechanicDetailFacet = {
  category: string;
  amount: number | null;
  unit: string | null;
  flags: Record<string, boolean | string>;
  normalizedText: string | null;
  displayCoverage: SpellMechanicDisplayCoverage;
};

export type SpellMechanicDetailMetadata = {
  castingTime?: SpellMechanicDetailFacet | undefined;
  range?: SpellMechanicDetailFacet | undefined;
  target?: SpellMechanicDetailFacet | undefined;
  effect?: SpellMechanicDetailFacet | undefined;
  area?: SpellMechanicDetailFacet | undefined;
  duration?:
    | (SpellMechanicDetailFacet & {
        dismissible?: boolean | undefined;
        discharge?: boolean | undefined;
      })
    | undefined;
  savingThrow?:
    | (SpellMechanicDetailFacet & {
        partial?: boolean | undefined;
        negates?: boolean | undefined;
        harmless?: boolean | undefined;
        object?: boolean | undefined;
      })
    | undefined;
  spellResistance?:
    | (SpellMechanicDetailFacet & {
        harmless?: boolean | undefined;
        object?: boolean | undefined;
      })
    | undefined;
};

type SpellLevelBase = {
  level: number;
  extra: string;
};

export type ClassLevel = Class & SpellLevelBase;

export type DomainLevel = Domain & SpellLevelBase;

export type SpellDetail = SpellItem & {
  added: string; // ISO date

  description: {
    text: string;
    html: string;
  };
  verified: {
    verified: boolean;
    verifiedAuthorId?: number | null;
    verifiedTime?: string | null; // ISO
  };
};

export type I18nSpellDetailOverlay = I18nSpellOverlay & {
  sourceKey?: string | undefined;
  description?:
    | {
        text?: string | undefined;
        html?: string | undefined;
      }
    | undefined;
};

export type SpellDetailView = SpellDetail & {
  i18n?: I18nSpellDetailOverlay | undefined;
};

export type SpellBatchRequest = {
  ids: number[];
};

export type SpellBatchResponse = {
  ids: number[];
  items: SpellItemView[];
  missingIds: number[];
};
