import { type Request, type Response, type NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { rulebooksService } from '../services/rulebooks.service';
import type { EditionListResponse, RulebookListResponse } from '@dnd/contracts';

export async function listRulebooks(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await rulebooksService.listRulebooks();

    res.status(200).json({ items } satisfies RulebookListResponse);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function listRulebookEditions(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await rulebooksService.listRulebookEditions();

    res.status(200).json({ items } satisfies EditionListResponse);
    return;
  } catch (err) {
    next(err);
    return;
  }
}