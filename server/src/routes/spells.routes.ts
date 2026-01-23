import { Router } from 'express';
import {
  searchSpellsByName,
  listSpellsByClassLevel,
  getSpellDetail,
} from '../controllers/spells.controller';

const spellsRouter = Router();

spellsRouter.get('/search', searchSpellsByName);
spellsRouter.get('/by-class-level', listSpellsByClassLevel);

spellsRouter.get('/:id', getSpellDetail);
export { spellsRouter };