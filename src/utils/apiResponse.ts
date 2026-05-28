import type { Response } from 'express';
import { z } from 'zod';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ResponseMeta {
  pagination: PaginationMeta;
}

export interface SuccessBody<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorBody {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  const body: SuccessBody<T> = { success: true, data };
  return res.status(status).json(body);
}

export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).end();
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  status = 200,
): Response {
  const body: SuccessBody<T[]> = {
    success: true,
    data,
    meta: { pagination },
  };
  return res.status(status).json(body);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ErrorBody = {
    success: false,
    error: {
      message,
      code,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return res.status(status).json(body);
}

export function buildPagination(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationQuerySchema>;

export function parsePagination(query: unknown): PaginationParams {
  return paginationQuerySchema.parse(query);
}
