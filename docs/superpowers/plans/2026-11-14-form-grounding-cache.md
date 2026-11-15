# Form grounding, evidence, economical guidance, and page compass

User scope: Gemini priorities 1 (form context), 2 (observations vs recommendations), 4 (reduce calls). Tiger Data is limited to reusable form structure and validated guidance; no filled answers, screenshots, or returning-user task storage. No Tiger credentials are configured.

- [x] Extract labeled field groups, types, required markers, constraints and redacted associated errors; preserve strict value-free contracts.
- [x] Add structured observations, deterministic page-change context and expected progress evidence. Validate evidence references and expose reasoning separately from instructions.
- [x] Add semantic cache keys with canonical control IDs, in-flight coalescing, TTL, model/prompt isolation, bounded provider budgets and RetryInfo cooldowns. Cache only validated non-image guidance; local durable fallback.
- [x] Implement parameterized Tiger Data PostgreSQL form/guidance cache tables and adapter, opt-in store switch, safe fallback and credential-check smoke command. No claim of live verification without TIGER_DATABASE_URL.
- [x] Replace section-dump results with concise distinct destinations and local task actions: required fields, visible errors and current step. Keep search separate from AI guidance; all website actions remain user-operated.
- [x] Test contract privacy, remapping/cache invalidation, quota/cooldown, store failures, evidence validation, compact search and form compass in Chromium. Verify builds and docs.

Design: navy #173957, cobalt #2354bd, white #ffffff, slate #597087, pale blue #edf4fb. Compact labeled results with type and section context; inline Show buttons, not giant text buttons. Page compass groups Find, Form help and Reading preferences. Useful local actions remain available without spending model quota. Mascot remains the primary conversation.

Verification: 39 backend tests and 32 Chromium tests passed; typecheck, build, and git diff checks passed. A live fictional form request produced validated guidance. Tiger Data SQL behavior is tested with a fake query client; remote verification remains unavailable without credentials.
