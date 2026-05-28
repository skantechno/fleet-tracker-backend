export type VehicleStatus = 'active' | 'idle' | 'offline' | 'maintenance';

export interface VehicleLiveState {
  status: VehicleStatus;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  fuel: number | null;
  updatedAt: Date | null;
}

const states = new Map<string, VehicleLiveState>();

export function getVehicleState(vehicleId: string): VehicleLiveState | undefined {
  return states.get(vehicleId);
}

export function updateVehicleState(
  vehicleId: string,
  patch: Partial<VehicleLiveState>,
): VehicleLiveState {
  const current: VehicleLiveState = states.get(vehicleId) ?? {
    status: 'offline',
    lat: null,
    lng: null,
    speed: null,
    fuel: null,
    updatedAt: null,
  };
  const next = { ...current, ...patch };
  states.set(vehicleId, next);
  return next;
}
