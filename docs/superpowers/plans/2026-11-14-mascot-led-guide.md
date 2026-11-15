# Mascot-led guide redesign

Approved: one collapsible tools menu, larger separate mascot on the left, task and step interaction through its bubble; Show me travels beside the validated target. Restore cursor tracking, idle movement, thinking/reaction and target gaze. Respect OS/manual reduced motion; do not activate website controls.

- [x] Test single-menu layout, local target bounds/staleness, travel collision handling, return-home and reduced motion.
- [x] Embed companion tools in the guide's single menu, removing the separate tool panel.
- [x] Move task entry and contextual guidance controls to the independent left-side mascot bubble.
- [x] Restore pointer tracking; add local target gaze and bounded travel. Return home on target invalidation, pause, restore and new task.
- [x] Retain image consent/privacy, speech cancellation and keyboard access; verify all browser/backend checks and record UI evidence.

Verification: 22 Chromium tests and 19 backend tests pass; typecheck/build and JavaScript syntax checks pass. Reviewed home and completed-target UI screenshots. Review fixes: freeze only after first real frame; collision fallback for narrow/stationary layouts; disable stuck input while planning; keep tools menu above traveling mascot. Live backend restarted for help-event context. No publication or commit performed.
