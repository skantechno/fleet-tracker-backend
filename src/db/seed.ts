import bcrypt from 'bcrypt';
import { db, pool } from './client.js';
import { logger } from '../logger.js';
import { users, vehicles, type NewUser, type NewVehicle } from './schema.js';

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  logger.info('Seeding database...');

  const [adminHash, dispatcherHash] = await Promise.all([
    bcrypt.hash('admin123', SALT_ROUNDS),
    bcrypt.hash('dispatcher123', SALT_ROUNDS),
  ]);

  const seedUsers: NewUser[] = [
    { email: 'admin@demo.com', passwordHash: adminHash, role: 'admin' },
    {
      email: 'dispatcher@demo.com',
      passwordHash: dispatcherHash,
      role: 'dispatcher',
    },
  ];

  const insertedUsers = await db
    .insert(users)
    .values(seedUsers)
    .onConflictDoNothing({ target: users.email })
    .returning();

  // onConflictDoNothing returns only newly inserted rows; re-read to get ids.
  const allUsers = await db.select().from(users);
  const dispatcher = allUsers.find((u) => u.email === 'dispatcher@demo.com');
  if (!dispatcher) {
    throw new Error('Dispatcher user not found after seed');
  }

  // v-001..v-003 assigned to the dispatcher, v-004..v-005 unassigned (admin-only).
  const seedVehicles: NewVehicle[] = [
    { id: 'v-001', name: 'Truck Alpha', assignedTo: dispatcher.id },
    { id: 'v-002', name: 'Truck Bravo', assignedTo: dispatcher.id },
    { id: 'v-003', name: 'Truck Charlie', assignedTo: dispatcher.id },
    { id: 'v-004', name: 'Van Delta', assignedTo: null },
    { id: 'v-005', name: 'Van Echo', assignedTo: null },
  ];

  await db.insert(vehicles).values(seedVehicles).onConflictDoNothing({
    target: vehicles.id,
  });

  logger.info(
    { newUsers: insertedUsers.length, vehicles: seedVehicles.length },
    'Seed complete',
  );
  await pool.end();
}

main().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
