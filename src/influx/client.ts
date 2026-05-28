import { InfluxDB, type QueryApi } from '@influxdata/influxdb-client';
import { config } from '../config.js';

export const influxDB = new InfluxDB({
  url: config.INFLUX_URL,
  token: config.INFLUX_TOKEN,
});

export function getQueryApi(): QueryApi {
  return influxDB.getQueryApi(config.INFLUX_ORG);
}
