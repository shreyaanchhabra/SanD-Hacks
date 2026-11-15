# Mascot Text and Voice Integration Plan

Approved design: minimal mascot presentation with shared Text/Voice task state, preserving local Bright Data fixes and all page guidance safeguards.

Base: local main 489edf2 plus all 15 working files, checkpoint f7bc0b4. Original checkout remains unchanged. Branch codex/mascot-text-voice; no merge or push.

1. Preserve local base and create rollback checkpoint (done).
2. Test and implement bounded, consented ElevenLabs transcription through the authenticated backend; never persist audio.
3. Build minimal shared bubble, mode controls, progressive details and cited/retrieved source visibility.
4. Add extension-owned microphone capture, explicit permission onboarding, bounded recording and draft review. Mode changes/navigation/closing cancel recording and stale results.
5. Add shared speech playback, auto-read only new valid voice-mode steps, replay and stop; preserve text on failures.
6. Add saved mascot home position, keyboard positioning and reduced-motion behavior.
7. Run backend/typecheck/browser checks, inspect rendered screenshots and perform independent final review. Document live-provider/manual Chrome verification limits.

Rulings: Text is the first-run default; Voice never starts listening merely by selecting it. Transcript requires explicit Send. Audio limited to 30 seconds and 1 MB. Microphone permission is granted in a visible extension page; capture runs in an extension-owned offscreen document. No voice command triggers website actions. No new external provider is introduced; ElevenLabs handles optional speech input/output. Existing Gemini request guards remain.

## Completion record

Implemented phases 1–7. 71 backend tests, 38 Chromium tests, typecheck, and whitespace checks pass. Rendered bubble inspected at /tmp/accesspatch-unified-guide.png. Independent reviewer identified two pending-microphone cancellation races; both reproduced in regression tests, fixed, and independently rechecked with no remaining blockers. Original checkout and running backend unchanged. Credentials/runtime state intentionally not copied. Live voice cannot be verified until ElevenLabs key is configured; real Chrome microphone permissions/offscreen behavior remain a manual verification item. No merge or push.
