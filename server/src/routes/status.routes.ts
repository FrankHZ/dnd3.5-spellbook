import { Router } from "express";
import { getDbStatus } from "~/controllers/status.controller";

export const statusRouter = Router();

statusRouter.get("/db", getDbStatus);
