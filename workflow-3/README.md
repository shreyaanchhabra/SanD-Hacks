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
- **Workflow 2 / ElevenLabs:** implement `SpeechAdapter` and pass `speech` to `createService`. It receives only the current validated instruction and step ID. The current adapter returns status, not audio; agree a streaming HTTP response with the UI owner before replacing it. The UI must cancel stale audio and remain usable without speech.
- **Workflow 4 / Bright Data:** implement `SourceAdapter.retrieveContext(task, snapshot)` and pass `sources` to `createService`. Return approved public excerpts with IDs, URL, retrieval time, and `synthetic: false`. Source IDs in model output must exist in that retrieval batch. Lookup failure permits page-only guidance. Current excerpts are labeled synthetic and do not claim official provenance.
- **Workflow 4 / Tiger Data:** replace Mastra's `InMemoryStore` with its agreed persistent adapter **and** persist task metadata/event IDs currently held in `service.ts`. Rehydrate Mastra runs by ID, add ownership and expiry checks, and test backend restart recovery together. Merely saving events does not persist workflow checkpoints. This remains integration work, not an implemented Tiger Data adapter.

All five sponsor modes are shown by the demo and health endpoint. Only Mastra runs live by default. Gemini is optional; Bright Data, Tiger Data, and ElevenLabs remain teammate-owned. No sponsor's mock is reported as a real integration.

## Checks and limits

```sh
npm test
npm run typecheck
npm run build
```

Tests exercise actual Mastra waiting/resumption, clarification, pause, duplicate/stale events, invalid target/source IDs, malformed proposals, provider errors, strict snapshots, and API authorization/origin checks.

This is an independent development backend, not a deployed product. Task access expires after one idle hour. Configured runs persist in local task files and Mastra SQLite checkpoints across backend restarts; disk retention is separate. Local caps are 100 tasks and 500 events per task. No website is clicked, filled, submitted, or changed. The separate `../extension-live` connector provides a development popup and live DOM capture. There is no production mascot UI, real speech, official source crawl, cross-user authentication, or durable restart recovery yet. Keep inputs fictional during development. Before deployment, add distributed concurrency/limits, durable cleanup, per-user isolation, explicit sharing controls, and end-to-end extension tests.

Implementation references: [Mastra suspend/resume](https://mastra.ai/docs/workflows/suspend-and-resume), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output). Dependency versions are captured in `package-lock.json`.

## Live page text and controls

See [live connector setup](../extension-live/README.md). Run `npm run test:browser` for the Chromium integration checks (first run: `npx playwright install chromium`). `npm run demo:page` serves the fictional live DOM fixture. The connector works in mock mode for the narrow sample journey; general guidance requires live Gemini configuration.

## Unified companion and images

Use [combined-extension](../combined-extension/README.md) for the connected mascot/panel. Task and event requests accept an optional consented `screenshot` bound to the current page/revision. Images bypass Mastra checkpoint input via a temporary turn-scoped lookup and are discarded after planning. Visual-only guidance may return `targetId: null`. Optional ElevenLabs speech is configured server-side. See the combined extension guide for crop review and installation.

The development server now uses durable local `.data` storage by default. `createService()` unit fixtures still default to memory. Keep `.data` out of Git. See combined-extension/README.md for automatic-follow consent, local checkpoint retention, and shortcut setup. The live configuration supplies no synthetic public-source excerpts; Bright Data remains disconnected until its real adapter is integrated.
