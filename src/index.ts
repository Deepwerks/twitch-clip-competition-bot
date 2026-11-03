import { handleStartupFailure, shutdown } from './core/app-lifecycle';
import { config } from './core/config';
import { logger } from './libs/logger';
import { runDatabaseMigrations } from './services/database/migrate';
import { discordClient } from './services/discord-client/discord-client';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const bootstrap = async () => {
  if (config.DATABASE_URL) {
    await runDatabaseMigrations();
  }

  logger.app.info('Bootstrapping application...');

  await discordClient.init();
};

bootstrap().catch(handleStartupFailure);

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.app.error('Uncaught exception:', { error: err });
  shutdown('uncaughtException');
});
