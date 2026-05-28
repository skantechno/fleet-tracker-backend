import { Router } from 'express';
import { pingPostgres } from '../db/client.js';
import { pingInflux } from '../influx/client.js';
import {
  getConnectionStatus,
  setConnectionState,
} from '../state/connectionState.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [postgres, influxOk] = await Promise.all([
      pingPostgres(),
      pingInflux(),
    ]);

    setConnectionState('influx', influxOk ? 'connected' : 'disconnected');
    const { mqtt } = getConnectionStatus();

    const services = {
      postgres: postgres ? 'connected' : 'disconnected',
      influx: influxOk ? 'connected' : 'disconnected',
      mqtt,
    } as const;

    const healthy =
      postgres && influxOk && mqtt === 'connected' ? true : false;

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      data: { status: healthy ? 'ok' : 'degraded', services },
    });
  }),
);
