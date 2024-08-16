import express, { Request, Response } from "express";
import { PassThrough } from "stream";
import { v4 as uuidv4 } from "uuid";
import { createReadStream } from "tail-file-stream";
import fs from "fs";
import AudioGenerationManager from "./audio";

const app = express();
const audioManager = new AudioGenerationManager();

const getFilePath = (id: string) => `speech-${id}-museum.mp3`;

app.use(express.urlencoded());

app.use(
  express.json({
    limit: "25mb",
  })
);

app.get("/audio-stream/:id", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "audio/mpeg");

  const id = req.params.id;

  const readStream = createReadStream(getFilePath(id), { start: 5, autoWatch: true });

  readStream?.pipe(res);

  readStream?.on("error", (err) => {
    console.error("Error en la transmisión del audio:", err);
    res.status(500).send("Error en la transmisión del audio.");
  });

  req.on("close", () => {
    readStream?.destroy();
  });
});

app.post("/start-processing", (req, res) => {
  const data = req.body;
  const id = uuidv4();
  audioManager.audioStream.set(id, fs.createWriteStream(getFilePath(id)));
  audioManager.audioTranscodeStream.set(id, new PassThrough());
  audioManager.generate(data, id);
  audioManager.transcodeAudio(id);
  res.status(202).json({ data: "success", task_id: `${id}` });
});

const port = 8080;
app.listen(port, () => {
  console.log(`server running...`);
});
