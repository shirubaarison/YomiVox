import assert from "node:assert/strict";
import test from "node:test";
import { createHarness } from "./helpers.mjs";

test("toolbar restores and saves the activation key even when VOICEVOX is offline", async () => {
  const elements = new Map();
  const writes = [];
  let init;
  const h = createHarness({
    document: {
      getElementById(id) {
        if (!elements.has(id))
          elements.set(id, {
            value: "",
            listeners: {},
            addEventListener(name, fn) {
              this.listeners[name] = fn;
            },
            replaceChildren() {},
            appendChild() {},
          });
        return elements.get(id);
      },
      createElement: () => ({}),
      addEventListener: (_name, fn) => {
        init = fn;
      },
    },
    browser: {
      storage: {
        local: {
          get: async () => ({ activationKey: "Alt" }),
          set: async (value) => {
            writes.push(value);
          },
        },
      },
    },
    fetch: async () => {
      throw new Error("offline");
    },
  });
  h.load("src/popup.ts");
  await init();
  const input = elements.get("activation-key");
  assert.equal(input.value, "Alt");
  await input.listeners.keydown({
    key: "A",
    preventDefault() {},
    stopPropagation() {},
  });
  assert.equal(writes[0].activationKey, "a");
  assert.equal(input.value, "a");
  await input.listeners.keydown({ key: "Tab" });
  assert.equal(writes.length, 1);
});

function setup() {
  const listeners = {};
  let key = "Control",
    enabled = true,
    selections = 0;
  class HTMLElement {
    closest() {
      return true;
    }
  }
  const node = { nodeType: 3 };
  let offset = 0;
  const h = createHarness({
    HTMLElement,
    Node: { TEXT_NODE: 3 },
    document: {
      addEventListener: (name, fn) => {
        listeners[name] = fn;
      },
      caretPositionFromPoint: () => ({
        offsetNode: node,
        offset: (offset += 2),
      }),
      createRange: () => ({
        setStart(node, offset) {
          this.startContainer = node;
          this.startOffset = offset;
        },
        collapse() {},
      }),
    },
    window: { getSelection: () => null },
  });
  h.script("src/reader/selection.ts");
  h.context.YomiVoxReader.getSentenceRange = () => ({ text: "sentence" });
  const selection = h.context.YomiVoxReader.registerSelection(
    () => enabled,
    () => selections++,
    () => {},
    () => key,
  );
  return {
    listeners,
    HTMLElement,
    selection,
    setKey(value) {
      key = value;
      selection.reset();
    },
    setEnabled(value) {
      enabled = value;
      selection.reset();
    },
    count: () => selections,
    down(value, extra = {}) {
      listeners.keydown({ key: value, ...extra });
    },
    move() {
      listeners.mousemove({});
    },
  };
}

test("Control is the default; other keys do not activate selection", () => {
  const h = setup();
  h.down("a");
  h.move();
  assert.equal(h.count(), 0);
  h.down("Control");
  h.move();
  assert.equal(h.count(), 1);
});

for (const key of ["a", " ", "Alt", "Shift", "Meta"]) {
  test("custom activation key: " + JSON.stringify(key), () => {
    const h = setup();
    h.setKey(key);
    h.down("Control");
    h.move();
    assert.equal(h.count(), 0);
    h.down(key.toUpperCase());
    h.move();
    assert.equal(h.count(), 1);
    h.listeners.keyup({ key });
    h.move();
    assert.equal(h.count(), 1);
  });
}

test("changing keys, disabling, and losing focus release activation", () => {
  for (const reset of [
    (h) => h.setKey("a"),
    (h) => h.setEnabled(false),
    (h) => h.listeners.blur(),
    (h) => h.listeners.visibilitychange(),
  ]) {
    const h = setup();
    h.down("Control");
    reset(h);
    h.move();
    assert.equal(h.count(), 0);
  }
});

test("typing in editable fields or composing text does not activate", () => {
  const h = setup();
  h.setKey("a");
  h.down("a", { target: new h.HTMLElement() });
  h.move();
  h.down("a", { isComposing: true });
  h.move();
  assert.equal(h.count(), 0);
});
