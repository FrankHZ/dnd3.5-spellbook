import { type Request, type Response, type NextFunction } from "express";
import { classesService } from "../services/classes.service";
import { parseBoolean, parseCsvNumberList } from "../utils/parse";
import { getDefaultRulebookIds } from "../services/rulebooks.service";
import { getI18nContext } from "~/utils/i18n";

export async function listClasses(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const includePrestige = parseBoolean(req.query.includePrestige, false);
    let rulebookIds = parseCsvNumberList(req.query.rulebookIds);
    if (rulebookIds.length === 0) rulebookIds = await getDefaultRulebookIds();

    const result = await classesService.listClasses({
      includePrestige,
      rulebookIds,
      i18n: getI18nContext(req),
    });
    res.status(200).json(result);
    return;
  } catch (err) {
    next(err);
    return;
  }
}
