<div align="center">
  <img src="https://raw.githubusercontent.com/VOICEVOX/voicevox/master/public/icon.png" alt="VOICEVOX Logo" width="120" height="120">
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src ="https://avatars.githubusercontent.com/u/42564322?s=200&v=4" alt="Anki Logo" width="120" height="120">
  <h1>YomiVox</h1>
</div>

## Features

- **Yomitan-Style Selection**: Hold `Ctrl` and hover over any Japanese sentence to instantly select it and bring up the audio popup.
- **AnkiConnect Integration**: Instantly append the generated audio to the last added card in your Anki deck with a single click.

## Installation

### Firefox
1. Go to the [Releases page](https://github.com/shirubaarison/YomiVox/releases) of this repository.
2. Download the latest `yomivox.zip` file.
3. Open a new tab and go to `about:addons` (or click the puzzle piece icon -> Manage Extensions).
4. Click the **Gear icon** (⚙️) in the top right.
5. Select **"Install Add-on From File..."** and choose the `yomivox.zip` file you downloaded.

## Requirements

You must have the **VOICEVOX Engine** running locally on your computer.
- Download and run the VOICEVOX app.
- Ensure the engine is accessible at `http://127.0.0.1:50021`.

## Usage

### Reading Text
1. Hold down the **`Ctrl`** key.
2. Move your mouse over any Japanese text on a webpage.
3. The extension will automatically highlight the sentence and display a mini popup next to your cursor.
4. Click the **Play (▶)** button to hear the audio!

### Anki Integration
To use the `➕` button and send audio directly to your flashcards:

1. **Install AnkiConnect**: Make sure you have the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on installed in Anki.
2. **Set the Target Field**: Open the extension popup by clicking its icon in the Firefox toolbar. Under **"Anki Audio Field"**, type the exact name of the field where you want the audio tag to be appended (e.g., `SentenceAudio`).
3. **Add to Card**: Click the **Add (➕)** button in the reader popup. The audio file will be saved to your Anki media folder and appended to the last card you added/edited today!

## Acknowledgments

This extension wouldn't be possible without these amazing projects:

- **[VOICEVOX](https://voicevox.hiroshiba.jp/)**: For the incredible, high-quality open-source Japanese text-to-speech engine.
- **[Anki](https://apps.ankiweb.net/)**: The open-source flashcard app that makes language learning so effective.
- **[AnkiConnect](https://foosoft.net/projects/anki-connect/)**: The fantastic Anki add-on that enables browser integration.
- **[Yomitan](https://github.com/themoeway/yomitan)**: For the inspiration.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.
