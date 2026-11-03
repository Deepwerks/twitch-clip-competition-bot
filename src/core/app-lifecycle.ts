import { logger } from '../libs/logger';

type ExitFn = (code?: number) => never;

type AppLifecycleDeps = {
  nodeEnv?: string;
  exit?: ExitFn;
};

const exitInProduction = (code: 0 | 1, deps: AppLifecycleDeps = {}): void => {
  const exit = deps.exit ?? process.exit.bind(process);
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
