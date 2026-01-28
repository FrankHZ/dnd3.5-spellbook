import type {
  SpellBatchRequest,
  SpellBatchResponse,
  SpellByClassLevelResponse,
  SpellDetail,
  SpellNameSearchResponse,
} from "@dnd/contracts";
import { apiGet, apiPost } from "./http";

export function getSpellsByLevel(params: {
  classIds: number[];
  domainIds: number[];
  level: number;
  rulebookIds?: number[]; // omit if empty to rely on backend default edition scope
  page: number;
  pageSize: number;
  signal?: AbortSignal;
}) {
  const sp = new URLSearchParams();

  if (params.classIds.length > 0) {
    sp.append("classIds", params.classIds.join(",")); // CSV ✅
  }

  if (params.domainIds.length > 0) {
    sp.append("domainIds", params.domainIds.join(",")); // CSV ✅
  }
  sp.set("level", String(params.level));
  if (params.rulebookIds && params.rulebookIds.length > 0) {
    sp.append("rulebookIds", params.rulebookIds.join(","));
  }
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));

  return apiGet<SpellByClassLevelResponse>(
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
