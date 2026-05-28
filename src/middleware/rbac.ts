import type { RequestHandler } from 'express';
import type { UserRole } from '../db/schema.js';
import { getAuthUser } from './auth.js';
import { HttpError } from './error.js';

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    const user = getAuthUser(req);
    if (!roles.includes(user.role)) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }
    next();
  };
}
