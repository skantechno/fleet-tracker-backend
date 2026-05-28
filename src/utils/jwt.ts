import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { config } from '../config.js';
import type { UserRole } from '../db/schema.js';

const secret = new TextEncoder().encode(config.JWT_SECRET);
const ALG = 'HS256';

export interface JwtClaims {
  sub: string;
  email: string;
  role: UserRole;
}

const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'dispatcher']),
});

export async function signToken(claims: JwtClaims): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(config.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtClaims> {
  const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
  return claimsSchema.parse(payload);
}
