// will her for logs. WInston instance

import { createLogger, format, Logger, transports } from "winston";

export class WorkerOrchestratorLoggerSingleton {
  private logger: Logger | null = null;
  public instanceLogger() {
    if (this.logger) return this.logger;

    return createLogger({
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
  }
}
