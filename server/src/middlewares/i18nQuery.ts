import { type Request, type Response, type NextFunction } from "express";
import { DEFAULT_LANG } from "#server/config/constant";

export function i18nQuery(req: Request, _res: Response, next: NextFunction) {
  const langRaw = String(req.query.lang ?? "")
    .trim()
    .toLowerCase();
  const variantRaw = String(req.query.variant ?? "")
    .trim()
    .toLowerCase();

  let lang = langRaw === "" ? DEFAULT_LANG : langRaw;
  const variant = variantRaw === "" ? undefined : variantRaw;
  req.i18n = { lang, variant };
  next();
}
