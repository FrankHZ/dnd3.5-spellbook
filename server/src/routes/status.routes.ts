import { Router } from "express";
import { getAppStatus, getDbStatus } from "~/controllers/status.controller";

export const statusRouter = Router();

statusRouter.get("/app", getAppStatus);
statusRouter.get("/db", getDbStatus);
