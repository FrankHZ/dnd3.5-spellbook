import { type Request, type Response, type NextFunction } from 'express';
import { ApiError } from '#server/utils/errors';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'Not found', `No route for ${req.method} ${req.path}`));
}