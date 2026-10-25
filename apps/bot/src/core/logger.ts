import pino from 'pino';

export type Logger = pino.Logger;

export function createLogger(level: string): Logger {
  return pino({
    level,
    base: { service: 'nervana' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}
