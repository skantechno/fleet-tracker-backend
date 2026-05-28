import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { config } from '../config.js';
import { logger } from '../logger.js';
import {
  getConnectionStatus,
  onConnectionChange,
} from '../state/connectionState.js';
import { verifyToken } from '../utils/jwt.js';
import {
  vehicleRoom,
  type AppServer,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from './types.js';

export function createSocketServer(httpServer: HttpServer): AppServer {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: { origin: config.CORS_ORIGIN },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as unknown;
    if (typeof token !== 'string' || token.length === 0) {
      next(new Error('Unauthorized'));
      return;
    }
    try {
      const claims = await verifyToken(token);
      socket.data.user = {
        id: claims.sub,
        email: claims.email,
        role: claims.role,
      };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug({ userId: socket.data.user.id }, 'Socket connected');

    socket.emit('connection:status', getConnectionStatus());

    socket.on('subscribe:vehicle', ({ vehicleId }) => {
      void socket.join(vehicleRoom(vehicleId));
    });

    socket.on('unsubscribe:vehicle', ({ vehicleId }) => {
      void socket.leave(vehicleRoom(vehicleId));
    });
  });

  onConnectionChange((status) => {
    io.emit('connection:status', status);
  });

  return io;
}
