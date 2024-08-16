import { PassThrough } from "stream";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import OpenAI from "openai";
import { arrayBufferToStream, compressBase64Image, getBase64ImageSizeInMB } from "./utils";
import { sleep } from "openai/core";

class AudioGenerationManager {
  openai: OpenAI;
  audioStream: Map<string, fs.WriteStream>;
  audioTranscodeStream: Map<string, PassThrough>;

  constructor() {
    this.openai = new OpenAI();
    this.audioStream = new Map<string, fs.WriteStream>();
    this.audioTranscodeStream = new Map<string, PassThrough>();
  }

  generate = async (data: any, id: string) => {
    const prompt = `You are a virtual museum guide that explains the presented images and provides historical context about the artworks shown in the images you are given. Keep your answers shorter than 50 words. Analyze the image and answer the following question:`;

    console.log("Image size: ");
    data.url_images.map(async (url: string) => {
      console.log("Image size: ", getBase64ImageSizeInMB(url), "mb");
      console.log("Compressed Image size: ", getBase64ImageSizeInMB((await compressBase64Image(url, "jpg", 5)) ?? ""), "mb");
    });

    const images: any = await Promise.all(
      data.url_images.map(async (url: string) => {
        const compressedImage = await compressBase64Image(url, "jpg", 5);
        console.log("Image size: ", getBase64ImageSizeInMB(url), "mb");
        console.log("Compressed Image size: ", getBase64ImageSizeInMB(compressedImage ?? ""), "mb");

        return compressedImage;
      })
    );

    console.log(
      images.map((url: string) => ({
        type: "image_url",
        image_url: { url },
      }))
    );

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: data.question },
            ...images.map((url: string) => ({
              type: "image_url",
              image_url: { url },
            })),
          ],
        },
      ],
      max_tokens: 300,
      stream: true,
    });

    let sentence = "";
    for await (const chunk of completion) {
      sentence += chunk.choices[0].delta.content;
      if (chunk.choices[0].delta.content == ".") {
        this.createAudio(sentence, id);
        sentence = "";
      }
    }
  };

  createAudio = async (text: string, id: string) => {
    console.log("creating audio for: ", text);
    const response = await this.openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    this.audioTranscodeStream.get(id)?.write(Buffer.from(await response.arrayBuffer()));

    console.log("audio sended to transcode");
  };

  transcodeAudio = async (id: string) => {
    const audios = this.audioTranscodeStream.get(id);

    if (!audios) return;
    for await (const chunk of audios) {
      console.log("transcoding audio");
      await new Promise((resolve, reject) => {
        ffmpeg(arrayBufferToStream(chunk))
          .audioCodec("libmp3lame")
          .format("mp3")
          .on("end", resolve)
          .pipe(this.audioStream.get(id), { end: false });
      });
      console.log("audio created");
    }
  };
}

export default AudioGenerationManager;
