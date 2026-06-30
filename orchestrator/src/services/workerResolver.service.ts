import * as fs from "fs";
import * as yaml from "js-yaml";
import { z } from "zod";
import { Logger } from "winston";
import { WorkerOrchestratorLoggerSingleton } from "./logger.service";
import { QueueMessage } from "../types/queue.zod.validations";
import { WorkerNotFoundError } from "../errors/WorkerNotFoundError";
import { WorkerConfigInvalidError } from "../errors/WorkerConfigInvalidError";

export type WorkerConfig = {
  name: string;
  image: string;
};

const WorkerDefinitionSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
});

const WorkersFileSchema = z.object({
  workers: z.array(WorkerDefinitionSchema),
});

export class WorkerResolverService {
  private static _instance: WorkerResolverService;
  private registry: Map<string, WorkerConfig> = new Map();
  private readonly logger: Logger;
  private readonly configPath: string;

  private constructor() {
    this.logger = WorkerOrchestratorLoggerSingleton.instance();
    this.configPath = process.env.WORKERS_CONFIG_PATH ?? "/app/workers.yaml";
  }

  static instance(): WorkerResolverService {
    if (!this._instance) this._instance = new WorkerResolverService();
    return this._instance;
  }

  async init(): Promise<void> {
    const raw = this.readRaw();
    const parsed = this.parseYaml(raw);
    this.registry = this.buildRegistry(parsed);

    this.logger.info("Registro de workers cargado", {
      count: this.registry.size,
      path: this.configPath,
    });
  }

  resolve(message: QueueMessage): WorkerConfig {
    const config = this.registry.get(message.worker);

    if (!config) {
      throw new WorkerNotFoundError(message.worker);
    }

    return config;
  }

  private readRaw(): string {
    try {
      return fs.readFileSync(this.configPath, "utf-8");
    } catch (err) {
      throw new Error(
        `No se pudo leer el registro de workers en "${this.configPath}": ${(err as Error).message}`,
      );
    }
  }

  private parseYaml(raw: string): unknown {
    try {
      return yaml.load(raw);
    } catch (err) {
      throw new Error(
        `Error al parsear el YAML de workers en "${this.configPath}": ${(err as Error).message}`,
      );
    }
  }

  private buildRegistry(parsed: unknown): Map<string, WorkerConfig> {
    const result = WorkersFileSchema.safeParse(parsed);

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new WorkerConfigInvalidError(this.configPath, issues);
    }

    return new Map(
      result.data.workers.map((w) => [
        w.name,
        { name: w.name, image: w.image },
      ]),
    );
  }
}
