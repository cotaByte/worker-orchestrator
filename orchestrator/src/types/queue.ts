import { z } from "zod";
import { QUEUE_MESSAGE_ACTIONS, WorkerAction } from "../constants/queues";

export type QueueMessage = {
  worker: string;
  action: WorkerAction;
  metadata: any;
};

export const QueueMessageSchema = z.object({
  worker: z.string().min(1),
  action: z.enum(QUEUE_MESSAGE_ACTIONS).default("run"),
  metadata: z.any(),
});
