import { Router } from "express";
import { listDomains } from "../controllers/domains.controller";

const domainsRouter = Router();

domainsRouter.get("/", listDomains);

export { domainsRouter };
