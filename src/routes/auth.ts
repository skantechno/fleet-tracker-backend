import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users, type UserRole } from '../db/schema.js';
import { getAuthUser, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const invalid = new HttpError(
      401,
      'Invalid credentials',
      'INVALID_CREDENTIALS',
    );
    if (!user) {
      throw invalid;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw invalid;
    }

    const role = user.role as UserRole;
    const token = await signToken({ sub: user.id, email: user.email, role });

    sendSuccess(res, {
      token,
      user: { id: user.id, email: user.email, role },
    });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id, email, role } = getAuthUser(req);
    sendSuccess(res, { id, email, role });
  }),
);
