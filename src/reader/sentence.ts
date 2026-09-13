namespace YomiVoxReader {
  // Inline markup (links, emphasis, ruby, etc.) does not end a sentence.
  // Block elements and explicit line breaks keep neighboring paragraphs apart.
  export function getSentenceRange(node: Node, offset: number) {
    const isInline = (element: Element) => {
      const display = getComputedStyle(element).display;
      return display === "contents" || display.startsWith("inline");
    };
    let root = node.parentElement;
    while (root?.parentElement && isInline(root)) root = root.parentElement;
    if (!root) return null;

    const parts: { node: Node; start: number; end: number }[] = [];
    let text = "";
    let hoveredOffset: number | null = null;
    function visit(current: Node) {
      if (current.nodeType === Node.TEXT_NODE) {
        if (current === node) hoveredOffset = text.length + offset;
        const start = text.length;
        text += current.textContent || "";
        parts.push({ node: current, start, end: text.length });
        return;
      }
      if (current.nodeType !== Node.ELEMENT_NODE) return;
      const element = current as Element;
      const style = getComputedStyle(element);
      if (
        element.matches("script, style, noscript, template") ||
        style.display === "none" ||
        style.visibility === "hidden"
      )
        return;
      if (element.tagName === "BR") {
        text += "\n";
        return;
      }
      const boundary = current !== root && !isInline(element);
      if (boundary) text += "\n";
      for (const child of current.childNodes) visit(child);
      if (boundary) text += "\n";
    }
    visit(root);
    if (hoveredOffset === null) return null;
    let { start, end } = getSentenceLimits(text, hoveredOffset);
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (start === end) return null;
    const first = parts.find((part) => part.start <= start && part.end > start);
    const last = parts.find((part) => part.start < end && part.end >= end);
    if (!first || !last) return null;
    const range = document.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    return { text: text.slice(start, end), range };
  }

  export function getSentenceLimits(text: string, offset: number) {
    const punctuation = /[.!?。！？\n]/;

    let start = offset;
    while (start > 0 && !punctuation.test(text[start - 1])) {
      start--;
    }

    let end = offset;
    while (end < text.length && !punctuation.test(text[end])) {
      end++;
    }
    if (end < text.length) end++;

    return { start, end };
  }
}
