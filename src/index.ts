import { createServer } from 'node:http';
import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { pingInflux } from './influx/client.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { startMqtt } from './mqtt/client.js';
import { setSocketServer } from './realtime/emitter.js';
import { createSocketServer } from './realtime/server.js';
import { alertsRouter } from './routes/alerts.js';
import { authRouter } from './routes/auth.js';
import { geofencesRouter } from './routes/geofences.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { setConnectionState } from './state/connectionState.js';
import { sendSuccess } from './utils/apiResponse.js';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'ok' });
});

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

export default app;
export { httpServer as server, io, mqttClient };
