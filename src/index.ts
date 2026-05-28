import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { startMqtt } from './mqtt/client.js';
import { authRouter } from './routes/auth.js';
import { geofencesRouter } from './routes/geofences.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { sendSuccess } from './utils/apiResponse.js';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/geofences', geofencesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.PORT, () => {
  logger.info(`Server listening on http://localhost:${config.PORT}`);
});

const mqttClient = startMqtt();

export default app;
export { server, mqttClient };
