import exchangeLogger from '@afra/exchange-logger';

export interface ILogger {
  info: (message: string, data?: any) => void;
  error: (message: Error, data?: any) => void;
}

export class Logger implements ILogger {
  info(message: string, data?: any): void {
    if (process.env.APP_ENV !== 'development') {
      if (data) exchangeLogger.logger.child(data).info(message);
      else exchangeLogger.logger.info(message);
    }
  }
  error(message: Error, data?: any): void {
    if (data) exchangeLogger.logger.child(data).error(message);
    else exchangeLogger.logger.error(message);
  }
}
