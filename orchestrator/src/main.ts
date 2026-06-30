import { from } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { WorkerOrchestratorLoggerSingleton } from "./services/logger.service";
import { WorkerResolverService } from "./services/workerResolver.service";
import { QueueConsumerService } from "./services/queueConsumer.service";
import { startHttpServer } from "./api/server";

const logger = WorkerOrchestratorLoggerSingleton.instance();

startHttpServer();

from(WorkerResolverService.instance().init())
  .pipe(
    tap(() => QueueConsumerService.instance().start()),
    catchError((err) => {
      logger.error("Error al inicializar el registro de workers", { err });
      process.exit(1);
    }),
  )
  .subscribe();
