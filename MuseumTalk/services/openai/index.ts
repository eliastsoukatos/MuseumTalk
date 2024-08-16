import axios from "axios";
import { Alert } from "react-native";

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

  const analizeImage = async (images: string[], question: string) => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    try {
      const prompt = `You are a virtual museum guide that explains the presented images and provides historical context about the artworks shown in the images you are given. Keep your answers shorter than 50 words. Analyze the image and answer the following question:`;

      const data = {
        url_images: images,
        question,
      };

      const respose = await axios.post(`${API_URL}/start-processing`, data, {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "69420",
        },
      });

      console.log("Chat response  ", respose.data);

      return `${API_URL}/audio-stream/${respose.data.task_id}` as string;
    } catch (error) {
      Alert.alert("Error", "image analize error");
      console.log(error);
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

      console.log(respose.data);

      return respose.data;
    } catch (error) {
      Alert.alert("Error", "text to speech error");
    }
  };

  return { transcription, analizeImage, textToSpeech };
};

export default OpenAI;
