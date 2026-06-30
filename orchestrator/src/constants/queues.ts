export const QUEUES = {
  WORKER_TASKS: "worker-tasks",
  WORKER_TASKS_FAILED: "worker-tasks.failed",
  WORKER_EVENTS: "worker-events",
} as const;

export const QUEUE_MESSAGE_ACTIONS = [
  "run",
  "stop",
  "remove",
  "restart",
] as const;

export const WORKER_STATUS = ["started", "stopped", "removed", "restarted"];

export type WorkerAction = (typeof QUEUE_MESSAGE_ACTIONS)[number];
export type WorkerStatus = (typeof WORKER_STATUS)[number];
