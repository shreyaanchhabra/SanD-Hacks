# Unified guide and optional screenshots

Approved direction: user-requested integration of companion + mascot + live Gemini/Mastra; DOM context by default and explicit cropped screenshot help.

- [x] Extend validated requests with consented bounded image context; pass to Gemini inline without placing images in Mastra checkpoints or task history.
- [x] Build one on-demand MV3 extension with page mapping, companion tools, task continuity, mascot instruction bubble, clarification, repeat/explain/pause, validated highlights.
- [x] Add visible-tab capture only on request, local crop/preview/cancel, explicit one-use sharing and stale-page checks.
- [x] Keep speech provider credentials in backend; add optional ElevenLabs adapter and cancellable current-step playback.
- [x] Test backend image validation/privacy, actual DOM integration, popup/panel progression, screenshot cancellation/crop, stale reply, and pause.
- [x] Verify build/typecheck/tests; document install and provider verification status.

Design: left-aligned navy text, white/light-blue surfaces, cobalt primary actions, 18px body text, 44px controls, companion tools in an expandable section. Mascot remains recognizable. Screenshot review is a large dialog with an accessible rectangular crop alternative to pointer selection. One extension replaces the three separately installed development pieces.

Privacy: raw capture/crop never stored by the extension. Backend removes image from the Mastra input/checkpoint and never echoes it in state. Only a temporary turn-scoped lookup references the image, deleted on completion/failure. Existing task metadata remains in-memory. Screenshot recipients are local backend and Gemini; show that before approval. No eligibility decisions or form submission.

Verification: 19 backend tests, 15 Chromium tests, typecheck/build pass. Real Gemini cropped-image smoke returned guidance with null target and image absent from state; real Mastra suspended. UI screenshot inspected at /tmp/accesspatch-unified-guide.png. Review fixes: closed UI and trusted event checks, visual stamp validation on response and ongoing display, speech generation cancellation. No live ElevenLabs verification; no manual Chrome extension installation. Backend origin updated for stable combined-extension ID. No deployment/push performed.
