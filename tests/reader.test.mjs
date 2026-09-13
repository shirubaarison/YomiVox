import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHarness, fakeAudio } from "./helpers.mjs";

for (const [name, text, offset, expected] of [
  ["Japanese punctuation", "最初。次です！最後", 4, "次です！"],
  ["Latin punctuation", "One. Two? Three!", 6, " Two?"],
  ["newline", "first\nsecond", 8, "second"],
  ["no punctuation", "日本語の文", 2, "日本語の文"],
  ["empty text", "", 0, ""],
  ["start of text", "文。次", 0, "文。"],
  ["on punctuation", "文。次", 1, "文。"],
  ["end of text", "最後", 2, "最後"],
]) {
  test("sentence boundaries: " + name, () => {
    const h = createHarness();
    h.script("src/reader/sentence.ts");
    const { start, end } = h.context.YomiVoxReader.getSentenceLimits(
      text,
      offset,
    );
    assert.equal(text.slice(start, end), expected);
  });
}

function playerHarness() {
  const audio = fakeAudio();
  const h = createHarness({ Audio: audio.Audio });
  h.script("src/reader/player.ts");
  const states = [];
  const player = h.context.YomiVoxReader.createAudioPlayer((state) =>
    states.push(state),
  );
  return { ...audio, player, states };
}

test("replacing playback stops and rewinds the previous audio", () => {
  const { player, instances } = playerHarness();
  player.play("first");
  instances[0].currentTime = 4;
  player.play("second");
  assert.equal(instances[0].paused, true);
  assert.equal(instances[0].currentTime, 0);
  instances[0].onended();
  instances[0].onerror();
  assert.equal(player.isPlaying, true);
  player.stop();
  assert.equal(instances[1].paused, true);
  assert.equal(player.isPlaying, false);
});

for (const event of ["onended", "onerror"]) {
  test(event + " resets the playback state", () => {
    const { player, instances, states } = playerHarness();
    player.play("audio");
    assert.equal(player.isPlaying, true);
    instances[0][event]();
    assert.equal(player.isPlaying, false);
    assert.equal(states.at(-1), false);
  });
}

test("rejected playback clears the playing state", async () => {
  const { player, Audio, states } = playerHarness();
  Audio.prototype.play = () => Promise.reject(new Error("Playback blocked"));
  player.play("audio");
  await Promise.resolve();
  assert.equal(player.isPlaying, false);
  assert.equal(states.at(-1), false);
});

test("manifest script order supports context-menu playback and disabling", async () => {
  const { Audio, instances } = fakeAudio();
  const listeners = {};
  const h = createHarness({
    Audio,
    document: {
      addEventListener: (name, callback) => {
        listeners[name] = callback;
      },
    },
    browser: {
      storage: {
        local: { get: async () => ({ enabled: true }) },
        onChanged: {
          addListener: (callback) => {
            listeners.settings = callback;
          },
        },
      },
      runtime: {
        onMessage: {
          addListener: (callback) => {
            listeners.message = callback;
          },
        },
      },
    },
  });
  const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
  for (const file of manifest.content_scripts[0].js)
    h.script("src/" + file.replace(/\.js$/, ".ts"));
  await Promise.resolve();
  assert.equal(typeof listeners.mousemove, "function");
  listeners.message({ type: "play", url: "audio" });
  assert.equal(instances.length, 1);
  listeners.settings({ enabled: { newValue: false } }, "local");
  assert.equal(instances[0].paused, true);
  listeners.message({ type: "play", url: "ignored" });
  assert.equal(instances.length, 1);
  listeners.settings({ enabled: { newValue: true } }, "local");
  listeners.message({ type: "play", url: "resumed" });
  assert.equal(instances.length, 2);
});
