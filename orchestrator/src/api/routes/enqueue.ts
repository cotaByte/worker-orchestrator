import { Router, Request, Response } from "express";
import { QueueMessageSchema } from "../../types/queue.zod.validations";
import { QueuePublisherService } from "../../services/queuePublisher.service";
import { QUEUES } from "../../models/queues.model";

const router = Router();

router.post("/enqueue", async (req: Request, res: Response) => {
  const result = QueueMessageSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ ok: false, error: result.error.issues });
    return;
  }

  try {
    await QueuePublisherService.instance().publish(
      QUEUES.WORKER_TASKS,
      result.data,
    );
    res.status(202).json({
      ok: true,
      worker: result.data.worker,
      action: result.data.action,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Queue unavailable" });
  }
});

export default router;
