import { type Request, type Response, type NextFunction } from 'express';
import { ApiError } from '../utils/errors';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      message: err.message,
      error: err.details ?? err.message,
    });
    return;
  }

  // Fallback: avoid leaking internals in production; MVP keeps it simple
  const msg = err instanceof Error ? err.message : 'Unknown error';
  console.log(msg);
  
  res.status(500).json({
    message: 'Internal server error',
    error: msg,
  });
  return;
}
