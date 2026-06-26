// will her for logs. WInston instance

import { createLogger, format, Logger, transports } from "winston";

export class WorkerOrchestratorLoggerSingleton {
  private static _instance: Logger | null = null;
  static instance() {
    if (this._instance) return this._instance;
    this._instance = createLogger({
      level: "info",
      format: format.combine(
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
      ),
      defaultMeta: { service: "worker-orchestrator" },
      transports: [
        new transports.File({
          filename: "worker-orchestrator.log",
          level: "error",
        }),
      ],
    });

    return this._instance;
  }
}
