import type {
  SpellCastingTimeFilterKey,
  SpellComponentFilterKey,
  SpellDescriptorBucketKey,
  SpellDurationFilterKey,
  SpellRangeFilterKey,
} from "./spell.js";

export type MetaI18nResponse = {
  i18n: { lang: "en" | "zh"; variant?: string | undefined };

  rulebooks: Record<number, { name?: string | undefined }>;

  classes: Record<number, { name?: string | undefined }>;
  domains: Record<number, { name?: string | undefined }>;

  schools: Record<number, { name?: string | undefined }>;
  subschools: Record<number, { name?: string | undefined }>;
  descriptors: Record<number, { name?: string | undefined }>;
};

export type SpellTaxonomyFacetType = "school" | "subschool" | "descriptor";

export type SpellTaxonomySourceKind = "spell" | "maneuver";

export type SpellTaxonomyVocabularyCategory =
  | "spell_school"
  | "spell_subschool"
  | "spell_descriptor"
  | "maneuver_discipline"
  | "maneuver_category";

export type SpellFilterVocabularyItem = {
  id?: number | undefined;
  key: string;
  slug?: string | undefined;
  name: string;
  sourceKind: SpellTaxonomySourceKind;
  category: SpellTaxonomyVocabularyCategory;
  queryParam?:
    | "schoolIds"
    | "subschoolIds"
    | "descriptorIds"
    | "descriptorBuckets"
    | undefined;
  queryValue?: string | undefined;
  bucketKey?: SpellDescriptorBucketKey | undefined;
  i18n?: { name?: string | undefined } | undefined;
};

export type SpellComponentFilterVocabularyItem = {
  key: SpellComponentFilterKey;
  label: string;
  abbreviation: string;
};

export type SpellMechanicFilterVocabularyItem =
  | {
      key: SpellCastingTimeFilterKey;
      label: string;
      sortOrder: number;
    }
  | {
      key: SpellRangeFilterKey;
      label: string;
      sortOrder: number;
    }
  | {
      key: SpellDurationFilterKey;
      label: string;
      sortOrder: number;
    };

export type SpellFilterVocabularyResponse = {
  i18n: { lang: "en" | "zh"; variant?: string | undefined };
  taxonomy: {
    schools: SpellFilterVocabularyItem[];
    subschools: SpellFilterVocabularyItem[];
    descriptors: SpellFilterVocabularyItem[];
  };
  components: {
    queryParam: "componentKeys";
    mode: "all";
    base: SpellComponentFilterVocabularyItem[];
  };
  mechanics: {
    castingTimes: {
      queryParam: "castingTimeKeys";
      mode: "any";
      buckets: SpellMechanicFilterVocabularyItem[];
    };
    ranges: {
      queryParam: "rangeKeys";
      mode: "any";
      buckets: SpellMechanicFilterVocabularyItem[];
    };
    durations: {
      queryParam: "durationKeys";
      mode: "any";
      buckets: SpellMechanicFilterVocabularyItem[];
    };
  };
};
