import { VOICEVOX_BASE } from "./config.js";

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
  const ankiFieldInput = document.getElementById("anki-field-input") as HTMLInputElement;

  try {
    // Setup Toggle Switch
    const { enabled = true, ankiField = "SentenceAudio" } = await browser.storage.local.get(["enabled", "ankiField"]);
    toggle.checked = enabled;
    toggleLabel.textContent = enabled ? "ON" : "OFF";

    ankiFieldInput.value = ankiField;

    toggle.addEventListener("change", async () => {
      const isEnabled = toggle.checked;
      await browser.storage.local.set({ enabled: isEnabled });
      toggleLabel.textContent = isEnabled ? "ON" : "OFF";
    });

    ankiFieldInput.addEventListener("change", async () => {
      const newField = ankiFieldInput.value.trim() || "SentenceAudio";
      await browser.storage.local.set({ ankiField: newField });
      ankiFieldInput.value = newField;
    });

    const res = await fetch(`${VOICEVOX_BASE}/speakers`);
    if (!res.ok)
      throw new Error("Voicevox not running");

    const speakers: Speaker[] = await res.json();

    charSelect.replaceChildren();

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
      styleSelect.replaceChildren();
      const speaker = speakers.find(s => s.speaker_uuid === speakerUuid);

      if (!speaker)
        return;

      for (const style of speaker.styles) {
        const option = document.createElement("option");
        option.value = style.id.toString();
        option.textContent = style.name;
        styleSelect.appendChild(option);
      }
    };

    const updateAvatar = async (uuid: string, styleId: number) => {
      try {
        const infoRes = await fetch(`${VOICEVOX_BASE}/speaker_info?speaker_uuid=${uuid}`);
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
    charSelect.replaceChildren();
    const charError = document.createElement("option");
    charError.textContent = "Error: Is Voicevox running?";
    charSelect.appendChild(charError);

    styleSelect.replaceChildren();
    const styleError = document.createElement("option");
    styleError.textContent = "Error";
    styleSelect.appendChild(styleError);
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", init);
