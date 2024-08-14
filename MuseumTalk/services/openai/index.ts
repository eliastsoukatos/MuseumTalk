import axios from "axios";
import { Alert } from "react-native";
import EventSource, { EventSourceListener } from "react-native-sse";
import "react-native-url-polyfill/auto";
const OpenAI = () => {
  const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  const instance = axios.create({
    baseURL: "https://api.openai.com/v1",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
  });

  const transcription = async (file: string) => {
    const data = new FormData();

    data.append("file", {
      uri: file,
      name: "audio.m4a",
      type: "audio/m4a",
    } as unknown as Blob);

    data.append("model", "whisper-1");
    try {
      const respose = await instance.post("/audio/transcriptions", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return respose.data.text;
    } catch (error) {
      Alert.alert("Error", "transcription error");
    }
  };

  const analizeImageStream = async (images: string[], question: string, cb?: (data: any) => void, endCb?: () => void) => {
    const prompt = `You are a virtual museum guide that explains the presented images and provides historical context about the artworks shown in the images you are given. Keep your answers shorter than 50 words. Analyze the image and answer the following question:`;

    const data = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: question },
            ...images.map((url) => ({
              type: "image_url",
              image_url: { url },
            })),
          ],
        },
      ],
      max_tokens: 300,
      n: 1,
      stream: true,
    };

    const es = new EventSource("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      debug: true,
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        Authorization: {
          toString: function () {
            return "Bearer " + OPENAI_API_KEY;
          },
        },
      },
    });
    const listener: EventSourceListener = (event) => {
      if (event.type === "open") {
        console.log("Open SSE connection.");
      } else if (event.type === "message" && event.data !== "[DONE]") {
        const data = JSON.parse(event.data ?? "");
        if (data.choices[0].delta.content !== undefined) {
          console.log(data.created, data.choices[0].delta.content);
          if (cb) cb(data.choices[0].delta.content);
        }
      } else if (event.type === "message" && event.data === "[DONE]") {
        if (endCb) endCb();
        es.removeAllEventListeners();
        es.close();
      } else if (event.type === "error") {
        console.error("Connection error:", event.message);
      } else if (event.type === "exception") {
        console.error("Error:", event.message, event.error);
      }
    };

    es.addEventListener("open", listener);
    es.addEventListener("message", listener);
    es.addEventListener("error", listener);
  };

  const analizeImage = async (images: string[], question: string) => {
    try {
      const prompt = `You are a virtual museum guide that explains the presented images and provides historical context about the artworks shown in the images you are given. Keep your answers shorter than 50 words. Analyze the image and answer the following question:`;

      const data = {
        model: "gpt-4o-mini",

        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: [
              { type: "text", text: question },
              ...images.map((url) => ({
                type: "image_url",
                image_url: { url },
              })),
            ],
          },
        ],
        max_tokens: 300,
      };

      const respose = await instance.post("/chat/completions", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Chat response ", respose.data.choices[0].message.content);

      return respose.data.choices[0].message.content as string;
    } catch (error) {
      Alert.alert("Error", "image analize error");
    }
  };

  const textToSpeech = async (input: string) => {
    try {
      const data = {
        model: "tts-1",
        input,
        voice: "alloy",
      };

      const respose = await instance.post("/audio/speech", data, {
        headers: {
          "Content-Type": "application/json",
        },
        responseType: "blob",
      });

      return respose.data;
    } catch (error) {
      Alert.alert("Error", "text to speech error");
    }
  };

  return { transcription, analizeImage, textToSpeech, analizeImageStream };
};

export default OpenAI;
