import type {
  ResolveSpellNamesRequest,
  ResolveSpellNamesResponse,
  SpellBatchRequest,
  SpellBatchResponse,
  SpellByLevelResponse,
  SpellDetail,
  SpellNameSearchResponse,
} from "@dnd/contracts";
import { apiGet, apiPost } from "./http";

export type LevelParam = number | "all";

export function getSpellsByLevel(params: {
  classIds: number[];
  domainIds: number[];
  level: LevelParam;
  rulebookIds?: number[]; // omit if empty to rely on backend default edition scope
  page: number;
  pageSize: number;
  signal?: AbortSignal;
}) {
  const sp = new URLSearchParams();

  if (params.classIds.length > 0) {
    sp.set("classIds", params.classIds.join(",")); // CSV ✅
  }

  if (params.domainIds.length > 0) {
    sp.set("domainIds", params.domainIds.join(",")); // CSV ✅
  }
  sp.set("level", String(params.level));
  if (params.rulebookIds && params.rulebookIds.length > 0) {
    sp.set("rulebookIds", params.rulebookIds.join(","));
  }
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));

  return apiGet<SpellByLevelResponse>(
    `/api/spells/by-level?${sp.toString()}`,
    params.signal,
  );
}

export function searchSpellsByName(params: {
  q: string;
  rulebookIds?: number[];
  page: number;
  pageSize: number;
  signal?: AbortSignal;
}) {
  const sp = new URLSearchParams();
  sp.set("q", params.q);
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));

  if (params.rulebookIds && params.rulebookIds.length > 0) {
    sp.set("rulebookIds", params.rulebookIds.join(",")); // CSV ✅
  }

  return apiGet<SpellNameSearchResponse>(
    `/api/spells/search?${sp.toString()}`,
    params.signal,
  );
}

export function getSpellDetail(id: number, signal?: AbortSignal) {
  return apiGet<SpellDetail>(`/api/spells/${id}`, signal);
}

const MAX_IDS_PER_BATCH = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function getSpellsBatch(
  ids: number[],
  signal?: AbortSignal,
): Promise<SpellBatchResponse> {
  // normalize: stable, no duplicates, no invalids
  const normalized = Array.from(
    new Set(ids.filter((x) => Number.isInteger(x) && x > 0)),
  );

  if (normalized.length === 0) {
    return { ids: [], items: [], missingIds: [] };
  }

  const chunks = chunk(normalized, MAX_IDS_PER_BATCH);
  const results = await Promise.all(
    chunks.map((c) =>
      apiPost<SpellBatchResponse, SpellBatchRequest>(
        "/api/spells/batch",
        { ids: c },
        signal,
      ),
    ),
  );

  // Merge while preserving overall input order
  const itemById = new Map<number, SpellBatchResponse["items"][number]>();
  const missing = new Set<number>();

  for (const r of results) {
    r.items.forEach((it) => itemById.set(it.id, it));
    r.missingIds.forEach((id) => missing.add(id));
  }

  return {
    ids: normalized,
    items: normalized.map((id) => itemById.get(id)).filter(Boolean) as any,
    missingIds: Array.from(missing),
  };
}

const MAX_NAMES_PER_RESOLVE = 500;

export async function resolveSpellNames(
  names: string[],
  rulebookIds?: number[],
  signal?: AbortSignal,
): Promise<ResolveSpellNamesResponse> {
  // Keep order; normalize values to strings
  const normalizedNames = names.map((x) =>
    typeof x === "string" ? x : String(x),
  );

  // If the request is empty, return empty response
  if (normalizedNames.length === 0) {
    return { results: [], conflictRulebooks: [] };
  }

  const chunks = chunk(normalizedNames, MAX_NAMES_PER_RESOLVE);

  const results = await Promise.all(
    chunks.map((c) =>
      apiPost<ResolveSpellNamesResponse, ResolveSpellNamesRequest>(
        "/api/spells/resolve",
        {
          names: c,
          // only include if non-empty; empty lets backend apply default
          ...(rulebookIds && rulebookIds.length > 0
            ? { rulebookIds: rulebookIds }
            : {}),
        },
        signal,
      ),
    ),
  );

  // Merge in original order, preserving per-chunk order
  const mergedResults = results.flatMap((r) => r.results);

  // conflictRulebooks = union
  const conflict = new Set<number>();
  for (const r of results) {
    for (const id of r.conflictRulebooks ?? []) conflict.add(id);
  }

  return {
    results: mergedResults,
    conflictRulebooks: Array.from(conflict).sort((a, b) => a - b),
  };
}
