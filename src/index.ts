import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.PORT, () => {
  logger.info(`Server listening on http://localhost:${config.PORT}`);
});

export default app;
export { server };
