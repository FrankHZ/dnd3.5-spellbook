import { type NextFunction, type Request, type Response } from "express";
import type { AppStatusResponse, DbStatusResponse } from "@dnd/contracts";
import { appStatusService } from "~/services/app-status.service";
import { dbStatusService } from "~/services/db-status.service";

export function getAppStatus(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = appStatusService.getAppStatus();
    res.status(200).json(result satisfies AppStatusResponse);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

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
