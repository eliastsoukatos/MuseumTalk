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

def analizar_imagen(url_imagen, pregunta):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Updated to the correct model name
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": pregunta},
                        {
                            "type": "image_url",
                            "image_url": {"url": url_imagen},
                        },
                    ],
                }
            ],
            max_tokens=300,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Ocurrió un error: {str(e)}"

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
    url_imagen = input("Por favor, ingresa la URL de la imagen: ")
    pregunta = input("¿Qué quieres saber sobre esta imagen? ")
    
    resultado = analizar_imagen(url_imagen, pregunta)
    print("\nResultado del análisis:")
    print(resultado)
    
    audio_file = text_to_speech(resultado)
    if not audio_file.startswith("Error"):
        print(f"\nReproduciendo análisis en audio...")
        play_audio(audio_file)
    else:
        print(audio_file)

if __name__ == "__main__":
    main()