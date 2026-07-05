import { type Request, type Response, type NextFunction } from "express";
import { parseCsvNumberList } from "#server/utils/parse";
import { getDefaultRulebookIds } from "#server/services/rulebooks.service";
import { domainsService } from "#server/services/domains.service";
import { getI18nContext } from "#server/utils/i18n";

export async function listDomains(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    let rulebookIds = parseCsvNumberList(req.query.rulebookIds);
    if (rulebookIds.length === 0) rulebookIds = await getDefaultRulebookIds();

    const result = await domainsService.listDomains({
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
