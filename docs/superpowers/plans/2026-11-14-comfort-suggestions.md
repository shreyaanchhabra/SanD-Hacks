# Comfort preferences and contextual suggestions

User approved optional explicit preferences, a minimal mascot-aligned interface, one contextual suggestion at a time, reversible page improvements and preserved guidance intelligence.

Implementation:
1. Add a local-only preference store with My setup / Another person / Guest; no identity inference or Tiger profile writes. First-use chooser is optional.
2. Add deterministic suggestion policy using bounded value-free page features; preference matching, dismissal, per-page and never-again controls require no model calls.
3. Expose page tools through a small local adapter: reversible larger text and reading focus, task-ranked destinations, keyboard focus navigation, and explicitly labelled existing image descriptions. Preserve links, controls, errors, images and original text.
4. Add a compact Comfort button, collapsible preferences and one suggestion card. Visual actions have Preview/Keep/Undo. Explanation and speech actions use existing shared workflow only after explicit selection.
5. Test profile separation/guest persistence, dismissal, no-model local operations, reversible styles, protected content, keyboard focus and existing workflows. Perform browser screenshots and independent review.

Model boundary: Mastra orchestrates/saves the existing task; deterministic rules do not require Gemini. Explicit plain-language requests use the existing Gemini help event. Full personal preferences remain in Chrome local storage; no disability is inferred.

Review follow-up: fixed reading-context stamps to include sanitized paragraph text; redacted selected/short echoed answers; preserved preview/review controls across opening Comfort; ran Comfort rollback before global Restore page. Added regressions for each case. Visual evidence captured with the browser fixture. No live provider calls are needed for this feature's automated tests.
