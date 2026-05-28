import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { geofences } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { requireRole } from '../middleware/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/apiResponse.js';

export const geofencesRouter = Router();

const coordinate = z.tuple([z.number(), z.number()]);

const createSchema = z.object({
  name: z.string().min(1),
  coordinates: z.array(coordinate).min(3),
  type: z.enum(['allow', 'deny']),
});

const idParam = z.object({ id: z.string().uuid() });

// Read is available to any authenticated user (dispatchers are read-only).
geofencesRouter.use(requireAuth);

geofencesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(geofences);
    sendSuccess(
      res,
      rows.map((g) => ({
        id: g.id,
        name: g.name,
        coordinates: g.coordinates,
        type: g.type,
      })),
    );
  }),
);

// Writes are admin-only.
geofencesRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const [created] = await db
      .insert(geofences)
      .values({
        name: body.name,
        coordinates: body.coordinates,
        type: body.type,
      })
      .returning();

    sendCreated(res, {
      id: created.id,
      name: created.name,
      coordinates: created.coordinates,
      type: created.type,
    });
  }),
);

geofencesRouter.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const deleted = await db
      .delete(geofences)
      .where(eq(geofences.id, id))
      .returning({ id: geofences.id });

    if (deleted.length === 0) {
      throw new HttpError(404, 'Geofence not found', 'NOT_FOUND');
    }

    sendNoContent(res);
  }),
);
