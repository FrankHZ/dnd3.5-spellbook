import type {
  I18nContext,
  MetaI18nResponse,
  SpellFilterVocabularyItem,
  SpellFilterVocabularyResponse,
} from "@dnd/contracts";
import {
  queryMetaI18nOverlays,
  querySpellTaxonomyVocabulary,
  type SpellTaxonomyVocabularyRow,
} from "./meta.repo";

type CacheKey = string;

// Cache forever (MVP). Keyed by "lang|variant"
const cache = new Map<CacheKey, Promise<MetaI18nResponse>>();
const filterCache = new Map<CacheKey, Promise<SpellFilterVocabularyResponse>>();

function cacheKey(i18n: I18nContext): CacheKey {
  return `${i18n.lang}|${i18n.variant ?? ""}`;
}

function toIdMap<T extends { id: number }, V>(
  rows: T[],
  project: (row: T) => V,
): Record<number, V> {
  return Object.fromEntries(rows.map((r) => [r.id, project(r)]));
}

// Helpers to normalize nullable -> optional (contract-friendly)
function opt<T>(v: T | null | undefined): T | undefined {
  return v ?? undefined;
}

function overlayById(rows: Array<{ id: number; name?: string | undefined }>) {
  return new Map(rows.map((row) => [row.id, row.name]));
}

function toVocabularyItems(
  rows: SpellTaxonomyVocabularyRow[],
  facetType: SpellTaxonomyVocabularyRow["facetType"],
  overlays: Map<number, string | undefined>,
): SpellFilterVocabularyItem[] {
  return rows
    .filter((row) => row.facetType === facetType)
    .map((row) => {
      const item: SpellFilterVocabularyItem = {
        id: row.id,
        key: row.key,
        name: row.name,
      };
      if (row.slug) item.slug = row.slug;

      const overlayName = overlays.get(row.id);
      if (overlayName) item.i18n = { name: overlayName };

      return item;
    });
}

async function loadMetaI18n(i18n: I18nContext): Promise<MetaI18nResponse> {
  if (i18n.lang === "en") {
    return {
      i18n: { lang: "en", variant: i18n.variant },
      rulebooks: {},
      classes: {},
      domains: {},
      schools: {},
      subschools: {},
      descriptors: {},
    };
  }

  // Repo returns raw rows (arrays)
  const rows = await queryMetaI18nOverlays({
    lang: i18n.lang,
    variant: i18n.variant,
  });

  const rulebooks = Object.fromEntries(
    rows.rulebooks.map((r) => [r.rulebookId, { name: opt(r.name) }]),
  );

  const classes = Object.fromEntries(
    rows.classes.map((r) => [r.classId, { name: opt(r.name) }]),
  );

  const domains = Object.fromEntries(
    rows.domains.map((r) => [r.domainId, { name: opt(r.name) }]),
  );

  const schools = Object.fromEntries(
    rows.schools.map((r) => [r.schoolId, { name: opt(r.name) }]),
  );

  const subschools = Object.fromEntries(
    rows.subschools.map((r) => [r.subschoolId, { name: opt(r.name) }]),
  );

  const descriptors = Object.fromEntries(
    rows.descriptors.map((r) => [r.descriptorId, { name: opt(r.name) }]),
  );

  return {
    i18n: { lang: i18n.lang, variant: i18n.variant },
    rulebooks,
    classes,
    domains,
    schools,
    subschools,
    descriptors,
  };
}

async function loadFilterVocabulary(
  i18n: I18nContext,
): Promise<SpellFilterVocabularyResponse> {
  const vocabularyRows = await querySpellTaxonomyVocabulary();
  const emptyOverlays = new Map<number, string | undefined>();

  let schoolOverlays = emptyOverlays;
  let subschoolOverlays = emptyOverlays;
  let descriptorOverlays = emptyOverlays;

  if (i18n.lang !== "en") {
    const overlays = await queryMetaI18nOverlays({
      lang: i18n.lang,
      variant: i18n.variant,
    });
    schoolOverlays = overlayById(
      overlays.schools.map((row) => ({ id: row.schoolId, name: opt(row.name) })),
    );
    subschoolOverlays = overlayById(
      overlays.subschools.map((row) => ({
        id: row.subschoolId,
        name: opt(row.name),
      })),
    );
    descriptorOverlays = overlayById(
      overlays.descriptors.map((row) => ({
        id: row.descriptorId,
        name: opt(row.name),
      })),
    );
  }

  return {
    i18n: { lang: i18n.lang, variant: i18n.variant },
    taxonomy: {
      schools: toVocabularyItems(vocabularyRows, "school", schoolOverlays),
      subschools: toVocabularyItems(
        vocabularyRows,
        "subschool",
        subschoolOverlays,
      ),
      descriptors: toVocabularyItems(
        vocabularyRows,
        "descriptor",
        descriptorOverlays,
      ),
    },
  };
}

export const metaService = {
  async getMetaI18n(input: { i18n: I18nContext }): Promise<MetaI18nResponse> {
    const key = cacheKey(input.i18n);

    const existing = cache.get(key);
    if (existing) return await existing;

    const promise = loadMetaI18n(input.i18n).catch((err) => {
      // IMPORTANT: clear cache on rejection so next request can retry
      cache.delete(key);
      throw err;
    });

    cache.set(key, promise);
    return await promise;
  },

  async getFilterVocabulary(input: {
    i18n: I18nContext;
  }): Promise<SpellFilterVocabularyResponse> {
    const key = cacheKey(input.i18n);

    const existing = filterCache.get(key);
    if (existing) return await existing;

    const promise = loadFilterVocabulary(input.i18n).catch((err) => {
      filterCache.delete(key);
      throw err;
    });

    filterCache.set(key, promise);
    return await promise;
  },
};
