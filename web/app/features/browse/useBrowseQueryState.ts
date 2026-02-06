import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  normalizeIds,
  parseIdList,
  parseIntParam,
  setOrDelete,
} from "~/lib/utils";
import { usePersistedState } from "~/state/persisted-state";

export type BrowseQueryState = {
  level: number | null; // 0-9
  classIds: number[];
  domainIds: number[];
  page: number;

  // persisted scope (NOT in URL)
  rulebookIds: number[];

  // setters (URL)
  setLevel: (next: number | null) => void;
  setClassIds: (next: number[]) => void;
  setDomainIds: (next: number[]) => void;
  setPage: (next: number) => void;

  // useful flags
  hasValidSelection: boolean;
};

export function useBrowseQueryState(): BrowseQueryState {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, setState } = usePersistedState();

  const hasClassIds = searchParams.has("classIds");
  const hasDomainIds = searchParams.has("domainIds");
  const hasLevel = searchParams.has("level");

  const persistedBrowse = state.browseQuery;
  const persistedClassIds = normalizeIds(persistedBrowse.classIds ?? []);
  const persistedDomainIds = normalizeIds(persistedBrowse.domainIds ?? []);
  const persistedLevelRaw = persistedBrowse.level ?? null;
  const persistedLevel =
    persistedLevelRaw != null &&
    persistedLevelRaw >= 0 &&
    persistedLevelRaw <= 9
      ? persistedLevelRaw
      : null;

  // -------- parse URL --------
  const parsed = useMemo(() => {
    const levelRaw = parseIntParam(searchParams.get("level"));
    const level =
      levelRaw != null && levelRaw >= 0 && levelRaw <= 9 ? levelRaw : null;

    const classIds = parseIdList(searchParams.get("classIds"));
    const domainIds = parseIdList(searchParams.get("domainIds"));

    const pageRaw = parseIntParam(searchParams.get("page"));
    const page = pageRaw != null && pageRaw >= 1 ? pageRaw : 1;

    return { level, classIds, domainIds, page };
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
    if (!hasLevel && persistedLevel != null) {
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
    (nextLevel: number | null) => {
      const sanitized =
        nextLevel != null && nextLevel >= 0 && nextLevel <= 9
          ? nextLevel
          : null;

      updateParams((sp) => {
        setOrDelete(sp, "level", sanitized == null ? null : String(sanitized));
        resetPage(sp);
      });

      setState((s) => ({
        ...s,
        browseQuery: { ...s.browseQuery, level: sanitized },
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
    page: parsed.page,
    rulebookIds,
    setLevel,
    setClassIds,
    setDomainIds,
    setPage,
    hasValidSelection,
  };
}
