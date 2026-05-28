import type { Server, Socket } from 'socket.io';
import type { AuthUser } from '../middleware/auth.js';
import type { VehicleStatus } from '../state/vehicleState.js';
import type { ConnectionStatus } from '../state/connectionState.js';

export interface VehicleUpdatePayload {
  vehicleId: string;
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  status: VehicleStatus;
  timestamp: string;
}

export interface AlertNewPayload {
  id: string;
  vehicleId: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
}

export type ConnectionStatusPayload = ConnectionStatus;

export interface ServerToClientEvents {
  'vehicle:update': (payload: VehicleUpdatePayload) => void;
  'alert:new': (payload: AlertNewPayload) => void;
  'connection:status': (payload: ConnectionStatusPayload) => void;
}

export interface ClientToServerEvents {
  'subscribe:vehicle': (payload: { vehicleId: string }) => void;
  'unsubscribe:vehicle': (payload: { vehicleId: string }) => void;
}

export interface SocketData {
  user: AuthUser;
}

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function vehicleRoom(vehicleId: string): string {
  return `vehicle:${vehicleId}`;
}
