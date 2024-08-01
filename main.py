import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
import pygame

# Load environment variables from .env file
load_dotenv()

# Get the API key from the environment variable
api_key = os.getenv("OPENAI_API_KEY")

# Initialize the OpenAI client with the API key
client = OpenAI(api_key=api_key)

def analizar_imagen(url_image, question):
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
    url_image = input("Please enter the image URL:")
    question = input("What do you want to know about this image?")
    
    result = analizar_imagen(url_image, question)
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