import assert from "node:assert/strict";
import test from "node:test";
import { createHarness } from "./helpers.mjs";

function text(value) {
  return { nodeType: 3, textContent: value, parentElement: null };
}
function element(tagName, children, display = "inline") {
  const node = {
    nodeType: 1,
    tagName,
    childNodes: children,
    display,
    visibility: "visible",
    parentElement: null,
    matches(selectors) {
      return selectors.split(", ").includes(tagName.toLowerCase());
    },
  };
  for (const child of children) child.parentElement = node;
  return node;
}
function harness() {
  const listeners = {};
  let caret;
  let highlighted;
  const selected = [];
  const h = createHarness({
    HTMLElement: class {},
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    getComputedStyle: (el) => ({
      display: el.display,
      visibility: el.visibility,
    }),
    document: {
      createRange: () => ({
        setStart(node, offset) {
          this.startContainer = node;
          this.startOffset = offset;
        },
        setEnd(node, offset) {
          this.endContainer = node;
          this.endOffset = offset;
        },
        collapse() {},
      }),
      caretPositionFromPoint: () => caret,
      addEventListener: (name, fn) => {
        listeners[name] = fn;
      },
    },
    window: {
      getSelection: () => ({
        removeAllRanges() {},
        addRange(range) {
          highlighted = range;
        },
      }),
    },
  });
  h.script("src/reader/sentence.ts");
  h.script("src/reader/selection.ts");
  h.context.YomiVoxReader.registerSelection(
    () => true,
    (sentence) => selected.push(sentence),
    () => {},
  );
  return {
    select: h.context.YomiVoxReader.getSentenceRange,
    hover(node, offset) {
      caret = { offsetNode: node, offset };
      listeners.keydown({ key: "Control", ctrlKey: true });
      listeners.mousemove({ clientX: 0, clientY: 0, pageX: 0, pageY: 0 });
      return { text: selected.at(-1), range: highlighted };
    },
  };
}

test("hovering before, inside, and after a link selects the same full sentence", () => {
  const before = text("日本の");
  const linked = text("首都");
  const after = text("は東京です。次の文。");
  element(
    "P",
    [before, element("A", [element("B", [linked])]), after],
    "block",
  );
  for (const node of [before, linked, after]) {
    const result = harness().hover(node, 0);
    assert.equal(result.text, "日本の首都は東京です。");
    assert.equal(result.range.startContainer, before);
    assert.equal(result.range.startOffset, 0);
    assert.equal(result.range.endContainer, after);
    assert.equal(result.range.endOffset, "は東京です。".length);
  }
});

test("punctuation inside a link still separates sentences", () => {
  const first = text("最初");
  const linked = text("です。次");
  const last = text("です。");
  element("P", [first, element("A", [linked]), last], "block");
  const h = harness();
  assert.equal(h.select(linked, 0).text, "最初です。");
  const second = h.select(last, 0);
  assert.equal(second.text, "次です。");
  assert.equal(second.range.startContainer, linked);
  assert.equal(second.range.startOffset, 3);
});

test("paragraphs without punctuation do not merge", () => {
  const first = text("前の段落");
  const second = text("次の段落");
  element(
    "DIV",
    [element("P", [first], "block"), element("P", [second], "block")],
    "block",
  );
  assert.equal(harness().select(second, 1).text, "次の段落");
});

test("line breaks and nested blocks delimit sentences", () => {
  const first = text("最初");
  const second = text("次");
  const last = text("最後");
  element(
    "DIV",
    [
      first,
      element("BR", []),
      second,
      element("DIV", [text("別の段落")], "block"),
      last,
    ],
    "block",
  );
  const h = harness();
  assert.equal(h.select(first, 0).text, "最初");
  assert.equal(h.select(second, 0).text, "次");
  assert.equal(h.select(last, 0).text, "最後");
});

test("hidden and script content is excluded from spoken text", () => {
  const first = text("日本の");
  const last = text("首都。");
  element(
    "P",
    [
      first,
      element("SPAN", [text("hidden")], "none"),
      element("SCRIPT", [text("code")]),
      last,
    ],
    "block",
  );
  assert.equal(harness().select(last, 0).text, "日本の首都。");
});

test("whitespace and empty inline nodes preserve DOM offsets", () => {
  const first = text("  日本");
  const last = text("です。 ");
  element("P", [first, element("A", [text("")]), last], "block");
  const result = harness().select(last, 0);
  assert.equal(result.text, "日本です。");
  assert.equal(result.range.startOffset, 2);
  assert.equal(result.range.endContainer, last);
  assert.equal(result.range.endOffset, 3);
});
