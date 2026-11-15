# Exode Mascot Chrome Extension

This unpacked Manifest V3 extension displays only the ExodeUI `ip-2016` mascot at the bottom-right of HTTP and HTTPS pages. It packages both ExodeUI's mascot runtime and the `ip-2016` animation data locally so pages do not need to load either from ExodeUI at runtime. The mascot asset has a transparent artboard and its blue background shape is hidden.

## Install in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose this `exode-mascot-extension` folder.

Chrome does not allow extensions to inject into its own internal pages, the Chrome Web Store, or other restricted browser surfaces.

## Spoken messages

Voice is enabled by default. Open this extension's **Details → Extension options**, enter your ElevenLabs API key, and save. The key is stored in this browser's extension storage, not bundled with the extension source. The voice ID is prefilled and can be changed there. Speech settings can be changed there too; no local backend or `npm run dev` is required. Each message sent to ElevenLabs may incur API usage charges. Chrome may block automatic playback before you've interacted with a website; select the message to play it manually in that case.

For voice diagnostics, reload the extension and page, then filter the page's DevTools Console for `[Exode Voice]`. To see the ElevenLabs HTTP status and returned audio size, open `chrome://extensions`, find Exode Mascot, and select its **service worker** inspect link. Neither console logs the API key or message text.
