import type { I18nContext } from "@dnd/contracts"; // adjust
import type { MetaI18nResponse } from "@dnd/contracts"; // adjust
import { queryMetaI18nOverlays } from "./meta.repo"; // your meta.repo.ts

type CacheKey = string;

// Cache forever (MVP). Keyed by "lang|variant"
const cache = new Map<CacheKey, Promise<MetaI18nResponse>>();

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
};
