namespace YomiVoxReader {
  export function registerSelection(
    isEnabled: () => boolean,
    onSelect: (text: string, x: number, y: number) => void,
    onHide: () => void,
    getActivationKey: () => string = () => "Control",
  ) {
    let pressedKey: string | null = null;

    document.addEventListener("keydown", (e) => {
      if (!isEnabled() || e.isComposing) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))
      )
        return;
      if (e.key.toLowerCase() === getActivationKey().toLowerCase()) {
        pressedKey = getActivationKey();
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.key.toLowerCase() === pressedKey?.toLowerCase()) {
        pressedKey = null;
        // don't auto-hide immediately to allow clicking the play button!
      }
    });

    let lastNode: Node | null = null;
    let lastOffset: number = -1;
    const release = () => {
      pressedKey = null;
      lastNode = null;
    };
    document.addEventListener("blur", release, true);
    document.addEventListener("visibilitychange", release);

    document.addEventListener("mousemove", (e) => {
      if (!isEnabled()) {
        pressedKey = null;
        return;
      }
      if (pressedKey !== getActivationKey()) return;

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

      const sentence = getSentenceRange(node, offset);
      if (!sentence) {
        onHide();
        return;
      }

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(sentence.range);
      }

      onSelect(sentence.text, e.pageX, e.pageY);
    });

    return {
      reset() {
        pressedKey = null;
        lastNode = null;
      },
    };
  }
}
