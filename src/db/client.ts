import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config.js';
import * as schema from './schema.js';

export const pool = new Pool({ connectionString: config.DATABASE_URL });

export const db = drizzle(pool, { schema });

export type Database = typeof db;

export async function pingPostgres(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
