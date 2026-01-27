import { Router } from "express";
import {
  searchSpellsByName,
  listSpellsByClassAndDomainLevel,
  getSpellDetail,
  batchSpells,
} from "../controllers/spells.controller";

const spellsRouter = Router();

spellsRouter.get("/search", searchSpellsByName);
spellsRouter.get("/by-level", listSpellsByClassAndDomainLevel);
spellsRouter.post("/batch", batchSpells);

spellsRouter.get("/:id", getSpellDetail);
export { spellsRouter };
