const ICONS = {
  play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  save: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  add: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F44336" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  loader: `<span class="voicevox-loader"></span>`
};

let popup: HTMLDivElement | null = null;
let playBtn: HTMLButtonElement | null = null;
let copyBtn: HTMLButtonElement | null = null;
let ankiBtn: HTMLButtonElement | null = null;
let currentText: string = "";

function createPopup() {
  if (popup) return;
  popup = document.createElement("div");
  popup.id = "voicevox-reader-popup";
  Object.assign(popup.style, {
    position: "absolute",
    zIndex: "2147483647",
    background: "#333",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "5px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
    display: "none",
    alignItems: "center",
    gap: "10px",
    fontFamily: "sans-serif",
    fontSize: "14px",
    pointerEvents: "auto"
  });

  playBtn = document.createElement("button");
  playBtn.innerHTML = ICONS.play;
  Object.assign(playBtn.style, {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px"
  });

  copyBtn = document.createElement("button");
  copyBtn.innerHTML = ICONS.save;
  copyBtn.title = "Save Audio";
  Object.assign(copyBtn.style, {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px"
  });

  ankiBtn = document.createElement("button");
  ankiBtn.innerHTML = ICONS.add;
  ankiBtn.title = "Add to Anki";
  Object.assign(ankiBtn.style, {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px"
  });

  popup.addEventListener("mousedown", (e) => e.stopPropagation());
  popup.addEventListener("mouseup", (e) => e.stopPropagation());

  playBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!currentText) return;
    playBtn!.innerHTML = ICONS.loader;
    
    try {
      const res = await browser.runtime.sendMessage({ type: "fetch_audio", text: currentText });
      if (res.error) throw new Error(res.error);
      
      const audio = new Audio(res.url);
      audio.play();
      audio.onended = () => {
         if (playBtn) playBtn.innerHTML = ICONS.play;
      };
    } catch (err: any) {
      alert(`VOICEVOX Reader:\n\n${err.message}`);
      if (playBtn) playBtn.innerHTML = ICONS.play;
    }
  });

  copyBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!currentText) return;
    copyBtn!.innerHTML = ICONS.loader;
    
    try {
      const res = await browser.runtime.sendMessage({ type: "fetch_audio", text: currentText });
      if (res.error) throw new Error(res.error);
      
      const dataUrl = res.url;
      
      // Trigger a direct file download instead of copying to clipboard
      // This allows easy drag-and-drop into Anki from the downloads bar
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `voicevox_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      copyBtn!.innerHTML = ICONS.check;
    } catch (err: any) {
      alert(`VOICEVOX Reader:\n\n${err.message}`);
      copyBtn!.innerHTML = ICONS.error;
    }
    
    setTimeout(() => {
      if (copyBtn) copyBtn.innerHTML = ICONS.save;
    }, 2000);
  });

  ankiBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!currentText) return;
    ankiBtn!.innerHTML = ICONS.loader;
    
    try {
      const res = await browser.runtime.sendMessage({ type: "add_to_anki", text: currentText });
      if (res.error) throw new Error(res.error);
      ankiBtn!.innerHTML = ICONS.check;
    } catch (err: any) {
      alert(`AnkiConnect Error:\n\n${err.message}`);
      ankiBtn!.innerHTML = ICONS.error;
    }
    
    setTimeout(() => {
      if (ankiBtn) ankiBtn.innerHTML = ICONS.add;
    }, 2000);
  });

  popup.appendChild(playBtn);
  popup.appendChild(copyBtn);
  popup.appendChild(ankiBtn);
  document.body.appendChild(popup);

  const style = document.createElement("style");
  style.textContent = `
    .voicevox-loader {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid #fff;
      border-bottom-color: transparent;
      border-radius: 50%;
      animation: voicevox-spin 1s linear infinite;
    }
    @keyframes voicevox-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function getSentenceLimits(text: string, offset: number) {
  const punctuation = /[.!?。！？\n]/;

  let start = offset;
  while (start > 0 && !punctuation.test(text[start - 1])) {
    start--;
  }

  if (start > 0 && punctuation.test(text[start - 1])) {
    // don't include previous sentence's punctuation
  } else if (start > 0) {
    start++;
  }

  let end = offset;
  while (end < text.length && !punctuation.test(text[end])) {
    end++;
  }
  if (end < text.length) end++;

  return { start, end };
}

let isCtrlPressed = false;
let currentRange: Range | null = null;

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
  if (!isCtrlPressed) return;

  let range;
  if ((document as any).caretPositionFromPoint) {
    const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  } else if ((document as any).caretRangeFromPoint) {
    range = (document as any).caretRangeFromPoint(e.clientX, e.clientY);
  }

  if (!range) return;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return;

  const offset = range.startOffset;
  if (node === lastNode && Math.abs(offset - lastOffset) < 2) return;
  lastNode = node;
  lastOffset = offset;

  const text = node.textContent || "";
  let { start, end } = getSentenceLimits(text, offset);

  const sentence = text.slice(start, end).trim();
  if (!sentence) {
    hidePopup();
    return;
  }

  currentText = sentence;

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
    currentRange = newRange;
  }

  showPopup(e.pageX, e.pageY);
});

function showPopup(x: number, y: number) {
  createPopup();
  if (popup && playBtn) {
    playBtn.innerHTML = ICONS.play;
    popup.style.display = "flex";
    popup.style.left = `${x + 15}px`;
    popup.style.top = `${y + 15}px`;
  }
}

function hidePopup() {
  if (popup) popup.style.display = "none";
  currentRange = null;
  lastNode = null;
}

document.addEventListener("mousedown", (e) => {
  const target = e.target as HTMLElement;
  if (popup && popup.contains(target)) return;
  hidePopup();
});

document.addEventListener("mouseup", (e) => {
  if (isCtrlPressed) return;

  const target = e.target as HTMLElement;
  if (popup && popup.contains(target)) return;

  const selected = window.getSelection()?.toString().trim();
  if (selected) {
    currentText = selected;
    showPopup(e.pageX, e.pageY);
  }
});

browser.runtime.onMessage.addListener((msg: { type: string; url?: string; message?: string }) => {
  if (msg.type === "play" && msg.url) {
    if (playBtn) playBtn.innerHTML = ICONS.play;
    const audio = new Audio(msg.url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(msg.url!);
  } else if (msg.type === "error" && msg.message) {
    if (playBtn) playBtn.innerHTML = ICONS.play;
    alert(`VOICEVOX Reader:\n\n${msg.message}`);
  }
});
