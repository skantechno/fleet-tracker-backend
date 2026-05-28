import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config.js';
import { logger } from './logger.js';
import { pool } from './db/client.js';
import { pingInflux } from './influx/client.js';
import { closeWriter } from './influx/writer.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { startMqtt } from './mqtt/client.js';
import { setSocketServer } from './realtime/emitter.js';
import { createSocketServer } from './realtime/server.js';
import { alertsRouter } from './routes/alerts.js';
import { authRouter } from './routes/auth.js';
import { geofencesRouter } from './routes/geofences.js';
import { healthRouter } from './routes/health.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { setConnectionState } from './state/connectionState.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests', code: 'RATE_LIMITED' },
  },
});

app.use('/health', healthRouter);
app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/geofences', geofencesRouter);
app.use('/api/alerts', alertsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = createServer(app);
const io = createSocketServer(httpServer);
setSocketServer(io);

httpServer.listen(config.PORT, () => {
  logger.info(`Server listening on http://localhost:${config.PORT}`);
});

const mqttClient = startMqtt();

void pingInflux().then((ok) => {
  setConnectionState('influx', ok ? 'connected' : 'disconnected');
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down gracefully');

  try {
    mqttClient.end(true);
    await closeWriter();
    await io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await pool.end();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

export default app;
export { httpServer as server, io, mqttClient };
