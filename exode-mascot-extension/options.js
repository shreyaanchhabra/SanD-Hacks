const DEFAULT_SETTINGS = {
  voiceEnabled: true,
  voiceId: "wqWIzbRnTn2yKnO6eeJS",
  elevenLabsApiKey: ""
};
const enabled = document.getElementById("voice-enabled");
const voiceId = document.getElementById("voice-id");
const apiKey = document.getElementById("api-key");
const status = document.getElementById("status");

chrome.storage.local.get(DEFAULT_SETTINGS).then(settings => {
  enabled.checked = settings.voiceEnabled;
  voiceId.value = settings.voiceId;
  apiKey.value = settings.elevenLabsApiKey;
});

document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    voiceEnabled: enabled.checked,
    voiceId: voiceId.value.trim(),
    elevenLabsApiKey: apiKey.value.trim()
  });
  status.textContent = "Voice settings saved in this browser.";
});
