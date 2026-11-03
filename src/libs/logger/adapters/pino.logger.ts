import pino, { Logger as PinoLogger, TransportSingleOptions } from 'pino';
import { ILogger, LogMeta } from '../interfaces/logger.interface';

export class PinoLoggerAdapter implements ILogger {
  private readonly logger: PinoLogger;

  constructor(logger?: PinoLogger) {
    this.logger =
      logger ??
      pino({
        level: process.env.LOG_LEVEL || 'INFO',
        timestamp: pino.stdTimeFunctions.isoTime,

        formatters: {
          level(label) {
            return { level: label };
          },
        },

        messageKey: 'message',
        serializers: {
          err: pino.stdSerializers.err,
          error: pino.stdSerializers.err,
        },

        transport: createTransport(),
      });
  }

  debug(message: string, meta?: LogMeta): void {
    this.logger.debug(this.normalizeMeta(meta), message);
  }

  info(message: string, meta?: LogMeta): void {
    this.logger.info(this.normalizeMeta(meta), message);
  }

  warn(message: string, meta?: LogMeta): void {
    this.logger.warn(this.normalizeMeta(meta), message);
  }

  error(message: string, meta?: LogMeta): void {
    this.logger.error(this.normalizeMeta(meta), message);
  }

  fatal(message: string, meta?: LogMeta): void {
    this.logger.fatal(this.normalizeMeta(meta), message);
  }

  child(bindings: LogMeta): ILogger {
    return new PinoLoggerAdapter(this.logger.child(bindings));
  }

  private normalizeMeta(meta?: LogMeta): LogMeta {
    if (!meta) {
      return {};
    }

    if ('error' in meta) {
      const { error, ...rest } = meta;

      if (error instanceof Error) {
        return { ...rest, err: error };
      }

      if (error !== undefined && error !== null) {
        const wrapped =
          typeof error === 'string' ? new Error(error) : new Error(JSON.stringify(error));

        return { ...rest, err: wrapped };
      }

      return rest;
    }

    return meta;
  }
}

function createTransport(): TransportSingleOptions | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;

  return {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      messageFormat: '[{context}] {message}',
    },
  };
}
