import { db } from '../db/client.js';
import {
  alerts,
  type AlertSeverity,
  type AlertType,
  type NewAlert,
} from '../db/schema.js';
import { logger } from '../logger.js';
import type { TelemetryMessage } from '../mqtt/schemas.js';
import { emitAlertNew } from '../realtime/emitter.js';
import { getGeofences } from './geofenceCache.js';
import { pointInPolygon } from './geofence.js';

const SPEED_LIMIT = 80;
const LOW_FUEL_THRESHOLD = 15;

interface AlertFlags {
  speeding: boolean;
  lowFuel: boolean;
  violatedGeofences: Set<string>;
}

// Per-vehicle condition memory so alerts fire on transition into violation,
// not on every telemetry tick.
const flagsByVehicle = new Map<string, AlertFlags>();

function getFlags(vehicleId: string): AlertFlags {
  let flags = flagsByVehicle.get(vehicleId);
  if (!flags) {
    flags = { speeding: false, lowFuel: false, violatedGeofences: new Set() };
    flagsByVehicle.set(vehicleId, flags);
  }
  return flags;
}

interface AlertSpec {
  type: AlertType;
  message: string;
  severity: AlertSeverity;
}

export async function detectAlerts(t: TelemetryMessage): Promise<void> {
  const flags = getFlags(t.vehicleId);
  const specs: AlertSpec[] = [];

  // speed_violation — fire on transition into speeding.
  const speeding = t.speed > SPEED_LIMIT;
  if (speeding && !flags.speeding) {
    specs.push({
      type: 'speed_violation',
      message: `Speed ${t.speed} km/h exceeds the ${SPEED_LIMIT} km/h limit`,
      severity: 'high',
    });
  }
  flags.speeding = speeding;

  // low_fuel — fire on transition below threshold.
  const lowFuel = t.fuel < LOW_FUEL_THRESHOLD;
  if (lowFuel && !flags.lowFuel) {
    specs.push({
      type: 'low_fuel',
      message: `Fuel level ${t.fuel}% is below ${LOW_FUEL_THRESHOLD}%`,
      severity: 'medium',
    });
  }
  flags.lowFuel = lowFuel;

  // geofence_exit — for 'allow' zones, leaving; for 'deny' zones, entering.
  const geofences = await getGeofences();
  const nowViolating = new Set<string>();
  for (const geofence of geofences) {
    const inside = pointInPolygon(t.lat, t.lng, geofence.coordinates);
    const violating = geofence.type === 'allow' ? !inside : inside;
    if (!violating) {
      continue;
    }
    nowViolating.add(geofence.id);
    if (!flags.violatedGeofences.has(geofence.id)) {
      specs.push({
        type: 'geofence_exit',
        message:
          geofence.type === 'allow'
            ? `Vehicle left allowed zone "${geofence.name}"`
            : `Vehicle entered restricted zone "${geofence.name}"`,
        severity: 'high',
      });
    }
  }
  flags.violatedGeofences = nowViolating;

  if (specs.length === 0) {
    return;
  }

  await persistAndEmit(t.vehicleId, specs);
}

async function persistAndEmit(
  vehicleId: string,
  specs: AlertSpec[],
): Promise<void> {
  const rows: NewAlert[] = specs.map((s) => ({
    vehicleId,
    type: s.type,
    message: s.message,
    severity: s.severity,
  }));

  const inserted = await db.insert(alerts).values(rows).returning();

  for (const alert of inserted) {
    logger.info(
      { vehicleId, type: alert.type, severity: alert.severity },
      'Alert raised',
    );
    emitAlertNew({
      id: alert.id,
      vehicleId: alert.vehicleId,
      type: alert.type,
      message: alert.message,
      severity: alert.severity,
      timestamp: (alert.timestamp ?? new Date()).toISOString(),
    });
  }
}
