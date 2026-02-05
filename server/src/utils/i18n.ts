import { I18nContext, Lang } from "@dnd/contracts";
import { Request } from "express";
import { SUPPORTED_LANGS } from "~/config/constant";

const allowedLangs = new Set<Lang>(SUPPORTED_LANGS);

function isLang(value: unknown): value is Lang {
  return typeof value === "string" && allowedLangs.has(value as Lang);
}

export function getI18nContext(req: Request): I18nContext {
  const i18n = req.i18n;

  if (!i18n) return { lang: "en" };

  if (!isLang(i18n.lang)) {
    return { lang: "en" };
  }

  return { lang: i18n.lang, variant: i18n.variant };
}

export function hasCjk(s: string): boolean {
  return /[\u3400-\u9FFF]/.test(s);
}
