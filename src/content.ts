(() => {
  const reader = YomiVoxReader.createReaderPopup();
  let isEnabled = true;
  let activationKey = "Control";

  browser.storage.local
    .get(["enabled", "activationKey"])
    .then(({ enabled, activationKey: savedKey }) => {
      activationKey = savedKey || "Control";
      if (enabled !== undefined) {
        isEnabled = enabled;
      }
    });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.activationKey) {
      activationKey = changes.activationKey.newValue || "Control";
      hidePopup();
    }
    if (areaName === "local" && changes.enabled) {
      isEnabled = changes.enabled.newValue;
      if (!isEnabled) {
        hidePopup();
      }
    }
  });

  const selection = YomiVoxReader.registerSelection(
    () => isEnabled,
    reader.show,
    hidePopup,
    () => activationKey,
  );

  function hidePopup() {
    reader.hide();
    selection.reset();
  }

  document.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    if (reader.contains(target)) return;
    hidePopup();
  });

  type ContentMessage =
    | { type: "play"; url: string }
    | { type: "speak"; text: string }
    | { type: "error"; message: string };

  browser.runtime.onMessage.addListener((msg: ContentMessage) => {
    if (!isEnabled) return;
    if (msg.type === "speak") {
      reader.speak(msg.text);
    } else if (msg.type === "play") {
      reader.play(msg.url);
    } else if (msg.type === "error") {
      reader.stop();
      alert(`YomiVox:\n\n${msg.message}`);
    }
  });
})();
