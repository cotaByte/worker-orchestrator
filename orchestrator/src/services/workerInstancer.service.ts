import Dockerode from "dockerode";
import { Logger } from "winston";
import { QUEUES } from "../constants/queues";
import { WorkerOrchestratorLoggerSingleton } from "./logger.service";
import { QueuePublisherService } from "./queuePublisher.service";
import { WorkerConfig } from "./workerResolver.service";

export type WorkerAction = "run" | "stop" | "remove" | "restart";
export type WorkerStatus = "started" | "stopped" | "removed" | "restarted";

export type WorkerEvent = {
  worker: string;
  action: WorkerAction;
  containerId: string;
  status: WorkerStatus;
  timestamp: string;
};

export class WorkerInstancerService {
  private static _instance: WorkerInstancerService;
  private readonly docker: Dockerode;
  private readonly logger: Logger;

  private constructor() {
    this.docker = new Dockerode();
    this.logger = WorkerOrchestratorLoggerSingleton.instance();
  }

  static instance(): WorkerInstancerService {
    if (!this._instance) this._instance = new WorkerInstancerService();
    return this._instance;
  }

  async run(
    workerConfig: WorkerConfig,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const envVars = this.metadataToEnvVars(metadata);

    const container = await this.docker.createContainer({
      Image: workerConfig.image,
      Env: envVars,
      Labels: {
        "orchestrator.worker": workerConfig.name,
        "orchestrator.started-at": new Date().toISOString(),
      },
      HostConfig: { AutoRemove: false },
    });

    await container.start();

    const containerId = container.id;
    this.logger.info("Contenedor iniciado", {
      worker: workerConfig.name,
      containerId,
    });
    await this.publishEvent({
      worker: workerConfig.name,
      action: "run",
      containerId,
      status: "started",
      timestamp: new Date().toISOString(),
    });
  }

  async stop(
    workerConfig: WorkerConfig,
    metadata: { containerId: string },
  ): Promise<void> {
    const { containerId } = metadata;
    await this.docker.getContainer(containerId).stop();

    this.logger.info("Contenedor detenido", {
      worker: workerConfig.name,
      containerId,
    });
    await this.publishEvent({
      worker: workerConfig.name,
      action: "stop",
      containerId,
      status: "stopped",
      timestamp: new Date().toISOString(),
    });
  }

  async remove(
    workerConfig: WorkerConfig,
    metadata: { containerId: string },
  ): Promise<void> {
    const { containerId } = metadata;
    await this.docker.getContainer(containerId).remove({ force: true });

    this.logger.info("Contenedor eliminado", {
      worker: workerConfig.name,
      containerId,
    });
    await this.publishEvent({
      worker: workerConfig.name,
      action: "remove",
      containerId,
      status: "removed",
      timestamp: new Date().toISOString(),
    });
  }

  async restart(
    workerConfig: WorkerConfig,
    metadata: { containerId: string },
  ): Promise<void> {
    const { containerId } = metadata;
    await this.docker.getContainer(containerId).restart();

    this.logger.info("Contenedor reiniciado", {
      worker: workerConfig.name,
      containerId,
    });
    await this.publishEvent({
      worker: workerConfig.name,
      action: "restart",
      containerId,
      status: "restarted",
      timestamp: new Date().toISOString(),
    });
  }

  private metadataToEnvVars(metadata: Record<string, unknown>): string[] {
    return Object.entries(metadata).map(
      ([k, v]) => `${k.toUpperCase()}=${String(v)}`,
    );
  }

  private async publishEvent(event: WorkerEvent): Promise<void> {
    try {
      await QueuePublisherService.instance().publish(QUEUES.WORKER_EVENTS, event);
      this.logger.info("Evento publicado", {
        queue: QUEUES.WORKER_EVENTS,
        worker: event.worker,
        status: event.status,
      });
    } catch (err) {
      this.logger.error("Error al publicar evento de worker", { err, event });
    }
  }
}
