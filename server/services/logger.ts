export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'PERF';

export class StructuredLogger {
  private formatMessage(level: LogLevel, context: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      context,
      message,
      ...(data !== undefined ? { data } : {})
    };
    return JSON.stringify(payload);
  }

  public info(context: string, message: string, data?: any) {
    console.log(this.formatMessage('INFO', context, message, data));
  }

  public warn(context: string, message: string, data?: any) {
    console.warn(this.formatMessage('WARN', context, message, data));
  }

  public error(context: string, message: string, error?: any) {
    const errorData = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    console.error(this.formatMessage('ERROR', context, message, errorData));
  }

  public perf(context: string, operation: string, durationMs: number, extra?: any) {
    console.log(this.formatMessage('PERF', context, `${operation} completed in ${durationMs}ms`, {
      durationMs,
      ...extra
    }));
  }
}

export const logger = new StructuredLogger();
