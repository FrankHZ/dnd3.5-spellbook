import { type NextFunction, type Request, type Response } from "express";
import type { DbStatusResponse } from "@dnd/contracts";
import { dbStatusService } from "~/services/db-status.service";

export async function getDbStatus(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await dbStatusService.getDbStatus();
    res.status(200).json(result satisfies DbStatusResponse);
    return;
  } catch (err) {
    next(err);
    return;
  }
}
