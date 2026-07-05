import { Router } from "express";
import { getAppStatus, getDbStatus } from "#server/controllers/status.controller";
import { dbStatusAccessMiddleware } from "#server/middlewares/db-status-access.middleware";

export const statusRouter = Router();

statusRouter.get("/app", getAppStatus);
statusRouter.get("/db", dbStatusAccessMiddleware, getDbStatus);
