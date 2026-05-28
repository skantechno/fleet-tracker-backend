import { InfluxDB, type QueryApi } from '@influxdata/influxdb-client';
import { config } from '../config.js';

export const influxDB = new InfluxDB({
  url: config.INFLUX_URL,
  token: config.INFLUX_TOKEN,
});

export function getQueryApi(): QueryApi {
  return influxDB.getQueryApi(config.INFLUX_ORG);
}

export async function pingInflux(): Promise<boolean> {
  try {
    const res = await fetch(new URL('/health', config.INFLUX_URL), {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
