namespace YomiVoxReader {
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
