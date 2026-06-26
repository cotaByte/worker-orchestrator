// this services provides functions and the logic to resolve which worker should be instantiated by the params given on te queueMessage

import { QueueMessage } from '../types/queue'

export type WorkerConfig = {
  name: string
}

export async function resolve(message: QueueMessage): Promise<WorkerConfig> {
  // TODO: implement — lookup worker definition from workers.yaml by message.worker
  throw new Error(`workerResolver.resolve not implemented for worker: ${message.worker}`)
}
