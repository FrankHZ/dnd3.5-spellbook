import type { PublicationStatsResponse } from "@dnd/contracts";
import { apiGet } from "./http";

export const getPublicationStats = (signal?: AbortSignal) =>
  apiGet<PublicationStatsResponse>("/api/rulebooks/publication-stats", signal);
