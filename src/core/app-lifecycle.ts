import { logger } from '../libs/logger';
import { redisProvider } from '../libs/redis/redis';
import { twitchCompetitionScheduler } from '../services/schedulers';

type ExitFn = (code?: number) => never;

type AppLifecycleDeps = {
  nodeEnv?: string;
  exit?: ExitFn;
};

const exitInProduction = async (code: 0 | 1, deps: AppLifecycleDeps = {}) => {
  const exit = deps.exit ?? process.exit.bind(process);

  await redisProvider.close();
  twitchCompetitionScheduler.stop();

  exit(code);
};

export const shutdown = async (signal: string, deps: AppLifecycleDeps = {}): Promise<void> => {
  logger.app.info(`\n[app] ${signal} received - shutting down...`);
  exitInProduction(signal === 'uncaughtException' ? 1 : 0, deps);
};

export const handleStartupFailure = (err: unknown, deps: AppLifecycleDeps = {}): void => {
  logger.app.fatal('Fatal startup error', { error: err });
  exitInProduction(1, deps);
};
