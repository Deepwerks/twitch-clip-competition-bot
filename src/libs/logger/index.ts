import { PinoLoggerAdapter } from './adapters/pino.logger';
import { ILogger } from './interfaces/logger.interface';

const rootLogger: ILogger = new PinoLoggerAdapter();

export const logger = Object.assign(rootLogger, {
  app: rootLogger.child({ context: 'App' }),
  discord: rootLogger.child({ context: 'DiscordClient' }),
  database: rootLogger.child({ context: 'Database' }),
  redis: rootLogger.child({ context: 'Redis' }),
  web: rootLogger.child({ context: 'Web' }),
  http: rootLogger.child({ context: 'Http' }),
});

export const drizzleLogger = {
  logQuery(query: string, params: unknown[]) {
    logger.database.debug('SQL query executed', {
      query,
      params,
    });
  },
};
