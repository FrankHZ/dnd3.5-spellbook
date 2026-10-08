import { Router } from 'express';
import { listRulebooks, listRulebookEditions, publicationStats } from '#server/controllers/rulebooks.controller';

const rulebooksRouter = Router();

rulebooksRouter.get('/', listRulebooks);
rulebooksRouter.get('/editions', listRulebookEditions);
rulebooksRouter.get('/publication-stats', publicationStats);

export { rulebooksRouter };
