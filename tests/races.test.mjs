import assert from "node:assert/strict";
import test from "node:test";
import { createHarness, fakeAudio } from "./helpers.mjs";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function popupHarness() {
  const requests = [],
    elements = [],
    alerts = [],
    timers = [];
  function element(tag) {
    const el = {
      tag,
      style: {},
      children: [],
      listeners: {},
      appendChild(child) {
        this.children.push(child);
      },
      removeChild(child) {
        this.children.splice(this.children.indexOf(child), 1);
      },
      addEventListener(name, fn) {
        this.listeners[name] = fn;
      },
      contains(node) {
        return this.children.includes(node);
      },
      click() {
        return this.listeners.click?.({ stopPropagation() {} });
      },
    };
    elements.push(el);
    return el;
  }
  const audio = fakeAudio();
  const h = createHarness({
    Audio: audio.Audio,
    alert: (message) => alerts.push(message),
    setTimeout: (fn) => timers.push(fn),
    document: {
      createElement: element,
      body: element("body"),
      head: element("head"),
    },
    browser: {
      runtime: {
        sendMessage: (message) => {
          const request = deferred();
          requests.push({ ...request, message });
          return request.promise;
        },
      },
    },
  });
  h.script("src/reader/player.ts");
  h.script("src/reader/popup.ts");
  Object.assign(h.context.YomiVoxReader, {
    ICONS: {
      play: "play",
      stop: "stop",
      save: "save",
      add: "add",
      loader: "loader",
      check: "check",
      error: "error",
    },
    setIcon: (el, icon) => {
      el.icon = icon;
    },
  });
  const reader = h.context.YomiVoxReader.createReaderPopup();
  reader.show("first", 0, 0);
  const [play, save, anki] = elements.filter((el) => el.tag === "button");
  return {
    reader,
    play,
    save,
    anki,
    requests,
    alerts,
    timers,
    elements,
    ...audio,
  };
}

for (const change of ["selection", "hide", "stop"]) {
  test("pending playback is discarded after " + change, async () => {
    const h = popupHarness();
    h.play.click();
    if (change === "selection") h.reader.show("second", 0, 0);
    else h.reader[change]();
    h.requests[0].resolve({ url: "stale" });
    await flush();
    assert.equal(h.instances.length, 0);
  });
}

test("second play click cancels loading; later request wins out of order", async () => {
  const h = popupHarness();
  h.play.click();
  h.play.click();
  assert.equal(h.requests.length, 1);
  h.play.click();
  h.requests[1].resolve({ url: "new" });
  await flush();
  h.requests[0].resolve({ url: "old" });
  await flush();
  assert.deepEqual(
    h.instances.map((audio) => audio.url),
    ["new"],
  );
});

test("moving within the same sentence preserves its pending request", async () => {
  const h = popupHarness();
  h.play.click();
  h.reader.show("first", 10, 20);
  h.requests[0].resolve({ url: "audio" });
  await flush();
  assert.equal(h.instances.length, 1);
});

test("stale failures do not alert or reset new playback", async () => {
  const h = popupHarness();
  h.play.click();
  h.reader.show("second", 0, 0);
  h.play.click();
  h.requests[1].resolve({ url: "new" });
  await flush();
  h.requests[0].reject(new Error("old failure"));
  await flush();
  assert.equal(h.alerts.length, 0);
  assert.equal(h.instances[0].paused, false);
  assert.equal(h.play.icon, "stop");
});

test("Anki submission is single-flight and cannot mark another sentence as saved", async () => {
  const h = popupHarness();
  h.anki.click();
  h.anki.click();
  h.reader.show("second", 0, 0);
  h.anki.click();
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve({ noteId: 12 });
  await flush();
  assert.equal(h.anki.icon, "add");
  h.anki.click();
  assert.equal(h.requests[1].message.type, "add_to_anki");
  assert.equal(h.requests[1].message.text, "second");
});

test("pending downloads are deduplicated and discarded after hiding", async () => {
  const h = popupHarness();
  h.save.click();
  h.save.click();
  assert.equal(h.requests.length, 1);
  h.reader.hide();
  h.requests[0].resolve({ url: "old" });
  await flush();
  assert.equal(
    h.elements.some((el) => el.tag === "a"),
    false,
  );
});

test("old feedback timers cannot overwrite a newer result", async () => {
  const h = popupHarness();
  h.save.click();
  h.requests[0].resolve({ url: "first" });
  await flush();
  h.save.click();
  h.requests[1].resolve({ url: "second" });
  await flush();
  h.timers[0]();
  assert.equal(h.save.icon, "check");
});

test("new context-menu request supersedes pending popup playback", async () => {
  const h = popupHarness();
  h.play.click();
  h.reader.speak("context");
  h.requests[1].resolve({ url: "context" });
  await flush();
  h.requests[0].resolve({ url: "old" });
  await flush();
  assert.deepEqual(
    h.instances.map((audio) => audio.url),
    ["context"],
  );
});

test("identical synthesis requests share work and failed requests can retry", async () => {
  const calls = [];
  const h = createHarness({
    fetch: (url) => {
      const request = deferred();
      calls.push({ url, ...request });
      return request.promise;
    },
    FileReader: class {
      readAsDataURL() {
        this.result = "data:audio/wav;base64,YQ==";
        this.onloadend();
      }
    },
  });
  const { generateAudioDataUrl } = h.load("src/services/audio.ts");
  const first = generateAudioDataUrl("text", 1);
  const second = generateAudioDataUrl("text", 1);
  assert.equal(calls.length, 1);
  calls[0].reject(new Error("offline"));
  const results = await Promise.allSettled([first, second]);
  assert.ok(results.every((result) => result.status === "rejected"));
  const retry = generateAudioDataUrl("text", 1);
  assert.equal(calls.length, 2);
  calls[1].resolve({ ok: true, json: async () => ({}) });
  await flush();
  await flush();
  calls[2].resolve({ ok: true, blob: async () => ({}) });
  assert.equal(await retry, "data:audio/wav;base64,YQ==");
  assert.equal(
    await generateAudioDataUrl("text", 1),
    "data:audio/wav;base64,YQ==",
  );
  assert.equal(calls.length, 3);
});
