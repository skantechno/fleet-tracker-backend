import type {
  AlertNewPayload,
  AppServer,
  VehicleUpdatePayload,
} from './types.js';

let io: AppServer | null = null;

export function setSocketServer(server: AppServer): void {
  io = server;
}

export function emitVehicleUpdate(payload: VehicleUpdatePayload): void {
  io?.emit('vehicle:update', payload);
}

export function emitAlertNew(payload: AlertNewPayload): void {
  io?.emit('alert:new', payload);
}
