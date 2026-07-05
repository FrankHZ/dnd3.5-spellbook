import { Router } from "express";
import {
  getFilterVocabulary,
  getMetaI18n,
} from "#server/controllers/meta.controller";

export const metaRouter = Router();

metaRouter.get("/i18n", getMetaI18n);
metaRouter.get("/filters", getFilterVocabulary);
