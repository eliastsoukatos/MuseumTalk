import express, { Request, Response } from "express";
import { PassThrough } from "stream";
import { v4 as uuidv4 } from "uuid";
import { createReadStream } from "tail-file-stream";
import fs from "fs";
import AudioGenerationManager from "./audio";
import { JobScheduler } from "./utils";

const app = express();
const audioManager = new AudioGenerationManager();
const audioListened = {};

const getFilePath = (id: string) => `speech-${id}-museum.mp3`;

app.use(express.urlencoded());

app.use(
  express.json({
    limit: "25mb",
  })
);

app.get("/audio-stream/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  console.log("User Connected to stream");
  if (audioListened[id]) {
    res.header({
      "Content-Type": "audio/mpeg",
      "Content-Length": 0,
    });
    return res.end();
  }
  res.setHeader("Content-Type", "audio/mpeg");

  audioListened[id] = true;
  const readStream = createReadStream(getFilePath(id), { start: 5, autoWatch: true });

  readStream?.pipe(res);

  readStream?.on("error", (err) => {
    console.error("Error en la transmisión del audio:", err);
    res.status(500).send("Error en la transmisión del audio.");
  });

  req.on("close", () => {
    console.log("audio ended?");
    readStream?.destroy();
    res.end();
  });
});

app.post("/start-processing", (req, res) => {
  const data = req.body;
  const id = uuidv4();
  audioManager.audioStream.set(id, fs.createWriteStream(getFilePath(id)));
  JobScheduler.deleteFile(getFilePath(id));
  audioManager.audioTranscodeStream.set(id, new PassThrough());
  audioManager.generate(data, id);
  audioManager.transcodeAudio(id);
  res.status(202).json({ data: "success", task_id: `${id}` });
});

const port = 9000;
app.listen(port, () => {
  console.log(`server running...`);
});
