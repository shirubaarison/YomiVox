import { VOICEVOX_BASE, ANKI_URL } from "./config.js";

type Message =
  | { type: "fetch_audio"; text: string }
  | { type: "add_to_anki"; text: string };

const audioCache = new Map<string, string>();
const MAX_CACHE_SIZE = 10;

async function ankiRequest(action: string, params: Record<string, unknown> = {}) {
  const res = await fetch(ANKI_URL, {
    method: "POST",
    body: JSON.stringify({ action, version: 6, params })
  });

  if (!res.ok)
    throw new Error(`AnkiConnect HTTP error: ${res.status}`);

  const json = await res.json();

  if (json.error)
    throw new Error(json.error);

  return json.result;
}

async function generateAudioDataUrl(text: string, speakerId: number): Promise<string> {
  const cacheKey = `${speakerId}:${text}`;
  if (audioCache.has(cacheKey)) {
    console.log("Using cached audio for:", text);

    const cachedUrl = audioCache.get(cacheKey)!;

    // move to the end to maintain LRU order
    audioCache.delete(cacheKey);
    audioCache.set(cacheKey, cachedUrl);

    return cachedUrl;
  }

  console.log("Starting synthesis for:", text);

  const queryRes = await fetch(
    `${VOICEVOX_BASE}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
    { method: "POST" }
  );

  if (!queryRes.ok) {
    console.error(`audio_query failed with status ${queryRes.status}`);

    const textResponse = await queryRes.text();

    console.error("Error details:", textResponse);

    throw new Error("Failed to generate audio query. If this error persists, please try restarting the Voicevox Engine.");
  }

  const query: unknown = await queryRes.json();
  console.log("audio_query response:", query);

  const audioRes = await fetch(`${VOICEVOX_BASE}/synthesis?speaker=${speakerId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!audioRes.ok) {
    console.error(`synthesis failed with status ${audioRes.status}`);

    const textResponse = await audioRes.text();

    console.error("Error details:", textResponse);

    throw new Error("Failed to synthesize audio. If this error persists, please try restarting the Voicevox Engine.");
  }

  console.log("synthesis status:", audioRes.status);

  const blob = await audioRes.blob();

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  console.log("data url created");

  audioCache.set(cacheKey, dataUrl);
  if (audioCache.size > MAX_CACHE_SIZE) {
    const firstKey = audioCache.keys().next().value;

    if (firstKey)
      audioCache.delete(firstKey);
  }

  return dataUrl;
}

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
        const b64Data = dataUrl.split(',')[1];
        const filename = `voicevox_${Date.now()}.wav`;

        await ankiRequest("storeMediaFile", { filename, data: b64Data });

        const notes = await ankiRequest("findNotes", { query: "added:1" });
        if (!notes || notes.length === 0) {
          throw new Error("No notes added today in Anki to update.");
        }

        const lastNoteId = Math.max(...notes); // Note ID is essentially a timestamp

        const notesInfo = await ankiRequest("notesInfo", { notes: [lastNoteId] });

        const note = notesInfo[0];
        if (!note || !note.fields)
          throw new Error("Could not fetch note info.");

        const fieldName = ankiField || "SentenceAudio";
        if (note.fields[fieldName] === undefined) {
          throw new Error(`Field '${fieldName}' not found on the last added note.`);
        }

        const oldContent = note.fields[fieldName].value || "";
        const newContent = oldContent + (oldContent ? " " : "") + `[sound:${filename}]`;

        await ankiRequest("updateNoteFields", {
          note: { id: lastNoteId, fields: { [fieldName]: newContent } }
        });

        return { success: true };
      } catch (err: any) {
        return { error: err.message };
      }
    });
  }
});

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "voicevox-speak",
    title: "Read with VOICEVOX",
    contexts: ["selection"],
  });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "voicevox-speak") return;
  if (!info.selectionText || !tab?.id) return;

  const text = info.selectionText;
  const tabId = tab.id;

  browser.storage.local.get(["enabled", "speakerId"]).then(({ enabled = true, speakerId = 1 }) => {
    if (enabled && tabId) {
      generateAudioDataUrl(text, speakerId)
        .then(url => browser.tabs.sendMessage(tabId, { type: "play", url }))
        .catch(err => browser.tabs.sendMessage(tabId, { type: "error", message: err.message }));
    }
  });
});
