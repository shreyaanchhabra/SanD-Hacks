# Connect public-source retrieval to the mascot

Scope: finish the approved on-demand USA.gov instructions flow in the existing extension and Mastra backend. Do not change keys or user-controlled website actions.

1. Add failing tests for cited checklist/source details and retrieval failure in the mascot; provider request format without customer ID; complete bounded lookup; retained checklist on guidance cache hits; help questions affecting retrieval.
2. Use the documented synchronous Bright Data request endpoint for SERP, parse organic links only, bound response reads and preserve fail-closed final URL checks. Allow three page fetches plus discovery under the default minute budget. Retain useful partial results when a later page fails.
3. Render compact retrieval status and a collapsible preparation checklist with original source URL, excerpt and retrieval time. Preserve stale-page guards and text-only rendering. Make sharing copy mention public-source lookup.
4. Keep sources fresh and scoped across linked pages, persist validated checklists with reusable guidance, and use the latest explicit help question as retrieval context.
5. Add a safe live retrieval check, configuration docs, run backend/browser checks, restart backend. Live verification requires local Bright Data credentials; never claim fixture results as live.

Verification: 56 backend tests and 34 Chromium tests passed; typecheck/build passed. The live account key and both zone names were verified. Live USA.gov page retrieval failed with a Government-category policy denial; SERP returned a captcha/redirect target error. Provider HTTP success is now distinguished from target success. No new Gemini key or Gemini test requests were used. Government source restrictions are not bypassed. A successful real excerpt remains unverified.

User-approved revision: search the web and extract up to three relevant results. Implemented Bright Data Bing search followed by ordinary HTTPS page reads, with per-hop approved-host checks and bounded HTML. Exact nonprofit hosts (211, NCOA, BenefitsCheckUp) supplement government sources; publishers labeled distinctly. Google search failed, while Bing and direct page extraction succeeded live (four passages/two Illinois government pages). Explicit states affect queries/cache keys; Gemini must clarify jurisdiction before presenting local requirements as applicable. Web Unlocker remains configured locally but unused in this final path.

Final verification: 60 backend tests, 34 Chromium tests, typecheck/build, and git diff checks pass. Live Bright Data Bing search plus direct HTTPS extraction succeeded; a live Mastra/Gemini turn consumed those cached passages and asked which state applies. Backend restarted and health verified. All credentials remain in ignored local files.
