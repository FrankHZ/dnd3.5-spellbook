import { type Request, type Response, type NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { classesService } from '../services/classes.service';
import { parseBoolean } from '../utils/parse';
import type { ClassListResponse } from '@dnd/contracts';

export async function listClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const includePrestige = parseBoolean(req.query.includePrestige, false);

    // MVP: no edition filter, since CharacterClass currently doesn’t have Edition fields.
    const items = await classesService.listClasses({ includePrestige });
    res.status(200).json({ includePrestige, items } satisfies ClassListResponse);
    return;
  } catch (err) {
    next(err);
    return;
  }
}
