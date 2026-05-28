import { logger } from '../logger.js';
import { writeTelemetry } from '../influx/writer.js';
import { emitVehicleUpdate } from '../realtime/emitter.js';
import { updateVehicleState } from '../state/vehicleState.js';
import { statusSchema, telemetrySchema } from './schemas.js';

export function handleMessage(topic: string, payload: Buffer): void {
  const segments = topic.split('/');
  const kind = segments[2];

  let json: unknown;
  try {
    json = JSON.parse(payload.toString('utf8'));
  } catch {
    logger.warn({ topic }, 'Dropped MQTT message: invalid JSON');
    return;
  }

  if (kind === 'telemetry') {
    handleTelemetry(topic, json);
  } else if (kind === 'status') {
    handleStatus(topic, json);
  }
}

function handleTelemetry(topic: string, json: unknown): void {
  const parsed = telemetrySchema.safeParse(json);
  if (!parsed.success) {
    logger.warn(
      { topic, issues: parsed.error.issues },
      'Dropped telemetry: validation failed',
    );
    return;
  }

  const t = parsed.data;
  const timestamp = new Date(t.timestamp);

  writeTelemetry({
    vehicleId: t.vehicleId,
    status: t.status,
    lat: t.lat,
    lng: t.lng,
    speed: t.speed,
    fuel: t.fuel,
    timestamp,
  });

  updateVehicleState(t.vehicleId, {
    status: t.status,
    lat: t.lat,
    lng: t.lng,
    speed: t.speed,
    fuel: t.fuel,
    updatedAt: timestamp,
  });

  emitVehicleUpdate({
    vehicleId: t.vehicleId,
    lat: t.lat,
    lng: t.lng,
    speed: t.speed,
    fuel: t.fuel,
    status: t.status,
    timestamp: t.timestamp,
  });
}

function handleStatus(topic: string, json: unknown): void {
  const parsed = statusSchema.safeParse(json);
  if (!parsed.success) {
    logger.warn(
      { topic, issues: parsed.error.issues },
      'Dropped status: validation failed',
    );
    return;
  }

  const s = parsed.data;
  updateVehicleState(s.vehicleId, {
    status: s.status,
    updatedAt: new Date(s.timestamp),
  });
}
