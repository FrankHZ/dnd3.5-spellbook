import { Router } from "express";
import { getMetaI18n } from "~/controllers/meta.controller";

export const metaRouter = Router();

metaRouter.get("/i18n", getMetaI18n);
