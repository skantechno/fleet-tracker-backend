import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import { sendError } from '../utils/apiResponse.js';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', 'Not found');
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    sendError(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', err.flatten());
    return;
  }

  logger.error({ err }, 'Unhandled error');
  sendError(res, 500, 'INTERNAL', 'Internal server error');
}
