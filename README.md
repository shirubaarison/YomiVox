<div align="center">
  <img src="public/icons/icon-128.png" alt="YomiVox Logo" width="120" height="120">
  <h1>YomiVox</h1>
</div>

Adding only sentence cards in Anki sucks, so I made this extension to add audio to those cards.

My workflow: add an unknown word to Anki with Yomitan, then use this extension to generate audio for the latest card

https://github.com/user-attachments/assets/e6a0a7ef-1129-4330-9cd4-cccba91be90b

## Features

- **Yomitan-Style Selection**: Hold `Ctrl` and hover over any Japanese sentence to instantly select it and bring up the audio popup.
- **AnkiConnect Integration**: Instantly append the generated audio to the last added card in your Anki deck with a single click.

<img width="307" height="467" alt="Extension UI" src="https://github.com/user-attachments/assets/058f68c9-2fe2-4ba9-afc9-6870dd75ee63" />
<img width="643" height="94" alt="UI when highlight with control key" src="https://github.com/user-attachments/assets/1b9afc48-4088-46e0-9407-66e0b871ab52" />

## Installation

### Firefox

1. Go to the [Releases page](https://github.com/shirubaarison/YomiVox/releases) of this repository.
2. Download the latest `yomivox.xpi` file.
3. Open a new tab and go to `about:addons` (or click the puzzle piece icon -> Manage Extensions).
4. Click the **Gear icon** (⚙️) in the top right.
5. Select **"Install Add-on From File..."** and choose the `yomivox.xpi` file you downloaded.

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

## Development

Run `npm ci` and `npm run build`, then load `dist/manifest.json` as a temporary
Firefox extension. Run `npm run package` to create the XPI.

Use Node.js 24 and `npm ci` to install the locked development dependencies.

- `npm run check` runs linting, formatting checks, TypeScript validation, and regression tests.
- `npm test` runs isolated regression tests using Node's built-in test runner.
  Tests exercise the real source with mocked browser, audio, and Anki APIs;
  Firefox, VOICEVOX, and Anki do not need to be running.
- `npm run lint:fix` applies automatic ESLint fixes.
- `npm run format` formats source, configuration, and documentation.
- `npm run build` produces the extension in `dist/`.

GitHub Actions runs the checks and build on pushes and pull requests.
Race tests cover out-of-order synthesis responses, cancelled playback, duplicate
clicks, stale feedback timers, and shared synthesis requests. Cancelling or hiding
the reader discards pending UI results; synthesis may finish and populate the
cache. An Anki submission already sent to the background is allowed to finish.
ESLint uses the typescript-eslint recommended rules; Prettier handles formatting.
The namespace restriction is disabled only for the classic reader scripts.
EditorConfig provides consistent indentation and line endings in supported editors.

- `src/background.ts` registers message handlers and the selection context menu.
- `src/background/` connects browser events to services.
- `src/services/` owns VOICEVOX synthesis/cache, speaker queries, and Anki operations.
- `src/content.ts` connects extension settings, selection, and reader UI.
- `src/reader/` owns sentence boundaries, hover selection, audio playback, icons,
  and the floating popup. Each reader instance keeps its state in a closure.
- `src/popup.ts` controls the toolbar settings UI.

Background and toolbar code use ES modules. Firefox content scripts use classic
scripts, so reader modules share the `YomiVoxReader` namespace and are listed in
dependency order in `public/manifest.json`. Keep new reader dependencies before
their consumers in that list. No bundler is required.

## Acknowledgments

This extension wouldn't be possible without these amazing projects:

- **[VOICEVOX](https://voicevox.hiroshiba.jp/)**: For the incredible, high-quality open-source Japanese text-to-speech engine.
- **[Anki](https://apps.ankiweb.net/)**: The open-source flashcard app that makes language learning so effective.
- **[AnkiConnect](https://foosoft.net/projects/anki-connect/)**: The fantastic Anki add-on that enables browser integration.
- **[Yomitan](https://github.com/themoeway/yomitan)**: For the inspiration.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.
