// src/controllers/meta.controller.ts
import { type Request, type Response, type NextFunction } from "express";
import { metaService } from "~/services/meta/meta.service";
import { getI18nContext } from "~/utils/i18n";

export async function getMetaI18n(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const i18n = getI18nContext(req);

    const result = await metaService.getMetaI18n({ i18n });

    res.status(200).json(result);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function getFilterVocabulary(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const i18n = getI18nContext(req);

    const result = await metaService.getFilterVocabulary({ i18n });

    res.status(200).json(result);
    return;
  } catch (err) {
    next(err);
    return;
  }
}
