import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { config } from '../../core/config';
import * as schema from './schema';
import { drizzleLogger } from '../../libs/logger';

if (!config.DATABASE_URL) throw new Error('Database migration failed: DATABASE_URL is not set');

const client = postgres(config.DATABASE_URL);
export const db = drizzle(client, {
  schema,
  logger: drizzleLogger,
});
