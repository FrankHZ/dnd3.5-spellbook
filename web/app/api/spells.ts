import type {
  SpellByClassLevelResponse,
  SpellDetail,
  SpellNameSearchResponse,
} from "@dnd/contracts";
import { apiGet } from "./http";

export function getSpellsByClassLevel(params: {
  classIds: number[];
  level: number;
  rulebookIds?: number[]; // omit if empty to rely on backend default edition scope
  page: number;
  pageSize: number;
  signal?: AbortSignal;
}) {
  const sp = new URLSearchParams();

  sp.append("classIds", params.classIds.join(",")); // CSV ✅
  sp.set("level", String(params.level));
  if (params.rulebookIds && params.rulebookIds.length > 0) {
    sp.append("rulebookIds", params.rulebookIds.join(","));
  }
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));

  return apiGet<SpellByClassLevelResponse>(
    `/api/spells/by-class-level?${sp.toString()}`,
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
