import type { Lang } from "@dnd/contracts";
import { detectPreferredLang, loadState } from "~/storage/userPrefs";

import { DEFAULT_LANG } from "./config";

export function getI18nFromStorage(): { lang: Lang; variant?: string } {
  if (typeof window === "undefined") return { lang: DEFAULT_LANG };

  try {
    const s = loadState();

    const lang = (s.uiPrefs.lang === "zh" ? "zh" : DEFAULT_LANG) as Lang;
    const variant =
      lang === "zh" ? (s.uiPrefs.zhVariant as string | undefined) : undefined;

    return { lang, variant };
  } catch {
    return { lang: detectPreferredLang() };
  }
}
