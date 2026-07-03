import type { LevelParam } from "~/api/spells";
import type { SpellTaxonomyFilterIds } from "@dnd/contracts";
import {
  normalizeTaxonomyFilters,
  parseTaxonomyFilters,
  setTaxonomyFilterParams,
} from "~/features/spells/taxonomy-filter-state";
import {
  normalizeIds,
  parseIdList,
  parseIntParam,
  setOrDelete,
} from "~/lib/utils";

export type SearchScope = {
  q: string;
  classIds: number[];
  domainIds: number[];
  taxonomyFilters: SpellTaxonomyFilterIds;
  level: LevelParam | null;
  page: number;
};

export function parseSearchScope(params: URLSearchParams): SearchScope {
  return {
    q: (params.get("q") ?? "").trim(),
    classIds: parseIdList(params.get("classIds")),
    domainIds: parseIdList(params.get("domainIds")),
    taxonomyFilters: parseTaxonomyFilters(params),
    level: parseSearchLevel(params.get("level")),
    page: Math.max(1, parseIntParam(params.get("page")) ?? 1),
  };
}

export function parseSearchLevel(raw: string | null): LevelParam | null {
  if (raw == null) return null;
  const value = raw.trim();
  if (!value) return null;
  if (value === "all") return "all";

  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 9) return null;
  return n;
}

export function buildSearchParams(input: {
  q?: string | null;
  classIds?: number[] | null;
  domainIds?: number[] | null;
  taxonomyFilters?: Partial<SpellTaxonomyFilterIds> | null;
  level?: LevelParam | null;
  page?: number | null;
}) {
  const params = new URLSearchParams();
  setOrDelete(params, "q", input.q?.trim() || null);

  const classIds = normalizeIds(input.classIds ?? []);
  const domainIds = normalizeIds(input.domainIds ?? []);
  setOrDelete(params, "classIds", classIds.length ? classIds.join(",") : null);
  setOrDelete(
    params,
    "domainIds",
    domainIds.length ? domainIds.join(",") : null,
  );
  setTaxonomyFilterParams(
    params,
    normalizeTaxonomyFilters(input.taxonomyFilters ?? {}),
  );
  setOrDelete(
    params,
    "level",
    input.level == null ? null : String(input.level),
  );

  if (input.page && input.page > 1)
    params.set("page", String(Math.floor(input.page)));
  return params;
}

export function buildSearchUrl(input: Parameters<typeof buildSearchParams>[0]) {
  const params = buildSearchParams(input);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

export function buildSearchUrlWithPreservedScope(
  params: URLSearchParams,
  q: string,
) {
  const scope = parseSearchScope(params);
  return buildSearchUrl({
    q,
    classIds: scope.classIds,
    domainIds: scope.domainIds,
    taxonomyFilters: scope.taxonomyFilters,
    level: scope.level,
  });
}

export function hasSearchScope(
  scope: Pick<
    SearchScope,
    "classIds" | "domainIds" | "taxonomyFilters" | "level"
  >,
) {
  return (
    scope.classIds.length > 0 ||
    scope.domainIds.length > 0 ||
    scope.taxonomyFilters.schoolIds.length > 0 ||
    scope.taxonomyFilters.subschoolIds.length > 0 ||
    scope.taxonomyFilters.descriptorIds.length > 0 ||
    scope.level !== null
  );
}
