import { Router } from 'express';
import { listClasses } from '#server/controllers/classes.controller';

const classesRouter = Router();

classesRouter.get('/', listClasses);

export { classesRouter };
