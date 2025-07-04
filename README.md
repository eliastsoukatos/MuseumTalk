# MuseumTalk

MuseumTalk is an AI-powered museum guide that enhances visitor experiences through voice interaction and artifact identification. The project combines a Python backend with an Expo React Native mobile app to deliver real-time explanations and insights about museum pieces.

## Features

- **AI museum assistant** that provides contextual information about artifacts
- **Artifact identification** using accession numbers via The Met's public API
- **Interactive explanations** with natural language responses
- **Cross‑platform mobile app** built with Expo and React Native

## Use Cases

- Visitors receive personalized audio guides on their own devices
- Institutions can offer engaging digital tours without dedicated hardware
- Researchers can experiment with new ways of presenting collections

## Tech Stack

- **Python** backend leveraging OpenAI's API
- **Expo / React Native** mobile application in the `MuseumTalk` directory
- **The Met Collection API** for artifact data

## Installation

1. Create a virtual environment and activate it

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install Python dependencies

   ```bash
   pip install -r requirements.txt
   ```

3. Install mobile dependencies

   ```bash
   cd MuseumTalk
   npm install
   ```

## Running the Project

1. Start the Python backend

   ```bash
   python3 main.py
   ```

2. In another terminal, run the mobile app

   ```bash
   cd MuseumTalk
   npx expo start
   ```

Follow the prompts to open the app on an emulator, simulator, or device.

## Repository Structure

- `main.py` – command line interface for the AI museum guide
- `metapi.py` – helper functions for The Met API
- `MuseumTalk/` – React Native application
- `docs/` – project documentation
- `examples/` – sample scripts (placeholders)
- `data/` – example data files (placeholders)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the [MIT License](LICENSE).
