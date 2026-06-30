// will subscribe to rabbitMQ queue poll and will be handling the creation and resolving of the worker requested

import * as amqp from "amqplib";
import { Logger } from "winston";
import { EMPTY, Observable, from, timer } from "rxjs";
import { catchError, mergeMap, retry, switchMap, tap } from "rxjs/operators";
import { WorkerOrchestratorLoggerSingleton } from "./logger.service";
import { QueueMessageSchema } from "../types/queue";
import { WorkerResolverService } from "./workerResolver.service";
import { WorkerInstancerService } from "./workerInstancer.service";
import { WorkerAction } from "../constants/queues";

function connectionObservable(url: string): Observable<amqp.Channel> {
  return from(amqp.connect(url)).pipe(
    switchMap(
      (connection) =>
        new Observable<amqp.Channel>((subscriber) => {
          const onError = (err: Error) => subscriber.error(err);
          const onClose = () =>
            subscriber.error(new Error("RabbitMQ connection closed"));

          connection.on("error", onError);
          connection.on("close", onClose);

          from(connection.createChannel()).subscribe({
            next: (channel) => subscriber.next(channel),
            error: (err) => subscriber.error(err),
          });

          return () => {
            connection.off("error", onError);
            connection.off("close", onClose);
          };
        }),
    ),
  );
}

function fromQueue(
  channel: amqp.Channel,
  queueName: string,
  prefetch: number,
): Observable<{ msg: amqp.ConsumeMessage; channel: amqp.Channel }> {
  const dlqName = `${queueName}.failed`;

  return from(
    channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": dlqName,
      },
    }),
  ).pipe(
    switchMap(() => from(channel.assertQueue(dlqName, { durable: true }))),
    tap(() => channel.prefetch(prefetch)),
    switchMap(
      () =>
        new Observable<{ msg: amqp.ConsumeMessage; channel: amqp.Channel }>(
          (subscriber) => {
            let consumerTag: string;

            from(
              channel.consume(queueName, (msg) => {
                if (!msg) {
                  subscriber.complete();
                  return;
                }
                subscriber.next({ msg, channel });
              }),
            ).subscribe({
              next: ({ consumerTag: tag }) => {
                consumerTag = tag;
              },
              error: (err) => subscriber.error(err),
            });

            return () => {
              if (consumerTag) channel.cancel(consumerTag);
            };
          },
        ),
    ),
  );
}

export class QueueConsumerService {
  private static _instance: QueueConsumerService;
  private readonly logger: Logger;
  private readonly url: string;
  private readonly queueName: string;
  private readonly prefetch: number;

  private constructor() {
    this.logger = WorkerOrchestratorLoggerSingleton.instance();
    this.url = process.env.RABBITMQ_URL ?? "amqp://guest:guest@rabbitmq:5672";
    this.queueName = process.env.RABBITMQ_QUEUE ?? "worker-tasks";
    this.prefetch = parseInt(process.env.RABBITMQ_PREFETCH ?? "5", 10);
  }

  static instance(): QueueConsumerService {
    if (!this._instance) this._instance = new QueueConsumerService();
    return this._instance;
  }

  start(): void {
    connectionObservable(this.url)
      .pipe(
        tap(() =>
          this.logger.info("Conectado a RabbitMQ", { queue: this.queueName }),
        ),
        switchMap((channel) =>
          fromQueue(channel, this.queueName, this.prefetch),
        ),
        mergeMap(
          ({ msg, channel }) =>
            from(this.handleMessage(msg, channel)).pipe(
              catchError((err) => {
                channel.nack(msg, false, false);
                this.logger.error("Error inesperado, mensaje enviado a DLQ", {
                  err,
                });
                return EMPTY;
              }),
            ),
          this.prefetch,
        ),
        retry({
          delay: (error, attempt) => {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30_000);
            this.logger.warn(`Reintento #${attempt} en ${delay}ms`, {
              error: (error as Error).message,
            });
            return timer(delay);
          },
        }),
      )
      .subscribe();
  }

  private async handleMessage(
    msg: amqp.ConsumeMessage,
    channel: amqp.Channel,
  ): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(msg.content.toString());
    } catch {
      channel.nack(msg, false, false);
      this.logger.error("Mensaje con JSON inválido enviado a DLQ");
      return;
    }

    const result = QueueMessageSchema.safeParse(parsed);
    if (!result.success) {
      channel.nack(msg, false, false);
      this.logger.error("Mensaje inválido enviado a DLQ", {
        error: result.error.issues,
      });
      return;
    }

    try {
      const workerConfig = WorkerResolverService.instance().resolve(
        result.data,
      );
      const instancer = WorkerInstancerService.instance();
      const actions: Record<WorkerAction, () => Promise<void>> = {
        run: () => instancer.run(workerConfig, result.data.metadata),
        stop: () => instancer.stop(workerConfig, result.data.metadata),
        remove: () => instancer.remove(workerConfig, result.data.metadata),
        restart: () => instancer.restart(workerConfig, result.data.metadata),
      };
      await actions[result.data.action]();

      channel.ack(msg);
      this.logger.info("Mensaje procesado exitosamente", {
        worker: result.data.worker,
        action: result.data.action,
      });
    } catch (err) {
      channel.nack(msg, false, false);
      this.logger.error("Error al procesar mensaje, enviado a DLQ", {
        worker: result.data.worker,
        err,
      });
    }
  }
}
