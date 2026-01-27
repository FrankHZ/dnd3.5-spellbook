import { type Request, type Response, type NextFunction } from "express";
import { parseCsvNumberList } from "../utils/parse";
import { getDefaultRulebookIds } from "../services/rulebooks.service";
import { domainsService } from "../services/domains.service";

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
    });
    res.status(200).json(result);
    return;
  } catch (err) {
    next(err);
    return;
  }
}
