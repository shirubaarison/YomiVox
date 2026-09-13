(() => {
  const reader = YomiVoxReader.createReaderPopup();
  let isEnabled = true;

  browser.storage.local.get("enabled").then(({ enabled }) => {
    if (enabled !== undefined) {
      isEnabled = enabled;
    }
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.enabled) {
      isEnabled = changes.enabled.newValue;
      if (!isEnabled) {
        hidePopup();
      }
    }
  });

  const selection = YomiVoxReader.registerSelection(() => isEnabled, reader.show, hidePopup);

  function hidePopup() {
    reader.hide();
    selection.reset();
  }

  document.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    if (reader.contains(target))
      return;
    hidePopup();
  });

  type ContentMessage =
    | { type: "play"; url: string }
    | { type: "error"; message: string };

  browser.runtime.onMessage.addListener((msg: ContentMessage) => {
    if (!isEnabled) return;
    if (msg.type === "play") {
      reader.play(msg.url);
    } else if (msg.type === "error") {
      reader.stop();
      alert(`YomiVox:\n\n${msg.message}`);
    }
  });

})();
