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

## Separate corner panel refinement — November 15

User requested a static box/column separate from the mascot so preferences and suggestions do not crowd model responses. Keep the existing vanilla extension/shadow-root architecture. Move Comfort, its review, and undo into a top-right complementary panel; retain shared task actions that return to the mascot for explanations and speech. Desktop shows a compact column with collapse; mobile starts collapsed and expanded content scrolls within 45% viewport height. Palette: paper #fffdf8, ink #41403e, text #263238, blue #2454bd, soft green-gray #f0f2eb. Existing system typography with 16px title, 14px body, 12px secondary copy. Left-aligned hierarchy, restrained border, no decorative animation. The mascot keeps its expressive outline; the utility panel uses a quieter shape. Verify independent collapse, conversation separation, narrow viewport bounds, and existing behaviors using browser tests/screenshots.

## Suggestions first and Simple — November 15

User requested suggestions before direct adjustments, removal of explanation/read-aloud from Comfort, and a host-only Simple profile. Replaced the preference-checkbox flow with a suggestion, four mutually exclusive immediate profile buttons, Restore, and collapsed suggestion settings. Added declarative Simple hide patches, conservative ownership/main/highlight exclusions, dynamic host-node handling, and reversible scoped CSS. Mapper reads the original semantic view synchronously so visual simplification does not invalidate the reviewed journey or erase its highlight. No provider calls or form actions.

Live USA.gov: confirmed selectors; main styles and text preserved; guide bounds and opaque interior pixels unchanged; original displays/classes restored; no JavaScript errors. India.gov.in and www.india.gov.in return Access Denied: fallback implementation is present, live acceptance/site-specific selector verification remains blocked. Fixture coverage includes extension nodes nested inside hide candidates and dynamic nodes, plus profile switching, unchanged inputs, screenshot comparisons, and local-only interactions.
