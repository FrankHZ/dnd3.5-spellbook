import { type Request, type Response, type NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import {
  clampInt,
  normalizeString,
  parseCsvNumberList,
  parseIntOrDefault,
} from '../utils/parse';
import { spellsService } from '../services/spells/spells.service';

export async function searchSpellsByName(req: Request, res: Response, next: NextFunction) {
  try {
    const q = normalizeString(req.query.q);
    if (!q || q.length < 2) {
      next(new ApiError(400, 'Invalid request', 'q must be at least 2 characters'));
      return;
    }

    const rulebookIds = parseCsvNumberList(req.query.rulebookIds);

    const page = clampInt(parseIntOrDefault(req.query.page, 1), 1, 1_000_000);
    const pageSize = clampInt(parseIntOrDefault(req.query.pageSize, 20), 1, 100);

    const result = await spellsService.searchByName({
      q,
      rulebookIds: rulebookIds.length ? rulebookIds : undefined,
      page,
      pageSize,
    });

    res.status(200).json(result);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function listSpellsByClassLevel(req: Request, res: Response, next: NextFunction) {
  try {
    const classIds = parseCsvNumberList(req.query.classIds);
    if (classIds.length === 0) {
      next(new ApiError(400, 'Invalid request', 'classIds is required'));
      return;
    }

    const levelRaw = normalizeString(req.query.level);
    if (!levelRaw) {
      next(new ApiError(400, 'Invalid request', 'level is required (0-9)'));
      return;
    }
    const level = Number(levelRaw);
    if (!Number.isInteger(level) || level < 0 || level > 9) {
      next(new ApiError(400, 'Invalid request', 'level must be an integer 0-9'));
      return;
    }

    const rulebookIds = parseCsvNumberList(req.query.rulebookIds);

    const page = clampInt(parseIntOrDefault(req.query.page, 1), 1, 1_000_000);
    const pageSize = clampInt(parseIntOrDefault(req.query.pageSize, 20), 1, 100);

    const result = await spellsService.listByClassLevel({
      classIds,
      level,
      rulebookIds: rulebookIds.length ? rulebookIds : undefined,
      page,
      pageSize,
    });

    res.status(200).json(result);
    return;
  } catch (err) {
    next(err);
    return;
  }
}


export async function getSpellDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const idRaw = normalizeString(req.params.id);
    if (!idRaw) {
      next(new ApiError(400, 'Invalid request', 'id is required'));
      return;
    }

    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) {
      next(new ApiError(400, 'Invalid request', 'id must be a positive integer'));
      return;
    }

    const spell = await spellsService.getSpellDetail({ id });

    if (!spell) {
      next(new ApiError(404, 'Not found', `Spell ${id} not found`));
      return;
    }

    res.status(200).json(spell);
    return;
  } catch (err) {
    next(err);
    return;
  }
}