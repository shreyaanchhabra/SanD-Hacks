# Workflow 3: standalone guidance backend

Run from this directory with Node 22.13+ (tested on Node 24):

```sh
npm ci
npm run demo
```

The command uses fictional pages, a deterministic planner, and **real Mastra suspend/resume**. It prints a next instruction, simulates user navigation, explains a fictional form label, exercises the speech stub, and pauses. No browser, API keys, or other teammates' code is required. Mock mode understands the energy-bill demo only; other goals produce clarification. It is not a general AI assistant.

## Local API

```sh
npm run dev
```

The server binds only to `127.0.0.1:4313` and prints a temporary local bearer token. You can instead set `LOCAL_API_TOKEN` in `.env`. All routes require `Authorization: Bearer <token>`. Browser origins are denied by default. Set `ALLOWED_EXTENSION_ORIGIN` to exactly your unpacked connector origin to allow that extension; the bearer token is still required. This is a single-developer API; the token grants access to all its local runs.

| Method/path | Body | Result |
|---|---|---|
| GET `/api/health` | — | Actual sponsor modes |
| POST `/api/tasks` | `{ task, snapshot }` | Initial task state |
| GET `/api/tasks/:runId` | — | Current state |
| POST `/api/tasks/:runId/events` | `ProgressEvent` | Next state |
| POST `/api/tasks/:runId/pause` | `{}` | Paused state |
| POST `/api/tasks/:runId/resume` | `{}` | Unpaused state, same step |
| POST `/api/tasks/:runId/speech` | `{ stepId }` | Mock no-audio status by default |

Use `src/fixtures.ts` for exact starter payloads; `src/demo.ts` demonstrates the service calls. `src/contracts.ts` is the authoritative version-one contract. Responses nest `result` (guidance, clarification, unsupported) inside task metadata, with a `sources` array containing only the cited source records for visible attribution. Events refer to the **previous** step/page/revision; a navigation event includes the newly observed `snapshot`. The extension must remap and validate the returned target before displaying it. Every instruction gets a new `stepId`.

Clarification: send `type: "clarification-answered"` and `answer` against the current step. Pause/resume does not count as website progress. Repeat event IDs return the current state without advancing again. Concurrent progression is rejected. Missing/unknown targets produce unsupported guidance, never a completion claim. The demo does not certify application completion.

## Optional live Gemini

Copy `.env.example` to `.env`, set `PLANNER_MODE=gemini`, `GEMINI_API_KEY`, and a `GEMINI_MODEL` available to your account. Then run the same demo/API. Requests may incur provider charges. Keys stay server-side. Live mode is explicit: provider failure returns an unsupported result, never silently switches to a mocked success. Gemini uses structured output, runtime validation, a 15-second provider timeout, and one corrective retry for invalid structured output. Rate limits and provider failures are not retried immediately. A live fictional form request has produced validated guidance in this checkout.

## Connect the team later

- **Workflow 1:** send sanitized `PageSnapshot` and progress events to the API. No HTML, screenshots, input values, cookies, credentials, or URL queries/fragments. The service rejects unknown fields. This is not automatic redaction: labels, task text, and clarification text must also be minimized by the caller.
- **Workflow 2 / ElevenLabs:** `SpeechAdapter` can call ElevenLabs when both server-side credentials are set; it receives only the current validated instruction and step ID and returns bounded MP3 audio. Mock mode has no audio by default. The UI cancels stale audio and remains usable without speech.
- **Workflow 4 / Bright Data:** implement `SourceAdapter.retrieveContext(task, snapshot)` and pass `sources` to `createService`. Return approved public excerpts with IDs, URL, retrieval time, and `synthetic: false`. Source IDs in model output must exist in that retrieval batch. Lookup failure permits page-only guidance. Current excerpts are labeled synthetic and do not claim official provenance.
- **Workflow 4 / Tiger Data:** optional PostgreSQL modules support a reusable form/guidance cache and (with `TIGER_OWNER_ID`) explicit saved-journey summaries, consented help events, and cited public sources. Schemas are in `migrations/`. Full Mastra snapshots remain in local LibSQL; Bright Data collection is not yet connected. See the Tiger setup below.

All five sponsor modes are shown by the health endpoint. Mastra runs locally by default. Gemini and ElevenLabs are optional real-provider adapters. Tiger cache/data storage is optional; Bright Data remains disconnected. No mock is reported as a real integration.

## Checks and limits

```sh
npm test
npm run typecheck
npm run build
```

Tests exercise actual Mastra waiting/resumption, clarification, pause, duplicate/stale events, invalid target/source IDs, malformed proposals, provider errors, strict snapshots, and API authorization/origin checks.

This is a development backend, not a deployed product. Unsaved task access expires after one idle hour; explicitly saved journeys remain until deleted. Configured runs and full Mastra checkpoints persist locally across backend restarts when `.data` is retained. Tiger holds cache entries (15-minute reuse), explicitly saved journey summaries, consented coarse events (seven-day retention), and cited public excerpts if a real source adapter is connected; it does not hold the full Mastra snapshot. Local caps are 100 active unsaved tasks and 500 events per task. The separate `../extension-live` connector provides a development popup; `../combined-extension` is the mascot-led development UI. There is no Bright Data source collector or multi-user authentication yet. The Tiger owner ID is a single configured owner, not caller identity. Keep inputs fictional during development. Before deployment, add distributed concurrency/limits, verified cleanup, per-user isolation, and end-to-end extension tests.

Implementation references: [Mastra suspend/resume](https://mastra.ai/docs/workflows/suspend-and-resume), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output). Dependency versions are captured in `package-lock.json`.

## Live page text and controls

See [live connector setup](../extension-live/README.md). Run `npm run test:browser` for the Chromium integration checks (first run: `npx playwright install chromium`). `npm run demo:page` serves the fictional live DOM fixture. The connector works in mock mode for the narrow sample journey; general guidance requires live Gemini configuration.

## Unified companion and images

Use [combined-extension](../combined-extension/README.md) for the connected mascot/panel. Task and event requests accept an optional consented `screenshot` bound to the current page/revision. Images bypass Mastra checkpoint input via a temporary turn-scoped lookup and are discarded after planning. Visual-only guidance may return `targetId: null`. Optional ElevenLabs speech is configured server-side. See the combined extension guide for crop review and installation.

The development server now uses durable local `.data` storage by default. `createService()` unit fixtures still default to memory. Keep `.data` out of Git. See combined-extension/README.md for automatic-follow consent, local checkpoint retention, and shortcut setup. The live configuration supplies no synthetic public-source excerpts; Bright Data remains disconnected until its real adapter is integrated.

## Form guidance and reusable cache (0.5)

Page context includes field groups, required status, input types, declared constraints, and generic invalid-state signals. Filled answers are excluded; associated help is withheld for answered or invalid fields to reduce echoed-answer leakage. Gemini returns observed facts separately from its suggested instruction and expected progress. Target/source references are validated; this does not independently certify every model statement.

Live Gemini uses a 15-minute reusable cache, concurrent-request coalescing, and persisted local call budgets (defaults: 20/day in Pacific time, 5/minute). Each actual provider attempt counts. Provider rate limits have an explicit cooldown; these guards do not guarantee provider quota availability. Cache keys include model/version, page structure and destination fingerprint, task, and context. Screenshots, validation errors, and turns with history bypass reusable persistence. Cache hits remap and validate targets against the current page.

Without a database URL, the cache is local under `.data/guidance-cache`. To use Tiger Data, set `TIGER_DATABASE_URL` in `.env`, restart the backend, then run:

```sh
npm run cache:check
```

The adapter initializes `migrations/002_guidance_cache.sql` using the configured database role. Remote connections require certificate verification. The check writes and reads a fictional entry and removes its guidance key. The schema stores static form structure and validated reusable guidance only: no filled answers, screenshots, observations, task stages, or progress history. Guidance expires for reuse after 15 minutes; expiry is not a physical deletion policy. Database failure falls back to the local cache and health reports the active mode. A real Tiger Data connection has not been verified here because credentials are absent.

Task continuity still uses local Mastra SQLite and task files. The cache is separate from that task store. Rebuild the bundled local structural fingerprint helper with `npm run build:fingerprint` after changing its source/build dependencies.

### Optional saved journeys and help events

To enable saved journeys/events, set `TIGER_OWNER_ID` along with `TIGER_DATABASE_URL`. If using the same Tiger service for the cache, this one URL enables both. `TIGER_DATA_URL` remains an optional separate URL for the journey/source/event tables; it must be paired with `TIGER_OWNER_ID`. The checked-out `.env` has blank connection settings, and `TIGER_API_KEY` is not used by this PostgreSQL adapter.

The server initializes `migrations/001_tiger_data.sql`. The owner ID scopes these records, but the bearer-token API is still single-owner, not multi-user authentication. In the combined extension, **Save this task** explicitly stores the goal, milestone, and confirmed progress summary; **Saved tasks** lists and restores it; delete removes the Tiger row and attempts to remove the local Mastra checkpoint. The full checkpoint stays in `.data/mastra.db`, so resuming after restart requires the same local data directory. Help-event sharing is off by default. It accepts only coarse categories and explicit consent; unchecking it deletes the owner's stored events. A startup cleanup and six-hour pruning pass enforce seven-day event retention. The API accepts only the event names `explain_more`, `im_stuck`, `lost_target`, and `provider_failure`, broad categories, and an explicit `consent: true`. Do not send page text, field values, URLs, or free-form descriptions to it. Cited non-synthetic HTTPS excerpts are stored automatically only after a real source adapter is connected.
