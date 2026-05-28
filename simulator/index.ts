import 'dotenv/config';
import mqtt from 'mqtt';
import { ROUTES, VEHICLE_IDS, type Waypoint } from './routes.js';

const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const INTERVAL_MS = Number(process.env.SIM_INTERVAL_MS ?? '2000');
const VEHICLE_COUNT = Number(process.env.SIM_VEHICLE_COUNT ?? '5');

const STEP = 0.34; // fraction of a segment advanced per tick
const SPEED_VIOLATION_CHANCE = 1 / 50;

interface VehicleSim {
  id: string;
  route: Waypoint[];
  waypoint: number;
  progress: number;
  fuel: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function jitter(magnitude: number): number {
  return (Math.random() - 0.5) * 2 * magnitude;
}

const vehicles: VehicleSim[] = VEHICLE_IDS.slice(0, VEHICLE_COUNT).map((id) => ({
  id,
  route: ROUTES[id],
  waypoint: Math.floor(Math.random() * ROUTES[id].length),
  progress: 0,
  fuel: 60 + Math.random() * 40,
}));

const client = mqtt.connect(MQTT_URL, { clientId: `fleet-simulator-${process.pid}` });

client.on('connect', () => {
  console.log(`[simulator] connected to ${MQTT_URL}, ${vehicles.length} vehicles`);

  for (const v of vehicles) {
    client.publish(
      `vehicles/${v.id}/status`,
      JSON.stringify({
        vehicleId: v.id,
        status: 'active',
        timestamp: new Date().toISOString(),
      }),
      { qos: 1, retain: true },
    );
  }

  setInterval(tick, INTERVAL_MS);
});

client.on('error', (err) => {
  console.error('[simulator] mqtt error', err);
});

function tick(): void {
  for (const v of vehicles) {
    v.progress += STEP;
    if (v.progress >= 1) {
      v.progress -= 1;
      v.waypoint = (v.waypoint + 1) % v.route.length;
    }

    const current = v.route[v.waypoint];
    const next = v.route[(v.waypoint + 1) % v.route.length];
    const lat = lerp(current.lat, next.lat, v.progress) + jitter(0.0002);
    const lng = lerp(current.lng, next.lng, v.progress) + jitter(0.0002);

    let speed = 45 + jitter(15);
    if (Math.random() < SPEED_VIOLATION_CHANCE) {
      speed = 85 + Math.random() * 20;
    }
    speed = Math.max(0, Math.round(speed));

    v.fuel -= 0.3 + Math.random() * 0.4;
    if (v.fuel <= 8) {
      v.fuel = 100; // refuel
    }
    const fuel = Math.round(v.fuel);

    const payload = {
      vehicleId: v.id,
      timestamp: new Date().toISOString(),
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      speed,
      fuel,
      status: 'active' as const,
    };

    client.publish(`vehicles/${v.id}/telemetry`, JSON.stringify(payload), {
      qos: 1,
    });
  }
}

function shutdown(): void {
  console.log('[simulator] shutting down');
  client.end(true, () => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
