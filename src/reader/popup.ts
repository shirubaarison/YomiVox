namespace YomiVoxReader {
  export function createReaderPopup() {
    let popup: HTMLDivElement | null = null;
    let playBtn: HTMLButtonElement | null = null;
    let copyBtn: HTMLButtonElement | null = null;
    let ankiBtn: HTMLButtonElement | null = null;
    let currentText: string = "";
    let lastAnkiNoteId: number | null = null;
    const player = createAudioPlayer((playing) => {
      if (playBtn) setIcon(playBtn, playing ? ICONS.stop : ICONS.play);
      if (popup) popup.style.opacity = playing ? "0.5" : "1";
    });
    let revision = 0;
    let visible = false;
    let ankiPending = false;
    const pending = new Map<string, symbol>();
    const latest = new Map<string, symbol>();
    const stopAudio = () => {
      pending.delete("play");
      player.stop();
    };
    const playAudio = (url: string) => {
      stopAudio();
      player.play(url);
    };

    function invalidate() {
      revision++;
      pending.clear();
      stopAudio();
      if (copyBtn) setIcon(copyBtn, ICONS.save);
      if (ankiBtn) setIcon(ankiBtn, ICONS.add);
      lastAnkiNoteId = null;
    }

    async function runAction(
      action: string,
      button: HTMLButtonElement,
      message: { type: string; text?: string; noteId?: number },
      onSuccess: (res: { url: string; noteId?: number }) => void,
      resetIcon?: string,
    ) {
      if (pending.has(action) || (action === "anki" && ankiPending)) return;
      const token = Symbol();
      const startedAt = revision;
      pending.set(action, token);
      latest.set(action, token);
      if (action === "anki") ankiPending = true;
      const isCurrent = () =>
        revision === startedAt && pending.get(action) === token;
      setIcon(button, ICONS.loader);
      try {
        const res = await browser.runtime.sendMessage(message);
        if (!isCurrent()) return;
        if (res.error) throw new Error(res.error);
        onSuccess(res);
      } catch (err: unknown) {
        if (!isCurrent()) return;
        alert(
          `YomiVox:\n\n${err instanceof Error ? err.message : String(err)}`,
        );
        setIcon(button, ICONS.error);
        resetIcon ??= action === "play" ? ICONS.play : ICONS.add;
      } finally {
        if (action === "anki") ankiPending = false;
        if (isCurrent()) {
          pending.delete(action);
          if (resetIcon) {
            setTimeout(() => {
              if (
                revision === startedAt &&
                latest.get(action) === token &&
                !pending.has(action)
              )
                setIcon(button, resetIcon!);
            }, 2000);
          }
        }
      }
    }

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
        pointerEvents: "auto",
        transition: "opacity 0.2s ease",
      });

      playBtn = document.createElement("button");
      setIcon(playBtn, ICONS.play);

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
        height: "20px",
      });

      copyBtn = document.createElement("button");
      setIcon(copyBtn, ICONS.save);
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
        height: "20px",
      });

      ankiBtn = document.createElement("button");
      setIcon(ankiBtn, ICONS.add);
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
        height: "20px",
      });

      popup.addEventListener("mousedown", (e) => e.stopPropagation());
      popup.addEventListener("mouseup", (e) => e.stopPropagation());

      popup.addEventListener("mouseenter", () => {
        if (popup) popup.style.opacity = "1";
      });
      popup.addEventListener("mouseleave", () => {
        if (popup && player.isPlaying) {
          popup.style.opacity = "0.5";
        }
      });

      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!currentText) return;
        if (player.isPlaying || pending.has("play")) {
          stopAudio();
          return;
        }
        void runAction(
          "play",
          playBtn!,
          { type: "fetch_audio", text: currentText },
          (res) => player.play(res.url),
        );
      });

      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!currentText) return;
        void runAction(
          "save",
          copyBtn!,
          { type: "fetch_audio", text: currentText },
          (res) => {
            const a = document.createElement("a");
            a.href = res.url;
            a.download = `voicevox_${Date.now()}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setIcon(copyBtn!, ICONS.check);
          },
          ICONS.save,
        );
      });

      ankiBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!currentText) return;
        const message =
          lastAnkiNoteId === null
            ? { type: "add_to_anki", text: currentText }
            : { type: "view_note", noteId: lastAnkiNoteId };
        void runAction("anki", ankiBtn!, message, (res) => {
          lastAnkiNoteId = res.noteId ?? lastAnkiNoteId;
          setIcon(ankiBtn!, ICONS.check);
        });
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

    function showPopup(x: number, y: number) {
      createPopup();
      if (popup && playBtn) {
        popup.style.display = "flex";
        popup.style.left = `${x + 15}px`;
        popup.style.top = `${y + 15}px`;
      }
    }

    function hidePopup() {
      visible = false;
      invalidate();
      if (popup) popup.style.display = "none";
    }

    return {
      show(text: string, x: number, y: number) {
        if (!visible || currentText !== text) invalidate();
        currentText = text;
        visible = true;
        showPopup(x, y);
      },
      hide: hidePopup,
      contains(target: Node) {
        return popup?.contains(target) ?? false;
      },
      play: playAudio,
      speak(text: string) {
        invalidate();
        createPopup();
        void runAction("play", playBtn!, { type: "fetch_audio", text }, (res) =>
          player.play(res.url),
        );
      },
      stop: stopAudio,
    };
  }
}
