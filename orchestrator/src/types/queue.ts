import { z } from 'zod'

export type QueueMessage = {
  worker: string
  metadata: any
}

export const QueueMessageSchema = z.object({
  worker: z.string().min(1),
  metadata: z.any(),
})
