import type { Lang } from "@dnd/contracts";
import { LS_KEY } from "~/storage/keys";
import type { PersistedStateV1 } from "~/storage/schema";

export function getI18nFromStorage(): { lang: Lang; variant?: string } {
  if (typeof window === "undefined") return { lang: "en" };

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { lang: "en" };
    const s = JSON.parse(raw) as PersistedStateV1;

    const lang = (s.uiPrefs.lang === "zh" ? "zh" : "en") as Lang;
    const variant =
      lang === "zh" ? (s.uiPrefs.zhVariant as string | undefined) : undefined;

    return { lang, variant };
  } catch {
    return { lang: "en" };
  }
}
