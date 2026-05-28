import { Point, type WriteApi } from '@influxdata/influxdb-client';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { influxDB } from './client.js';

const writeApi: WriteApi = influxDB.getWriteApi(
  config.INFLUX_ORG,
  config.INFLUX_BUCKET,
  'ms',
  {
    batchSize: 100,
    flushInterval: 1000,
    maxRetries: 3,
  },
);

writeApi.useDefaultTags({});

export interface TelemetryPoint {
  vehicleId: string;
  status: string;
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  timestamp: Date;
}

export function writeTelemetry(point: TelemetryPoint): void {
  const p = new Point('vehicle_telemetry')
    .tag('vehicle_id', point.vehicleId)
    .tag('status', point.status)
    .floatField('lat', point.lat)
    .floatField('lng', point.lng)
    .floatField('speed', point.speed)
    .floatField('fuel', point.fuel)
    .timestamp(point.timestamp);

  writeApi.writePoint(p);
}

export async function flushTelemetry(): Promise<void> {
  await writeApi.flush();
}

export async function closeWriter(): Promise<void> {
  try {
    await writeApi.close();
  } catch (err) {
    logger.error({ err }, 'Error closing InfluxDB writer');
  }
}
