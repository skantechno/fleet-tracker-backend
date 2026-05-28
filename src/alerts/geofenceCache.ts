import { db } from '../db/client.js';
import { geofences, type Geofence } from '../db/schema.js';

let cache: Geofence[] | null = null;

export async function getGeofences(): Promise<Geofence[]> {
  if (cache === null) {
    cache = await db.select().from(geofences);
  }
  return cache;
}

export function invalidateGeofenceCache(): void {
  cache = null;
}
