import { apiGet } from "./http";
import {
  type ClassListResponse,
  type DomainListResponse,
  type EditionListResponse,
  type RulebookListResponse,
} from "@dnd/contracts";

export const getEditions = (signal?: AbortSignal) =>
  apiGet<EditionListResponse>("/api/rulebooks/editions", signal);

export const getRulebooks = (signal?: AbortSignal) =>
  apiGet<RulebookListResponse>("/api/rulebooks", signal);

export const getClasses = (
  includePrestige: boolean,
  rulebookIds?: number[],
  signal?: AbortSignal,
) => {
  const sp = new URLSearchParams();
  sp.set("includePrestige", includePrestige ? "true" : "false");
  if (rulebookIds && rulebookIds.length > 0) {
    sp.append("rulebookIds", rulebookIds.join(","));
  }
  return apiGet<ClassListResponse>(`/api/classes?${sp.toString()}`, signal);
};

export const getDomains = (rulebookIds: number[], signal?: AbortSignal) => {
  const sp = new URLSearchParams();
  if (rulebookIds && rulebookIds.length > 0) {
    sp.append("rulebookIds", rulebookIds.join(","));
  }
  return apiGet<DomainListResponse>(`/api/domains?${sp.toString()}`, signal);
};
