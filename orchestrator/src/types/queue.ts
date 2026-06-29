import { z } from "zod";
import { WorkerAction } from "../services/workerInstancer.service";

export type QueueMessage = {
  worker: string;
  action: WorkerAction;
  metadata: any;
};

export const QueueMessageSchema = z.object({
  worker: z.string().min(1),
  action: z.enum(["run", "stop", "remove", "restart"]).default("run"),
  metadata: z.any(),
});
