import { ANKI_URL } from "../config.js";

async function ankiRequest(
  action: string,
  params: Record<string, unknown> = {},
) {
  const res = await fetch(ANKI_URL, {
    method: "POST",
    body: JSON.stringify({ action, version: 6, params }),
  });

  if (!res.ok) throw new Error(`AnkiConnect HTTP error: ${res.status}`);

  const json = await res.json();

  if (json.error) throw new Error(json.error);

  return json.result;
}

export async function attachAudioToLatestNote(
  dataUrl: string,
  ankiField: string,
): Promise<number> {
  const b64Data = dataUrl.split(",")[1];
  const filename = `voicevox_${Date.now()}.wav`;

  await ankiRequest("storeMediaFile", { filename, data: b64Data });

  const notes = await ankiRequest("findNotes", { query: "added:1" });
  if (!notes || notes.length === 0) {
    throw new Error("No notes added today in Anki to update.");
  }

  const lastNoteId = Math.max(...notes); // Note ID is essentially a timestamp

  const notesInfo = await ankiRequest("notesInfo", { notes: [lastNoteId] });

  const note = notesInfo[0];
  if (!note || !note.fields) throw new Error("Could not fetch note info.");

  const fieldName = ankiField || "SentenceAudio";
  if (note.fields[fieldName] === undefined) {
    throw new Error(`Field '${fieldName}' not found on the last added note.`);
  }

  const oldContent = note.fields[fieldName].value || "";
  const newContent =
    oldContent + (oldContent ? " " : "") + `[sound:${filename}]`;

  await ankiRequest("updateNoteFields", {
    note: { id: lastNoteId, fields: { [fieldName]: newContent } },
  });

  return lastNoteId;
}

export async function viewNote(noteId: number): Promise<void> {
  await ankiRequest("guiEditNote", { note: noteId });
}
