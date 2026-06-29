import * as amqp from 'amqplib'
import { Logger } from 'winston'
import { WorkerOrchestratorLoggerSingleton } from './logger.service'

export class QueuePublisherService {
  private static _instance: QueuePublisherService
  private channel: amqp.Channel | null = null
  private readonly logger: Logger
  private readonly url: string

  private constructor() {
    this.logger = WorkerOrchestratorLoggerSingleton.instance()
    this.url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672'
  }

  static instance(): QueuePublisherService {
    if (!this._instance) this._instance = new QueuePublisherService()
    return this._instance
  }

  async publish(queue: string, message: object): Promise<void> {
    const channel = await this.getChannel()
    await channel.assertQueue(queue, { durable: true })
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true })
  }

  private async getChannel(): Promise<amqp.Channel> {
    if (this.channel) return this.channel

    const connection = await amqp.connect(this.url)
    this.channel = await connection.createChannel()

    connection.on('error', (err) => {
      this.logger.error('QueuePublisher: error en conexión RabbitMQ', { err })
      this.channel = null
    })
    connection.on('close', () => {
      this.logger.warn('QueuePublisher: conexión RabbitMQ cerrada')
      this.channel = null
    })

    return this.channel
  }
}
