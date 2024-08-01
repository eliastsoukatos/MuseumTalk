import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
import pygame
import pyaudio
import wave
import tempfile
import threading
import sys

# Load environment variables from .env file
load_dotenv()

# Get the API key from the environment variable
api_key = os.getenv("OPENAI_API_KEY")

# Initialize the OpenAI client with the API key
client = OpenAI(api_key=api_key)

def record_audio(filename="question.wav"):
    CHUNK = 1024
    FORMAT = pyaudio.paInt16
    CHANNELS = 1
    RATE = 44100

    p = pyaudio.PyAudio()

    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK)

    print("Recording... Press Enter to stop.")

    frames = []
    recording = True

    def input_thread():
        nonlocal recording
        input()
        recording = False

    thread = threading.Thread(target=input_thread)
    thread.start()

    while recording:
        data = stream.read(CHUNK)
        frames.append(data)

    print("Recording finished.")

    stream.stop_stream()
    stream.close()
    p.terminate()

    wf = wave.open(filename, 'wb')
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))
    wf.close()

    return filename

def transcribe_audio(audio_file_path):
    with open(audio_file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1", 
            file=audio_file
        )
    return transcription.text

def analyze_image(url_image, question):
    try:
        context = ("You are a virtual museum guide that explains the presented images and provides historical"
                   "context about the artworks shown in the images you are given."
                   "Keep your answers shorter than 50 words."
                    "Analyze the image and answer the following question:")
    
        response = client.chat.completions.create(
            model="gpt-4o-mini", 
            messages=[
                {
                    "role": "system",
                    "content": context
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": question},
                        {
                            "type": "image_url",
                            "image_url": {"url": url_image},
                        },
                    ],
                }
            ],
            max_tokens=300,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"An error occurred: {str(e)}"

def text_to_speech(text, file_name="speech.mp3"):
    speech_file_path = Path(__file__).parent / file_name
    
    # Check if file exists and delete it
    if speech_file_path.exists():
        speech_file_path.unlink()
    
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text
        )
        response.stream_to_file(speech_file_path)
        return str(speech_file_path)
    except Exception as e:
        return f"Error generating speech: {str(e)}"

def play_audio(file_path):
    pygame.mixer.init()
    pygame.mixer.music.load(file_path)
    pygame.mixer.music.play()
    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)

def main():
    url_image = input("Please enter the image URL: ")
    print("Please speak your question about the image. Press Enter when you're done speaking.")
    audio_file = record_audio()
    question = transcribe_audio(audio_file)
    print(f"Transcribed question: {question}")
    
    result = analyze_image(url_image, question)
    print("\nAnalysis result:")
    print(result)
    
    audio_file = text_to_speech(result)
    if not audio_file.startswith("Error"):
        print(f"\nPlaying audio analysis...")
        play_audio(audio_file)
    else:
        print(audio_file)

if __name__ == "__main__":
    main()