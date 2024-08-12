import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
import pyaudio
import wave
import tempfile
import threading
import sys
import io
import queue
import simpleaudio as sa
import time
from pydub import AudioSegment

# Load environment variables from .env file
load_dotenv()

# Get the API key from the environment variable
api_key = os.getenv("OPENAI_API_KEY")

# Initialize the OpenAI client with the API key
client = OpenAI(api_key=api_key)

# Adjust this value (in seconds) to control the timing between chunks
CHUNK_DELAY = 0.1

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

def analyze_image_stream(url_image, question):
    try:
        context = ("You are a virtual museum guide that explains the presented images and provides historical "
                   "context about the artworks shown in the images you are given. "
                   "Keep your answers around 200 words. "
                   "Analyze the image and answer the following question:")
    
        stream = client.chat.completions.create(
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
            stream=True,
        )
        return stream
    except Exception as e:
        return f"An error occurred: {str(e)}"

def text_to_speech_stream(text):
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text
        )
        return response.content
    except Exception as e:
        print(f"Error generating speech: {str(e)}")
        return None

class AudioPlayer:
    def __init__(self):
        self.audio_queue = queue.Queue()
        self.is_playing = False
        self.play_obj = None

    def append_audio(self, audio_data):
        audio = AudioSegment.from_mp3(io.BytesIO(audio_data))
        audio = audio.set_channels(1)  # Convert to mono
        audio = audio.set_frame_rate(44100)  # Set sample rate to 44100
        self.audio_queue.put(audio)

    def play_audio(self):
        self.is_playing = True
        while self.is_playing:
            try:
                audio = self.audio_queue.get(timeout=1)
                audio_bytes = audio.raw_data
                self.play_obj = sa.play_buffer(audio_bytes, 1, 2, 44100)
                self.play_obj.wait_done()
            except queue.Empty:
                time.sleep(0.1)
            except Exception as e:
                print(f"Error playing audio: {str(e)}")
                time.sleep(0.1)
        print("Audio playback finished.")

    def start_playback(self):
        if not self.is_playing:
            threading.Thread(target=self.play_audio, daemon=True).start()

    def stop_playback(self):
        self.is_playing = False
        if self.play_obj:
            self.play_obj.stop()

def process_text_and_audio(text_queue, audio_player):
    buffer = ""
    while True:
        try:
            text_chunk = text_queue.get(timeout=5)
            if text_chunk is None:  # End of stream
                break
            
            buffer += text_chunk
            sentences = buffer.split('.')
            
            for sentence in sentences[:-1]:
                sentence = sentence.strip() + '.'
                if sentence:
                    audio_data = text_to_speech_stream(sentence)
                    if audio_data:
                        audio_player.append_audio(audio_data)
                        if not audio_player.is_playing:
                            audio_player.start_playback()
            
            buffer = sentences[-1]
            
        except queue.Empty:
            print("No text data received for 5 seconds, stopping processing.")
            break
    
    # Process any remaining text
    if buffer:
        audio_data = text_to_speech_stream(buffer)
        if audio_data:
            audio_player.append_audio(audio_data)
    
    # Wait for all audio to finish playing
    while not audio_player.audio_queue.empty() or audio_player.is_playing:
        time.sleep(0.5)
    
    audio_player.stop_playback()

def main():
    url_image = input("Please enter the image URL: ")
    print("Please speak your question about the image. Press Enter when you're done speaking.")
    audio_file = record_audio()
    question = transcribe_audio(audio_file)
    print(f"Transcribed question: {question}")
    
    text_stream = analyze_image_stream(url_image, question)
    
    text_queue = queue.Queue()
    audio_player = AudioPlayer()
    
    # Start text processing and TTS thread
    process_thread = threading.Thread(target=process_text_and_audio, args=(text_queue, audio_player))
    process_thread.start()
    
    print("\nAnalysis result:")
    try:
        for chunk in text_stream:
            if chunk.choices[0].delta.content is not None:
                text_chunk = chunk.choices[0].delta.content
                print(text_chunk, end="", flush=True)
                text_queue.put(text_chunk)
    except Exception as e:
        print(f"\nError during text streaming: {str(e)}")
    finally:
        text_queue.put(None)  # Signal end of text stream
    
    process_thread.join()

if __name__ == "__main__":
    main()
