//functions and helpers to instance docker containers (workers ) to request a action

import { WorkerConfig } from './workerResolver.service'

export async function run(workerConfig: WorkerConfig, _metadata: any): Promise<void> {
  // TODO: implement — launch Docker container for the given worker config
  throw new Error(`workerInstancer.run not implemented for worker: ${workerConfig.name}`)
}
