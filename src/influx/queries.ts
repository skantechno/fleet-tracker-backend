import { getQueryApi } from './client.js';
import { config } from '../config.js';

export interface HistoryPoint {
  timestamp: string;
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
}

// Flux strings are not parameterized; escape values interpolated into the query.
function escapeFlux(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildHistoryQuery(vehicleId: string, from: Date, to: Date): string {
  return `from(bucket: "${escapeFlux(config.INFLUX_BUCKET)}")
  |> range(start: ${from.toISOString()}, stop: ${to.toISOString()})
  |> filter(fn: (r) => r._measurement == "vehicle_telemetry")
  |> filter(fn: (r) => r.vehicle_id == "${escapeFlux(vehicleId)}")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"])`;
}

interface FluxRow {
  _time: string;
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
}

export async function queryVehicleHistory(
  vehicleId: string,
  from: Date,
  to: Date,
): Promise<HistoryPoint[]> {
  const flux = buildHistoryQuery(vehicleId, from, to);
  const rows = await getQueryApi().collectRows<FluxRow>(flux);
  return rows.map((r) => ({
    timestamp: r._time,
    lat: r.lat,
    lng: r.lng,
    speed: r.speed,
    fuel: r.fuel,
  }));
}
