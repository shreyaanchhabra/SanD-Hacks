# Live-page guidance implementation plan

Goal: connect the existing workflow 3 API to user-activated live page text and controls, as requested.
Architecture: a separate MV3 extension uses activeTab to map the main document, preview a bounded snapshot, send approved context from the popup, and highlight only a current validated target. Backend permits one configured extension origin and still requires the local bearer token. Gemini mode provides general model guidance; mock mode remains an explicitly limited deterministic demo.

- [x] Add browser tests for labels/controls, excluded values/editable text, stale snapshots, and restore.
- [x] Implement on-demand extraction with local node references and stable page-scoped IDs.
- [x] Test explicit extension-origin access; add bounded CORS configuration.
- [x] Implement popup preview, task/clarification/progress, per-tab session, target highlighting, and undo.
- [x] Run backend and browser tests, typecheck/build, and document setup and limits.

Constraints: no screenshot capture, no automatic clicks/fills, no complete page HTML, no API key in extension, no broad website host permission. Page text may itself be sensitive; preview and explicit share precede each request. No claims of universal website support. Do not modify the teammate's zipped extension. Integration uses existing contracts.

Verification: 14 backend tests and 7 Chromium tests pass; TypeScript typecheck/build and JavaScript syntax checks pass. Browser tests simulate Chrome messaging and verify real DOM and Mastra behavior, not manual extension installation or live Gemini. Review fixes: exclude custom textbox content and withhold stale asynchronous replies; both regressions failed before the fix and passed after.
