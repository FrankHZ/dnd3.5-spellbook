import { Router } from 'express';
import { listRulebooks, listRulebookEditions } from '../controllers/rulebooks.controller';

const rulebooksRouter = Router();

rulebooksRouter.get('/', listRulebooks);
rulebooksRouter.get('/editions', listRulebookEditions);

export { rulebooksRouter };
