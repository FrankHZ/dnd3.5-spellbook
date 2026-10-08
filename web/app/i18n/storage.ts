import type { Lang } from "@dnd/contracts";
import { detectPreferredLang, loadState } from "~/storage/userPrefs";

import { DEFAULT_LANG, DEFAULT_ZH_VARIANT } from "./config";

export function getI18nFromStorage(): { lang: Lang; variant?: string } {
  if (typeof window === "undefined") return { lang: DEFAULT_LANG };

  try {
    const s = loadState();

    const lang = (s.uiPrefs.lang === "zh" ? "zh" : DEFAULT_LANG) as Lang;
    const variant = lang === "zh" ? DEFAULT_ZH_VARIANT : undefined;

    return { lang, variant };
  } catch {
    const lang = detectPreferredLang();
    return { lang, ...(lang === "zh" ? { variant: DEFAULT_ZH_VARIANT } : {}) };
  }
}
