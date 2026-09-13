import assert from "node:assert/strict";
import test from "node:test";
import { createHarness } from "./helpers.mjs";

function ankiHarness(overrides = {}) {
  const calls = [];
  const results = {
    storeMediaFile: "audio.wav",
    findNotes: [12, 30, 21],
    notesInfo: [
      {
        fields: {
          SentenceAudio: { value: "existing" },
          CustomAudio: { value: "" },
        },
      },
    ],
    updateNoteFields: null,
    guiEditNote: null,
    ...overrides,
  };
  const h = createHarness({
    fetch: async (url, options) => {
      assert.equal(url, "http://127.0.0.1:8765");
      assert.equal(options.method, "POST");
      const request = JSON.parse(options.body);
      assert.equal(request.version, 6);
      calls.push(request);
      const result = results[request.action];
      if (result instanceof Error) throw result;
      return { ok: true, json: async () => ({ result, error: null }) };
    },
  });
  return { ...h.load("src/services/anki.ts"), calls };
}

test("attaches audio to the newest note and preserves existing field content", async () => {
  const h = ankiHarness();
  assert.equal(
    await h.attachAudioToLatestNote(
      "data:audio/wav;base64,YWJj",
      "SentenceAudio",
    ),
    30,
  );
  const stored = h.calls.find((call) => call.action === "storeMediaFile");
  assert.equal(stored.params.data, "YWJj");
  const update = h.calls.find((call) => call.action === "updateNoteFields");
  assert.deepEqual(update.params.note, {
    id: 30,
    fields: {
      SentenceAudio: "existing [sound:" + stored.params.filename + "]",
    },
  });
});

test("uses a custom audio field without a leading space", async () => {
  const h = ankiHarness();
  await h.attachAudioToLatestNote("data:audio/wav;base64,YWJj", "CustomAudio");
  const update = h.calls.find((call) => call.action === "updateNoteFields");
  assert.match(
    update.params.note.fields.CustomAudio,
    /^\[sound:voicevox_\d+\.wav\]$/,
  );
  assert.equal(Object.keys(update.params.note.fields).length, 1);
});

for (const [name, overrides, message] of [
  ["no recent notes", { findNotes: [] }, /No notes added today/],
  ["missing note", { notesInfo: [] }, /Could not fetch note info/],
  [
    "missing audio field",
    { notesInfo: [{ fields: {} }] },
    /Field 'SentenceAudio' not found/,
  ],
  [
    "media storage failure",
    { storeMediaFile: new Error("Anki unavailable") },
    /Anki unavailable/,
  ],
]) {
  test(name + " does not update a note", async () => {
    const h = ankiHarness(overrides);
    await assert.rejects(
      h.attachAudioToLatestNote("data:audio/wav;base64,YWJj", "SentenceAudio"),
      message,
    );
    assert.equal(
      h.calls.some((call) => call.action === "updateNoteFields"),
      false,
    );
  });
}

for (const [name, response, message] of [
  ["HTTP error", { ok: false, status: 500 }, /AnkiConnect HTTP error: 500/],
  [
    "API error",
    {
      ok: true,
      json: async () => ({ error: "permission denied", result: null }),
    },
    /permission denied/,
  ],
]) {
  test(name + " is reported to the caller", async () => {
    const h = createHarness({ fetch: async () => response });
    await assert.rejects(h.load("src/services/anki.ts").viewNote(30), message);
  });
}

test("opens the requested note for editing", async () => {
  const h = ankiHarness();
  await h.viewNote(21);
  assert.deepEqual(h.calls[0].params, { note: 21 });
  assert.equal(h.calls[0].action, "guiEditNote");
});
