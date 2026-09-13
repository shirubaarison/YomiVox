import { generateAudioDataUrl } from "../services/audio.js";

export function registerContextMenu() {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "voicevox-speak",
      title: "Read with VOICEVOX",
      contexts: ["selection"],
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== "voicevox-speak") return;
    if (!info.selectionText || !tab?.id) return;

    const text = info.selectionText;
    const tabId = tab.id;

    browser.storage.local
      .get(["enabled", "speakerId"])
      .then(({ enabled = true, speakerId = 1 }) => {
        if (enabled && tabId) {
          generateAudioDataUrl(text, speakerId)
            .then((url) =>
              browser.tabs.sendMessage(tabId, { type: "play", url }),
            )
            .catch((err) =>
              browser.tabs.sendMessage(tabId, {
                type: "error",
                message: err.message,
              }),
            );
        }
      });
  });
}
