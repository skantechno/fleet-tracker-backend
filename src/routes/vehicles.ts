import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/client.js';
import { vehicles, type Vehicle } from '../db/schema.js';
import { getAuthUser, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getVehicleState } from '../state/vehicleState.js';

export const vehiclesRouter = Router();

interface VehicleDto {
  id: string;
  name: string;
  status: string;
  lastLat: number | null;
  lastLng: number | null;
  lastSpeed: number | null;
  lastFuel: number | null;
  lastUpdate: string | null;
}

function toDto(vehicle: Vehicle): VehicleDto {
  const live = getVehicleState(vehicle.id);
  return {
    id: vehicle.id,
    name: vehicle.name,
    status: live?.status ?? 'offline',
    lastLat: live?.lat ?? null,
    lastLng: live?.lng ?? null,
    lastSpeed: live?.speed ?? null,
    lastFuel: live?.fuel ?? null,
    lastUpdate: live?.updatedAt ? live.updatedAt.toISOString() : null,
  };
}

vehiclesRouter.use(requireAuth);

vehiclesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);

    const rows =
      user.role === 'admin'
        ? await db.select().from(vehicles)
        : await db
            .select()
            .from(vehicles)
            .where(eq(vehicles.assignedTo, user.id));

    sendSuccess(res, rows.map(toDto));
  }),
);

vehiclesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const { id } = req.params;

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);

    if (!vehicle) {
      throw new HttpError(404, 'Vehicle not found', 'NOT_FOUND');
    }

    if (user.role !== 'admin' && vehicle.assignedTo !== user.id) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }

    sendSuccess(res, toDto(vehicle));
  }),
);
