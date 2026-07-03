import { apiGet } from "~/api/http";
import type {
  MetaI18nResponse,
  SpellFilterVocabularyResponse,
} from "@dnd/contracts";

export const getMetaI18n = (signal?: AbortSignal) =>
  apiGet<MetaI18nResponse>("/api/meta/i18n", signal);

export const getSpellFilterVocabulary = (signal?: AbortSignal) =>
  apiGet<SpellFilterVocabularyResponse>("/api/meta/filters", signal);
