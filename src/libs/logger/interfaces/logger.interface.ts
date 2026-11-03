export type LogMeta = Record<string, unknown>;

export interface ILogger {
  debug(msg: string, meta?: LogMeta): void;
  info: (msg: string, meta?: LogMeta) => void;
  warn: (msg: string, meta?: LogMeta) => void;
  error: (msg: string, meta?: LogMeta) => void;
  fatal: (msg: string, meta?: LogMeta) => void;

  child(bindings: LogMeta): ILogger;
}
