import type { Request } from 'express';
import type { UserRole } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/jwt.js';
import { HttpError } from './error.js';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function getAuthUser(req: Request): AuthUser {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
  }
  return req.user;
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const claims = await verifyToken(token);
    req.user = { id: claims.sub, email: claims.email, role: claims.role };
  } catch {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED');
  }

  next();
});
