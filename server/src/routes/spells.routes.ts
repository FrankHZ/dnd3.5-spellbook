import { Router } from "express";
import {
  searchSpells,
  listSpellsByClassAndDomainLevel,
  getSpellDetail,
  batchSpells,
  resolveSpellNames,
} from "#server/controllers/spells.controller";

const spellsRouter = Router();

spellsRouter.get("/search", searchSpells);
spellsRouter.get("/by-level", listSpellsByClassAndDomainLevel);
spellsRouter.post("/batch", batchSpells);
spellsRouter.post("/resolve", resolveSpellNames);

spellsRouter.get("/:id", getSpellDetail);
export { spellsRouter };
