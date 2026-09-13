import { generateAudioDataUrl } from "../services/audio.js";
import { attachAudioToLatestNote, viewNote } from "../services/anki.js";

type Message =
  | { type: "fetch_audio"; text: string }
  | { type: "add_to_anki"; text: string }
  | { type: "view_note"; noteId: number };

export function registerMessages() {
  browser.runtime.onMessage.addListener((msg: Message) => {
    if (msg.type === "fetch_audio") {
      return browser.storage.local.get(["enabled", "speakerId"]).then(({ enabled = true, speakerId = 1 }) => {
        if (!enabled) return { error: "Extension is disabled" };
        return generateAudioDataUrl(msg.text, speakerId)
          .then(url => ({ url }))
          .catch(err => ({ error: err.message }));
      });
    }

    if (msg.type === "add_to_anki") {
      return browser.storage.local.get(["enabled", "speakerId", "ankiField"]).then(async ({ enabled = true, speakerId = 1, ankiField = "SentenceAudio" }) => {
        if (!enabled) return { error: "Extension is disabled" };
        try {
          const dataUrl = await generateAudioDataUrl(msg.text, speakerId);
          const lastNoteId = await attachAudioToLatestNote(dataUrl, ankiField);

          return { success: true, noteId: lastNoteId };
        } catch (err: any) {
          return { error: err.message };
        }
      });
    }

    if (msg.type === "view_note") {
      return viewNote(msg.noteId)
        .then(() => ({ success: true }))
        .catch((err: any) => ({ error: err.message }));
    }
  });

}
