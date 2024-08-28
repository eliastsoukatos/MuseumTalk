import { Readable } from "stream";
import sharp, { FormatEnum } from "sharp";
import fs from "fs";
import { Job, scheduleJob } from "node-schedule";
export function arrayBufferToStream(arrayBuffer: ArrayBuffer) {
  const buffer = Buffer.from(arrayBuffer);
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export const sleep = (duration: number) => new Promise((resolve, _) => setTimeout(resolve, duration));

export const getBase64ImageSizeInMB = (base64Image: string) => {
  const base64Stripped = base64Image.split(",")[1] || base64Image;

  const sizeInBytes = (base64Stripped.length * 3) / 4;

  const sizeInMB = sizeInBytes / (1024 * 1024);

  return sizeInMB;
};

export const compressBase64Image = async (base64Image: string, outputFormat: keyof FormatEnum = "jpeg", quality = 80) => {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const imageBuffer = Buffer.from(base64Data, "base64");

    const compressedImageBuffer = await sharp(imageBuffer)
      .resize({
        width: 128,
      })
      .toFormat(outputFormat, { quality: quality })
      .toBuffer();

    const compressedBase64Image = compressedImageBuffer.toString("base64");

    return `data:image/jpeg;base64,${compressedBase64Image}`;
  } catch (error) {
    console.error("Error al comprimir la imagen:", error);
    return null;
  }
};

export class JobScheduler {
  static deleteFile(path: string) {
    const min = 5 * 60;
    const mill = min * 1000;
    scheduleJob(`delete:${path}`, Date.now() + mill, () => {
      fs.unlink(path, (err) => {
        if (err) {
          console.log(`error deleting audio file ${path}`, err);
        }
        console.log(`audio file ${path} deleted`);
      });
    });
  }
}
