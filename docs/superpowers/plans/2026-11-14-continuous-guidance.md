# Continuous tasks, visible image analysis, simpler conversation

Requested fixes: automatic linked-page continuation, state across backend/navigation restarts, visible screenshot findings, task-level route, keyboard bubble toggle, less UI clutter.

- [x] Reproduce lost run state on restart, missing navigation injection, and missing image-analysis acknowledgment.
- [x] Persist Mastra checkpoints in local SQLite and minimal task metadata in an atomic local repository; retain no raw screenshots.
- [x] Add optional Chrome site permission and explicit automatic-sharing opt-in, then re-inject on navigation only for tabs with active tasks. Keep new tabs independently bound unless explicitly opened from the active journey.
- [x] Restore live run state before advancing; deduplicate automatic page events; handle back/SPA and pause without claiming clicks equal completion.
- [x] Require explicit image review; show sending/analyzing/completed/failed plus actual visual observations from the model.
- [x] Simplify main bubble to instruction + Show me + Continue; move secondary actions into More. Add Command/Ctrl+Shift+K and a compact tentative task route.
- [x] Test real browser navigation and storage integration, restart persistence, image analysis acknowledgment, keyboard and pause; verify live Gemini using fictional data.

Scope: automatic DOM sharing is opt-in per task after browser site permission. Screenshot sharing never automatic. Keys remain backend-only. SQLite is a local development persistence adapter, not a Tiger Data integration. Broad browsing access is optional and requested in extension options; no automatic grant. No autonomous website clicks, form entry, or submission.

Verification: 28 backend tests and 26 Chromium tests pass, plus typecheck/build/JS syntax checks. Real Gemini returned image-only visualObservation and a task route; a fresh service resumed the same durable run. Live form follow-up exposed ID-validation problems and later provider HTTP 429; provider schema converted to supported anyOf/enum, citation enums constrained, retries receive validation feedback, and rate limits now visible. Final live schema/form check is blocked by provider quota; do not claim it passed. Chrome optional-permission prompt and native shortcut require manual installation smoke testing. Retention: one-hour idle access expiry is distinct from disk deletion; saved checkpoints can remain until local data reset. Failure-injection verifies task-pointer commit happens before releasing the old workflow wait.
