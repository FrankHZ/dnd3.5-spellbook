import type { Lang } from "@dnd/contracts";
import { loadState } from "~/storage/userPrefs";

export function getI18nFromStorage(): { lang: Lang; variant?: string } {
  if (typeof window === "undefined") return { lang: "en" };

  try {
    const s = loadState();

    const lang = (s.uiPrefs.lang === "zh" ? "zh" : "en") as Lang;
    const variant =
      lang === "zh" ? (s.uiPrefs.zhVariant as string | undefined) : undefined;

    return { lang, variant };
  } catch {
    return { lang: "en" };
  }
}
