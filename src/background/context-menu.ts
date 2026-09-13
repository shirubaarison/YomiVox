export function registerContextMenu() {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "voicevox-speak",
      title: "Read with VOICEVOX",
      contexts: ["selection"],
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== "voicevox-speak" || !info.selectionText || !tab?.id)
      return;
    // The content script owns cancellation for both popup and context-menu playback.
    void browser.tabs
      .sendMessage(tab.id, { type: "speak", text: info.selectionText })
      .catch((err: unknown) =>
        console.error("Could not reach the reader", err),
      );
  });
}
