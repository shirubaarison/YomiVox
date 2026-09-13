namespace YomiVoxReader {
  export function registerSelection(
    isEnabled: () => boolean,
    onSelect: (text: string, x: number, y: number) => void,
    onHide: () => void,
  ) {
    let isCtrlPressed = false;

    document.addEventListener("keydown", (e) => {
      if (e.key === "Control" || e.ctrlKey) isCtrlPressed = true;
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "Control" || !e.ctrlKey) {
        isCtrlPressed = false;
        // don't auto-hide immediately to allow clicking the play button!
      }
    });

    let lastNode: Node | null = null;
    let lastOffset: number = -1;

    document.addEventListener("mousemove", (e) => {
      if (!isEnabled()) {
        isCtrlPressed = false;
        return;
      }
      if (!isCtrlPressed) return;

      let range;
      if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      } else if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(e.clientX, e.clientY);
      }

      if (!range) return;

      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;

      const offset = range.startOffset;
      if (node === lastNode && Math.abs(offset - lastOffset) < 2) return;

      lastNode = node;
      lastOffset = offset;

      const text = node.textContent || "";
      const { start, end } = getSentenceLimits(text, offset);

      const sentence = text.slice(start, end).trim();
      if (!sentence) {
        onHide();
        return;
      }

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        const newRange = document.createRange();

        let startOffset = start;
        while (startOffset < end && /\s/.test(text[startOffset])) {
          startOffset++;
        }

        newRange.setStart(node, startOffset);
        newRange.setEnd(node, end);
        selection.addRange(newRange);
      }

      onSelect(sentence, e.pageX, e.pageY);
    });

    return {
      reset() {
        lastNode = null;
      },
    };
  }
}
