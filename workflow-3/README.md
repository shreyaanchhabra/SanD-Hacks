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

Copy `.env.example` to `.env`, set `PLANNER_MODE=gemini`, `GEMINI_API_KEY`, and a `GEMINI_MODEL` available to your account. Then run the same demo/API. Requests may incur provider charges. Keys stay server-side. Live mode is explicit: provider failure returns an unsupported result, never silently switches to a mocked success. Gemini uses structured output, runtime validation, a 15-second provider timeout, and at most two attempts. **No live Gemini call has been verified in this checkout.**

## Connect the team later

- **Workflow 1:** send sanitized `PageSnapshot` and progress events to the API. No HTML, screenshots, input values, cookies, credentials, or URL queries/fragments. The service rejects unknown fields. This is not automatic redaction: labels, task text, and clarification text must also be minimized by the caller.
- **Workflow 2 / ElevenLabs:** `SpeechAdapter` can call ElevenLabs when both server-side credentials are set; it receives only the current validated instruction and step ID and returns bounded MP3 audio. Mock mode has no audio by default. The UI cancels stale audio and remains usable without speech.
- **Workflow 4 / Bright Data:** implement `SourceAdapter.retrieveContext(task, snapshot)` and pass `sources` to `createService`. Return approved public excerpts with IDs, URL, retrieval time, and `synthetic: false`. Source IDs in model output must exist in that retrieval batch. Lookup failure permits page-only guidance. Current excerpts are labeled synthetic and do not claim official provenance.
- **Workflow 4 / Tiger Data:** optional PostgreSQL-compatible Tiger Data module in `src/tiger-data.ts`, with schema in `migrations/001_tiger_data.sql`. It stores a task only after `POST /api/tasks/:id/save` receives `{ "consent": true }`, and stores coarse help events only after explicit consent at `POST /api/analytics/events`. Approved, cited HTTPS source excerpts are recorded automatically when a real source adapter is connected. Resume cards live in Tiger Data; the Mastra workflow snapshot remains in the persistent local LibSQL store so page snapshots are not copied to Tiger without an explicit checkpoint design. Saved tasks survive the local one-hour expiry and can be removed with `DELETE /api/saved-journeys/:id`. This is a single-owner integration until real user authentication is added.

All five sponsor modes are shown by the health endpoint. Mastra runs locally by default. Gemini and ElevenLabs are optional real-provider adapters; Bright Data remains disconnected. The Tiger Data adapter is implemented but off until credentials are configured. No mock is reported as a real integration.

## Checks and limits

```sh
npm test
npm run typecheck
npm run build
```

Tests exercise actual Mastra waiting/resumption, clarification, pause, duplicate/stale events, invalid target/source IDs, malformed proposals, provider errors, strict snapshots, and API authorization/origin checks.

This is a development backend, not a deployed product. Unsaved task access expires after one idle hour; saved journeys remain until deleted. Configured runs and Mastra checkpoints persist locally across backend restarts when `.data` is retained. Tiger stores only explicitly saved journey summaries, consented coarse events, and (once a real source adapter is connected) cited public source excerpts; it does not store the full Mastra snapshot. Local caps are 100 active unsaved tasks and 500 events per task. The separate `../extension-live` connector provides a development popup; `../combined-extension` is the mascot-led development UI. There is no Bright Data source collector or multi-user authentication yet. The Tiger owner ID is a single configured owner, not caller identity. Keep inputs fictional during development. Before deployment, add distributed concurrency/limits, verified cleanup, per-user isolation, and end-to-end extension tests.

Implementation references: [Mastra suspend/resume](https://mastra.ai/docs/workflows/suspend-and-resume), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output). Dependency versions are captured in `package-lock.json`.

## Live page text and controls

See [live connector setup](../extension-live/README.md). Run `npm run test:browser` for the Chromium integration checks (first run: `npx playwright install chromium`). `npm run demo:page` serves the fictional live DOM fixture. The connector works in mock mode for the narrow sample journey; general guidance requires live Gemini configuration.

## Unified companion and images

Use [combined-extension](../combined-extension/README.md) for the connected mascot/panel. Task and event requests accept an optional consented `screenshot` bound to the current page/revision. Images bypass Mastra checkpoint input via a temporary turn-scoped lookup and are discarded after planning. Visual-only guidance may return `targetId: null`. Optional ElevenLabs speech is configured server-side. See the combined extension guide for crop review and installation.

The development server now uses durable local `.data` storage by default. `createService()` unit fixtures still default to memory. Keep `.data` out of Git. See combined-extension/README.md for automatic-follow consent, local checkpoint retention, and shortcut setup. The live configuration supplies no synthetic public-source excerpts; Bright Data remains disconnected until its real adapter is integrated.

### Optional Tiger Data connection

Tiger Data is off by default. Copy `.env.example` to `.env`, then set both values in the backend environment (the checked-out `.env` has blank values):

```sh
TIGER_DATA_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
TIGER_OWNER_ID=your-stable-owner-id
```

The server applies the idempotent schema at startup and requires valid PostgreSQL TLS certificates. `TIGER_OWNER_ID` scopes reads, writes, and deletion; it must be a stable, non-secret owner label. The current bearer-token API has one configured owner, so this is not multi-user authentication. No Tiger credentials are configured in this checkout.

Task save/list/delete API: `POST /api/tasks/:id/save` with `{ "consent": true }`, `GET /api/saved-journeys`, and `DELETE /api/saved-journeys/:id`. Analytics accepts only the event names `explain_more`, `im_stuck`, `lost_target`, and `provider_failure`, broad journey/step categories, an optional provider label, and an explicit `consent: true`; event rows are pruned after seven days. Turning the extension setting off sends `DELETE /api/analytics/events` to remove that owner's stored help events. Do not send page text, field values, URLs, or free-form descriptions to this endpoint. Saved task goals and progress remain until the user deletes the saved task.
