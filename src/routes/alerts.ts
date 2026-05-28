import { count, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/client.js';
import { alerts, vehicles } from '../db/schema.js';
import { getAuthUser, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  buildPagination,
  parsePagination,
  sendPaginated,
  sendSuccess,
} from '../utils/apiResponse.js';
import type { AuthUser } from '../middleware/auth.js';

export const alertsRouter = Router();

alertsRouter.use(requireAuth);

async function assignedVehicleIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.assignedTo, userId));
  return rows.map((r) => r.id);
}

alertsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const { page, limit, offset } = parsePagination(req.query);

    let scope: SQL | undefined;
    if (user.role !== 'admin') {
      const ids = await assignedVehicleIds(user.id);
      if (ids.length === 0) {
        sendPaginated(res, [], buildPagination(page, limit, 0));
        return;
      }
      scope = inArray(alerts.vehicleId, ids);
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(alerts)
      .where(scope);

    const rows = await db
      .select()
      .from(alerts)
      .where(scope)
      .orderBy(desc(alerts.timestamp))
      .limit(limit)
      .offset(offset);

    const data = rows.map((a) => ({
      id: a.id,
      vehicleId: a.vehicleId,
      type: a.type,
      message: a.message,
      severity: a.severity,
      timestamp: (a.timestamp ?? new Date()).toISOString(),
      acknowledged: a.acknowledged ?? false,
    }));

    sendPaginated(res, data, buildPagination(page, limit, total));
  }),
);

async function ensureCanAccessAlert(
  alertId: string,
  user: AuthUser,
): Promise<void> {
  const [alert] = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, alertId))
    .limit(1);

  if (!alert) {
    throw new HttpError(404, 'Alert not found', 'NOT_FOUND');
  }
  if (user.role !== 'admin') {
    const ids = await assignedVehicleIds(user.id);
    if (!ids.includes(alert.vehicleId)) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }
  }
}

alertsRouter.post(
  '/:id/acknowledge',
  asyncHandler(async (req, res) => {
    const user = getAuthUser(req);
    const { id } = req.params;

    await ensureCanAccessAlert(id, user);

    await db.update(alerts).set({ acknowledged: true }).where(eq(alerts.id, id));

    sendSuccess(res, { acknowledged: true });
  }),
);
