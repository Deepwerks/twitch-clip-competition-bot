import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'node:path';
import { config } from '../../core/config';
import { logger } from '../../libs/logger';

export const runDatabaseMigrations = async () => {
  logger.database.info('Running database migrations...');

  if (!config.DATABASE_URL) throw new Error('Database migration failed: DATABASE_URL is not set');
  const migrationClient = postgres(config.DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: path.resolve(__dirname, '../../../migrations'),
    });
  } catch (error) {
    logger.database.info('Failed to run database migrations', { error });
  } finally {
    await migrationClient.end();
  }
};
