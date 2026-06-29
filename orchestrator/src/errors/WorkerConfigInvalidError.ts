export class WorkerConfigInvalidError extends Error {
  constructor(source: string, issues: string) {
    super(`Configuración de workers inválida en "${source}": ${issues}`)
    this.name = 'WorkerConfigInvalidError'
  }
}
