import { Router } from "express";
import { listDomains } from "#server/controllers/domains.controller";

const domainsRouter = Router();

domainsRouter.get("/", listDomains);

export { domainsRouter };
