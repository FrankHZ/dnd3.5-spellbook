import type { Lang } from "@dnd/contracts";
import { LS_KEY } from "~/storage/keys";

export function getI18nFromStorage(): { lang: Lang; variant?: string } {
  if (typeof window === "undefined") return { lang: "en" };

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { lang: "en" };
    const s = JSON.parse(raw) as any;

    const lang = (s.lang === "zh" ? "zh" : "en") as Lang;
    const variant =
      lang === "zh" ? (s.zhVariant as string | undefined) : undefined;

    return { lang, variant };
  } catch {
    return { lang: "en" };
  }
}
