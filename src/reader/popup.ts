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
    const stopAudio = () => player.stop();
    const playAudio = (url: string) => player.play(url);

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

      playBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!currentText) return;

        if (player.isPlaying) {
          stopAudio();
          return;
        }

        setIcon(playBtn!, ICONS.loader);

        try {
          const res = await browser.runtime.sendMessage({
            type: "fetch_audio",
            text: currentText,
          });
          if (res.error) throw new Error(res.error);

          playAudio(res.url);
        } catch (err: unknown) {
          alert(
            `VOICEVOX Reader:\n\n${err instanceof Error ? err.message : String(err)}`,
          );
          player.stop();
          if (playBtn) setIcon(playBtn, ICONS.play);
          if (popup) popup.style.opacity = "1";
        }
      });

      copyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        if (!currentText) return;

        setIcon(copyBtn!, ICONS.loader);

        try {
          const res = await browser.runtime.sendMessage({
            type: "fetch_audio",
            text: currentText,
          });
          if (res.error) throw new Error(res.error);

          const dataUrl = res.url;

          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `voicevox_${Date.now()}.wav`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setIcon(copyBtn!, ICONS.check);
        } catch (err: unknown) {
          alert(
            `YomiVox:\n\n${err instanceof Error ? err.message : String(err)}`,
          );
          setIcon(copyBtn!, ICONS.error);
        }

        setTimeout(() => {
          if (copyBtn) setIcon(copyBtn, ICONS.save);
        }, 2000);
      });

      ankiBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!currentText) return;

        // If already added, open the card in Anki
        if (lastAnkiNoteId !== null) {
          try {
            await browser.runtime.sendMessage({
              type: "view_note",
              noteId: lastAnkiNoteId,
            });
          } catch (err: unknown) {
            alert(
              `AnkiConnect Error:\n\n${err instanceof Error ? err.message : String(err)}`,
            );
          }
          return;
        }

        setIcon(ankiBtn!, ICONS.loader);

        try {
          const res = await browser.runtime.sendMessage({
            type: "add_to_anki",
            text: currentText,
          });
          if (res.error) throw new Error(res.error);

          lastAnkiNoteId = res.noteId ?? null;
          setIcon(ankiBtn!, ICONS.check);
        } catch (err: unknown) {
          alert(
            `AnkiConnect Error:\n\n${err instanceof Error ? err.message : String(err)}`,
          );
          setIcon(ankiBtn!, ICONS.error);
          setTimeout(() => {
            if (ankiBtn) setIcon(ankiBtn, ICONS.add);
          }, 2000);
        }
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
        stopAudio();
        lastAnkiNoteId = null;
        if (ankiBtn) setIcon(ankiBtn, ICONS.add);
        popup.style.display = "flex";
        popup.style.left = `${x + 15}px`;
        popup.style.top = `${y + 15}px`;
      }
    }

    function hidePopup() {
      stopAudio();
      if (popup) popup.style.display = "none";
    }

    return {
      show(text: string, x: number, y: number) {
        currentText = text;
        showPopup(x, y);
      },
      hide: hidePopup,
      contains(target: Node) {
        return popup?.contains(target) ?? false;
      },
      play: playAudio,
      stop: stopAudio,
    };
  }
}
