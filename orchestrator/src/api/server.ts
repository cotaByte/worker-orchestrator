import express from "express";
import enqueueRouter from "./routes/enqueue";

const app = express();
const PORT = 3000;

app.use(express.json());

app.use("/", enqueueRouter);

export function startHttpServer(): void {
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}
