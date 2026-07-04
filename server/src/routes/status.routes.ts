import { Router } from "express";
import { getAppStatus, getDbStatus } from "~/controllers/status.controller";
import { dbStatusAccessMiddleware } from "~/middlewares/db-status-access.middleware";

export const statusRouter = Router();

statusRouter.get("/app", getAppStatus);
statusRouter.get("/db", dbStatusAccessMiddleware, getDbStatus);
