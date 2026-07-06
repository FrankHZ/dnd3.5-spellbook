import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import type {
  SpellComponentFilterKey,
  SpellMechanicFilters,
  SpellNormalizedFilterScope,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import type { LevelParam } from "~/api/spells";
import {
  emptyNormalizedFilters,
  normalizeNormalizedFilters,
  parseNormalizedFilters,
  setNormalizedFilterParams,
} from "~/features/spells/taxonomy-filter-state";
import {
  normalizeIds,
  parseIdList,
  parseIntParam,
  setOrDelete,
} from "~/lib/utils";
import { useUserPrefs } from "~/state/user-prefs-state";

export type BrowseQueryState = {
  level: LevelParam | null; // 0-9
  classIds: number[];
  domainIds: number[];
  filters: SpellNormalizedFilterScope;
  page: number;

  // persisted scope (NOT in URL)
  rulebookIds: number[];

  // setters (URL)
  setLevel: (next: LevelParam | null) => void;
  setClassIds: (next: number[]) => void;
  setDomainIds: (next: number[]) => void;
  setSchoolIds: (next: number[]) => void;
  setSubschoolIds: (next: number[]) => void;
  setDescriptorIds: (next: number[]) => void;
  setDescriptorFilters: (
    next: Pick<SpellTaxonomyFilterIds, "descriptorIds" | "descriptorBuckets">,
  ) => void;
  setComponentKeys: (next: SpellComponentFilterKey[]) => void;
  setMechanicFilters: (next: SpellMechanicFilters) => void;
  resetDetailFilters: () => void;
  setPage: (next: number) => void;

  // useful flags
  hasValidSelection: boolean;
};

function sanitizePersistedLevel(x: unknown): LevelParam {
  if (x === "all") return "all";
  if (typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 9)
    return x;
  return "all";
}

function parseLevelParam(raw: string | null): LevelParam | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "") return null;
  if (s === "all") return "all";

  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < 0 || n > 9) return null;
  return n;
}

export function useBrowseQueryState(): BrowseQueryState {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, setState } = useUserPrefs();

  const hasClassIds = searchParams.has("classIds");
  const hasDomainIds = searchParams.has("domainIds");
  const hasLevel = searchParams.has("level");

  const persistedBrowse = state.browseQuery;
  const persistedClassIds = normalizeIds(persistedBrowse.classIds ?? []);
  const persistedDomainIds = normalizeIds(persistedBrowse.domainIds ?? []);
  const persistedLevel = sanitizePersistedLevel(persistedBrowse.level);

  // -------- parse URL --------
  const parsed = useMemo(() => {
    const level = parseLevelParam(searchParams.get("level"));

    const classIds = parseIdList(searchParams.get("classIds"));
    const domainIds = parseIdList(searchParams.get("domainIds"));
    const filters = parseNormalizedFilters(searchParams);

    const pageRaw = parseIntParam(searchParams.get("page"));
    const page = pageRaw != null && pageRaw >= 1 ? pageRaw : 1;

    return { level, classIds, domainIds, filters, page };
  }, [searchParams]);

  const effectiveClassIds = hasClassIds ? parsed.classIds : persistedClassIds;
  const effectiveDomainIds = hasDomainIds
    ? parsed.domainIds
    : persistedDomainIds;
  const effectiveLevel = hasLevel ? parsed.level : persistedLevel;

  // -------- canonicalize URL (sanitize + ensure defaults present) --------
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;

    if (!hasClassIds && persistedClassIds.length) {
      next.set("classIds", persistedClassIds.join(","));
      changed = true;
    }
    if (!hasDomainIds && persistedDomainIds.length) {
      next.set("domainIds", persistedDomainIds.join(","));
      changed = true;
    }
    if (!hasLevel) {
      next.set("level", String(persistedLevel));
      changed = true;
    }

    // page canonicalization stays as before
    if (!next.get("page")) {
      next.set("page", "1");
      changed = true;
    }

    if (hasLevel && parsed.level === null) {
      next.delete("level");
      changed = true;
    }

    if (changed) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasClassIds,
    hasDomainIds,
    hasLevel,
    persistedClassIds.join(","),
    persistedDomainIds.join(","),
    persistedLevel,
  ]);

  const updateParams = useCallback(
    (updater: (sp: URLSearchParams) => void, replace?: boolean) => {
      const next = new URLSearchParams(searchParams);
      updater(next);
      setSearchParams(next, { replace: !!replace });
    },
    [searchParams, setSearchParams],
  );

  const resetPage = (sp: URLSearchParams) => sp.set("page", "1");

  // -------- setters (URL-driven) --------
  const setLevel = useCallback(
    (nextLevel: LevelParam | null) => {
      const sanitized: LevelParam | null =
        nextLevel === "all"
          ? "all"
          : nextLevel != null && nextLevel >= 0 && nextLevel <= 9
            ? nextLevel
            : null;

      updateParams((sp) => {
        setOrDelete(sp, "level", sanitized == null ? null : String(sanitized));
        resetPage(sp);
      });

      setState((s) => ({
        ...s,
        browseQuery: { ...s.browseQuery, level: sanitized ?? "all" },
      }));
    },
    [updateParams, setState],
  );

  const setClassIds = useCallback(
    (nextIds: number[]) => {
      const ids = normalizeIds(nextIds);

      updateParams((sp) => {
        setOrDelete(sp, "classIds", ids.length ? ids.join(",") : null);
        resetPage(sp);
      });

      setState((s) => ({
        ...s,
        browseQuery: { ...s.browseQuery, classIds: ids },
      }));
    },
    [updateParams, setState],
  );

  const setDomainIds = useCallback(
    (nextIds: number[]) => {
      const ids = normalizeIds(nextIds);

      updateParams((sp) => {
        setOrDelete(sp, "domainIds", ids.length ? ids.join(",") : null);
        resetPage(sp);
      });

      setState((s) => ({
        ...s,
        browseQuery: { ...s.browseQuery, domainIds: ids },
      }));
    },
    [updateParams, setState],
  );

  const setTaxonomyIds = useCallback(
    (key: keyof SpellTaxonomyFilterIds, nextIds: number[]) => {
      const ids = normalizeIds(nextIds.filter((id) => id > 0));
      updateParams((sp) => {
        setNormalizedFilterParams(
          sp,
          normalizeNormalizedFilters({
            ...parsed.filters,
            [key]: ids,
          }),
        );
        resetPage(sp);
      });
    },
    [parsed.filters, updateParams],
  );

  const setSchoolIds = useCallback(
    (nextIds: number[]) => setTaxonomyIds("schoolIds", nextIds),
    [setTaxonomyIds],
  );

  const setSubschoolIds = useCallback(
    (nextIds: number[]) => setTaxonomyIds("subschoolIds", nextIds),
    [setTaxonomyIds],
  );

  const setDescriptorIds = useCallback(
    (nextIds: number[]) => setTaxonomyIds("descriptorIds", nextIds),
    [setTaxonomyIds],
  );

  const setDescriptorFilters = useCallback(
    (
      next: Pick<SpellTaxonomyFilterIds, "descriptorIds" | "descriptorBuckets">,
    ) => {
      updateParams((sp) => {
        setNormalizedFilterParams(
          sp,
          normalizeNormalizedFilters({
            ...parsed.filters,
            descriptorIds: next.descriptorIds,
            descriptorBuckets: next.descriptorBuckets,
          }),
        );
        resetPage(sp);
      });
    },
    [parsed.filters, updateParams],
  );

  const setComponentKeys = useCallback(
    (componentKeys: SpellComponentFilterKey[]) => {
      updateParams((sp) => {
        setNormalizedFilterParams(
          sp,
          normalizeNormalizedFilters({
            ...parsed.filters,
            componentKeys,
          }),
        );
        resetPage(sp);
      });
    },
    [parsed.filters, updateParams],
  );

  const setMechanicFilters = useCallback(
    (mechanicFilters: SpellMechanicFilters) => {
      updateParams((sp) => {
        setNormalizedFilterParams(
          sp,
          normalizeNormalizedFilters({
            ...parsed.filters,
            ...mechanicFilters,
          }),
        );
        resetPage(sp);
      });
    },
    [parsed.filters, updateParams],
  );

  const resetDetailFilters = useCallback(() => {
    updateParams((sp) => {
      setNormalizedFilterParams(sp, emptyNormalizedFilters());
      resetPage(sp);
    });
  }, [updateParams]);

  const setPage = useCallback(
    (nextPage: number) => {
      const p =
        Number.isFinite(nextPage) && nextPage >= 1 ? Math.floor(nextPage) : 1;
      updateParams((sp) => sp.set("page", String(p)));
    },
    [updateParams],
  );

  // -------- persisted rulebook scope (NOT URL) --------
  const rulebookIds = useMemo(
    () => normalizeIds(state.selectedRulebookIds ?? []),
    [state.selectedRulebookIds],
  );

  const hasValidSelection =
    (effectiveClassIds.length > 0 || effectiveDomainIds.length > 0) &&
    effectiveLevel !== null;

  return {
    level: effectiveLevel,
    classIds: effectiveClassIds,
    domainIds: effectiveDomainIds,
    filters: parsed.filters,
    page: parsed.page,
    rulebookIds,
    setLevel,
    setClassIds,
    setDomainIds,
    setSchoolIds,
    setSubschoolIds,
    setDescriptorIds,
    setDescriptorFilters,
    setComponentKeys,
    setMechanicFilters,
    resetDetailFilters,
    setPage,
    hasValidSelection,
  };
}
