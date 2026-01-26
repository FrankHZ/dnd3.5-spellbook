import { apiGet } from "./http";
import { type ClassListResponse, type EditionListResponse, type RulebookListResponse } from "@dnd/contracts";

export const getEditions = (signal?: AbortSignal) =>
  apiGet<EditionListResponse>("/api/rulebooks/editions", signal);

export const getRulebooks = (signal?: AbortSignal) =>
  apiGet<RulebookListResponse>("/api/rulebooks", signal);

export const getClasses = (includePrestige: boolean, signal?: AbortSignal) =>
  apiGet<ClassListResponse>(
    `/api/classes?includePrestige=${includePrestige ? "true" : "false"}`,
    signal,
  );
