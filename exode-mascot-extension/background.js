const DEFAULT_SETTINGS = {
  voiceEnabled: true,
  voiceId: "YgLWbyKFBPk4ocoUTu0e",
  elevenLabsApiKey: ""
};

chrome.runtime.onInstalled.addListener(async () => {
  const saved = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const missing = Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).filter(([key]) => saved[key] === undefined)
  );
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "speak-mascot-message") return;

  (async () => {
    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
    if (!settings.voiceEnabled) {
      console.info("[Exode Voice] Skipped: voice is disabled in extension settings.");
      return { skipped: true };
    }
    if (!settings.elevenLabsApiKey) throw new Error("Add an ElevenLabs API key in Exode Mascot options.");

    const text = String(message.text ?? "").trim().slice(0, 500);
    if (!text) throw new Error("There is no message to speak.");
    const startedAt = performance.now();
    console.info("[Exode Voice] Sending ElevenLabs request.", { characters: text.length, voiceId: settings.voiceId });
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(settings.voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": settings.elevenLabsApiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        }),
        signal: AbortSignal.timeout(20000)
      }
    );
    if (!response.ok) {
      const providerMessage = (await response.text()).slice(0, 400);
      throw new Error(`ElevenLabs returned HTTP ${response.status}${providerMessage ? `: ${providerMessage}` : "."}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 5_000_000) throw new Error("ElevenLabs returned invalid audio.");
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    console.info("[Exode Voice] Audio received.", {
      bytes: bytes.length,
      contentType: response.headers.get("content-type"),
      elapsedMs: Math.round(performance.now() - startedAt)
    });
    return { audioBase64: btoa(binary), contentType: "audio/mpeg" };
  })().then(sendResponse).catch(error => {
    console.error("[Exode Voice] Request failed.", error);
    sendResponse({ error: error.message });
  });

  return true;
});
