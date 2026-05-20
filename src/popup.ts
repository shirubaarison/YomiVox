const POPUP_BASE = "http://127.0.0.1:50021";

interface Style {
  name: string;
  id: number;
}

interface Speaker {
  name: string;
  speaker_uuid: string;
  styles: Style[];
}

interface StyleInfo {
  id: number;
  icon: string;
  portrait: string;
}

interface SpeakerInfo {
  policy: string;
  portrait: string;
  style_infos: StyleInfo[];
}

async function init() {
  const charSelect = document.getElementById("character-select") as HTMLSelectElement;
  const styleSelect = document.getElementById("style-select") as HTMLSelectElement;
  const avatar = document.getElementById("avatar") as HTMLImageElement;
  const toggle = document.getElementById("extension-toggle") as HTMLInputElement;
  const toggleLabel = document.getElementById("toggle-label") as HTMLSpanElement;

  try {
    // setup toggle switch
    const { enabled = true } = await browser.storage.local.get("enabled");
    toggle.checked = enabled;
    toggleLabel.textContent = enabled ? "ON" : "OFF";

    toggle.addEventListener("change", async () => {
      const isEnabled = toggle.checked;
      await browser.storage.local.set({ enabled: isEnabled });
      toggleLabel.textContent = isEnabled ? "ON" : "OFF";
    });

    const res = await fetch(`${POPUP_BASE}/speakers`);
    if (!res.ok) throw new Error("Voicevox not running");
    const speakers: Speaker[] = await res.json();

    charSelect.innerHTML = "";

    // populate character dropdown
    for (const speaker of speakers) {
      const option = document.createElement("option");
      option.value = speaker.speaker_uuid;
      option.textContent = speaker.name;
      charSelect.appendChild(option);
    }

    charSelect.disabled = false;
    styleSelect.disabled = false;

    // load saved speaker ID
    const { speakerId = 1 } = await browser.storage.local.get("speakerId");

    // find which character owns this style ID
    let currentSpeaker = speakers.find(s => s.styles.some(style => style.id === speakerId)) || speakers[0];
    let currentStyleId = speakerId;

    // fallback if the saved style ID is somehow invalid
    if (!currentSpeaker.styles.some(style => style.id === currentStyleId)) {
      currentStyleId = currentSpeaker.styles[0].id;
    }

    const updateStylesDropdown = (speakerUuid: string) => {
      styleSelect.innerHTML = "";
      const speaker = speakers.find(s => s.speaker_uuid === speakerUuid);
      if (!speaker) return;

      for (const style of speaker.styles) {
        const option = document.createElement("option");
        option.value = style.id.toString();
        option.textContent = style.name;
        styleSelect.appendChild(option);
      }
    };

    const updateAvatar = async (uuid: string, styleId: number) => {
      try {
        const infoRes = await fetch(`${POPUP_BASE}/speaker_info?speaker_uuid=${uuid}`);
        const info: SpeakerInfo = await infoRes.json();

        const styleInfo = info.style_infos.find(s => s.id === styleId);
        const imageBase64 = styleInfo?.icon || info.portrait;

        if (imageBase64) {
          avatar.src = `data:image/png;base64,${imageBase64}`;
          avatar.style.display = "block";
        } else {
          avatar.style.display = "none";
        }
      } catch (e) {
        console.error("Failed to fetch avatar", e);
      }
    };

    // initialize UI state
    charSelect.value = currentSpeaker.speaker_uuid;
    updateStylesDropdown(currentSpeaker.speaker_uuid);
    styleSelect.value = currentStyleId.toString();
    await updateAvatar(currentSpeaker.speaker_uuid, currentStyleId);

    charSelect.addEventListener("change", async () => {
      const uuid = charSelect.value;
      updateStylesDropdown(uuid);

      // when character changes, default to their first style
      const newStyleId = Number(styleSelect.value);
      await browser.storage.local.set({ speakerId: newStyleId });
      await updateAvatar(uuid, newStyleId);
    });

    styleSelect.addEventListener("change", async () => {
      const uuid = charSelect.value;
      const newStyleId = Number(styleSelect.value);
      await browser.storage.local.set({ speakerId: newStyleId });
      await updateAvatar(uuid, newStyleId);
    });

  } catch (e) {
    charSelect.innerHTML = "<option>Error: Is Voicevox running?</option>";
    styleSelect.innerHTML = "<option>Error</option>";
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", init);
