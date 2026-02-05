import { apiGet } from "~/api/http";
import type { MetaI18nResponse } from "@dnd/contracts";

export const getMetaI18n = (signal?: AbortSignal) =>
  apiGet<MetaI18nResponse>("/api/meta/i18n", signal);
