import { ILogger, Logger } from "./logger.service.ts";


export class BaseLogUtil {
  public log: ILogger;
  constructor() {
    if (this.log === undefined) this.log = new Logger();
  }
}