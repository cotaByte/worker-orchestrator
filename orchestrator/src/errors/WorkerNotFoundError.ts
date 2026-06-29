export class WorkerNotFoundError extends Error {
  constructor(workerName: string) {
    super(`No se encontró definición de worker para: "${workerName}"`)
    this.name = 'WorkerNotFoundError'
  }
}
