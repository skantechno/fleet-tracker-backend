import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check('users_role_check', sql`${table.role} IN ('admin', 'dispatcher')`),
  ],
);

export const vehicles = pgTable('vehicles', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const geofences = pgTable(
  'geofences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    coordinates: jsonb('coordinates').$type<[number, number][]>().notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check('geofences_type_check', sql`${table.type} IN ('allow', 'deny')`),
  ],
);

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vehicleId: varchar('vehicle_id', { length: 50 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    message: text('message').notNull(),
    severity: varchar('severity', { length: 20 }).notNull(),
    acknowledged: boolean('acknowledged').default(false),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check(
      'alerts_severity_check',
      sql`${table.severity} IN ('low', 'medium', 'high')`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Geofence = typeof geofences.$inferSelect;
export type NewGeofence = typeof geofences.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;

export type UserRole = 'admin' | 'dispatcher';
export type GeofenceType = 'allow' | 'deny';
export type AlertSeverity = 'low' | 'medium' | 'high';
export type AlertType =
  | 'speed_violation'
  | 'geofence_exit'
  | 'low_fuel'
  | 'offline';
