# AccessPatch Guided Companion

One extension connects the page tools, Exode mascot, Gemini planning, Mastra task continuity, and optional ElevenLabs speech. The original component folders remain available as references; load this folder for the linked experience.

## Start

1. Start the backend from `workflow-3`: `npm run dev`. Use the existing `.env` with `PLANNER_MODE=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `LOCAL_API_TOKEN`.
2. In Chrome's extension manager, disable the older **AccessPatch Companion**, **Exode Mascot**, and **Live guidance connector** to avoid duplicate panels. Load this `combined-extension` folder unpacked.
3. Open this extension's **Details → Extension options**, enter the backend's **local token**, and save for the browser session. Provider keys belong in backend `.env`, never here.
4. Open an ordinary HTTP/HTTPS page and select the AccessPatch toolbar icon. The icon grants temporary access only to that tab; a new cross-origin page requires selecting the icon again.
5. Enter your goal, choose **Review this page**, inspect the context, and choose **Share context & get guidance**.
6. The mascot bubble shows one instruction. **Show me** highlights only a matching current control. **Explain more** reveals the longer explanation and sources. Perform the website actions yourself. After navigating, reopen the guide, review the new page, and continue. Answer clarification questions in the same panel.
7. **Page tools** opens the companion's search, Simplify, Easy Read, Low Vision, image-alt-text descriptions, and restore controls. These are user-operated visual tools, not autonomous model changes.

The manifest contains a public development key solely to keep the unpacked extension ID stable. It is not a provider secret or signing private key. Set `ALLOWED_EXTENSION_ORIGIN=chrome-extension://<extension ID>` in backend `.env` to exactly this extension ID. The local development environment was configured during implementation; the public expected ID is recorded below.

## Optional screenshot help

Select **Help with what I’m seeing**. The visible tab is captured locally using Chrome's `activeTab` grant; no screenshot is taken automatically. The guide temporarily hides its own overlays while capturing. Cross-origin frames or image-based forms may be visible in the screenshot even when DOM extraction cannot inspect them.

A review dialog shows the capture. Drag a rectangle, or set Left/Top/Width/Height with the keyboard. Choose **Preview crop**, check the exact cropped image, then **Share crop & ask guide**. **Cancel** or Escape discards it without contacting the backend/model. The dialog has focus containment and the internal UI uses a closed shadow root. Synthetic webpage clicks cannot authorize capture/sharing.

Only the approved crop (JPEG, at most 1 MB) and reviewed text context are sent to the local backend and Gemini. The original full capture stays local. Screenshots may contain filled answers or private information: crop those out. The image is used for one planner turn, is excluded from task/history/Mastra checkpoint data, and is not uploaded to a reusable Gemini file store. This does not override Google's provider-side data handling. Model text explanations remain in task history. Subsequent requests use text by default; a new image requires another capture and approval.

Visual-only guidance has `targetId: null` and cannot cause highlighting. Ordinary DOM targets are still validated against page-scoped IDs. Scroll, viewport, structural page changes, or user input after a capture invalidate its use/response. This is visual understanding, not automated form filling. Native browser PDF viewers, browser-internal pages, file URLs, unsupported DOM widgets, or site restrictions may prevent injection/capture; use an accessible ordinary page or a web-hosted image/form instead. No screenshot feature for the whole desktop or other apps is included.

## Speech

Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in backend `.env` and restart. **Read aloud** sends the current approved instruction through the backend to ElevenLabs. Pause, close, new tasks, page changes, and later playback requests cancel/replace pending audio. Text works without voice. Speech-provider calls may incur charges. The adapter has automated tests but has not been verified against a real ElevenLabs key in this session.

## Verification and current limits

- Backend: strict image consent/type/size/page binding, one-turn image delivery, no image in returned state/history, null-target validation, speech and provider failures.
- Chromium: linked mascot/panel/page mapper with real local Mastra, DOM privacy, screenshot cancel/crop/explicit share, hostile synthetic clicks, stale replies/visual context, and late speech cancellation.
- A real Gemini image request interpreted the cropped fictional test page and Mastra suspended successfully. No private real website data was used for that smoke test.
- Browser tests simulate Chrome messaging and open the otherwise closed shadow root only inside the test harness for control assertions. Separate tests retain the closed root and check page isolation. Manual installation, toolbar/activeTab capture in a user's Chrome profile, and real third-party site behavior still require smoke testing.
- Tiger Data has an optional reusable guidance cache and opt-in journey/event storage; its connection is currently unconfigured. Bright Data remains disconnected. Active task/checkpoint state stays local; see Continuous guidance below for save/resume and limits. No claims of universal website support, eligibility determination, or autonomous website actions.

Stable extension ID: `jiahogemipnlpbgpcgcbpkfekgkhpnof`.

## Mascot-led interaction (0.3)

Reload the extension in Chrome, then **refresh the website** to replace previously injected menus. The mascot now lives separately on the left. Select it (or focus **Talk to your companion** and press Enter) to open or collapse its conversation. Enter tasks and clarification answers beside the mascot. After each instruction, **I've done this — review next step** opens the next local-context review before a second explicit share. **I'm stuck** accepts a question and uses a help event rather than asserting progress.

There is one **Tools & settings** menu for search, Simplify, Easy Read, Low Vision, image descriptions, restore, connection, and a **Keep mascot still** setting. Escape closes the tools menu. **Show companion** reopens the conversation if it was collapsed to clear a target.

**Show me** validates the original target, scrolls to it if necessary, and moves the mascot and bubble beside it. Local geometry never goes to Gemini. Target gaze is provided to the mascot animation by numeric attributes; page controls are never activated. The mascot returns left on stale targets, pause, review, restore, or a new task. At narrow/zoomed sizes, the bubble can collapse rather than covering the control; the tools menu remains reachable to reopen it.

Pointer tracking, curious idle reactions, thinking/ready expressions, and target gaze are restored. System reduced-motion or **Keep mascot still** disables travel and pointer tracking and freezes the mascot after its first rendered frame. The manual setting follows the tab's session. In stationary mode, the conversation moves aside if it would cover a highlighted control.


## Continuous guidance (0.4)

Reload the extension and refresh your page. **Command+Shift+K** on Mac / **Ctrl+Shift+K** elsewhere toggles the conversation using Chrome's extension command. If the shortcut conflicts, set it at `chrome://extensions/shortcuts`.

Start with a goal and **Start guiding**. The main view now contains the instruction, **Show me**, and **Continue**. **More** holds explanations, speech, pause, screenshot help, and the per-task follow switch. **Your task** shows Gemini's tentative route/current milestone when available; it is a plan, not a guarantee of a fixed number of steps.

For automatic continuation, open **Tools & settings → Enable automatic guidance**, then in extension options choose **Allow automatic guidance across websites** and approve Chrome's optional site access. This also explicitly permits sharing page labels/headings/help text with the backend and Gemini for followed tasks. Return to the page (refresh if needed); start a new task or enable **More → Follow this task across pages**. You can turn it off in More or globally in options. No screenshot is taken or sent automatically.

While a followed task is active, the worker reinjects on normal page loads. The guide restores the same run, remaps the page, and asks for the next instruction. Same-page route/structural changes are observed too. A click by itself never proves completion. New tabs opened through an observed user link activation can inherit the task; unrelated tabs are not followed. Browser-internal pages, native PDF viewers, file URLs and denied origins remain unsupported. Backend transport failures have bounded retries and an explicit Retry guidance button.

The backend saves active task metadata and actual Mastra checkpoints locally under `workflow-3/.data`; unsaved tasks expire from the active session after one idle hour. If optional Tiger Data is connected, **Save this task** explicitly stores the goal, milestone, confirmed progress, and Mastra run reference in Tiger Data and keeps its full local Mastra checkpoint available for resume. **Saved tasks** lists and restores those journeys; **Delete saved task** removes the Tiger record and attempts to remove its local checkpoint. Saved task data stays until deleted.

The guide menu also has **Share help events**, off by default. These events are pseudonymous and linked to the configured Tiger owner. When enabled, clicking **Explain more** or **I'm stuck**, losing a highlighted target, or a provider failure sends a timestamped coarse category only; it excludes page text, URLs, and field values. A startup cleanup and periodic pruning retain events for seven days, and turning the setting off deletes that owner's stored events. Tiger connection instructions and the current single-owner API limitation are in [workflow-3/README.md](../workflow-3/README.md). The current bearer-token backend is not multi-user authentication; do not share it across users.

Extension bindings still use Chrome session storage. Tiger retains the saved journey record while the backend is stopped; resuming after a backend restart also requires the same local `.data` directory for its Mastra checkpoint. The public-source table is populated only by a connected real source adapter when its non-synthetic cited HTTPS excerpt is used. No Tiger credentials are configured in this checkout.

For screenshots, the UI shows **Sending / Analyzing** with elapsed time. On success, **Image analyzed** includes the actual `visualObservation` returned by Gemini. If the provider fails or supplies no visual findings, it says so instead of treating successful capture as successful analysis. Findings and instruction text may be saved with task state; raw crop data is never included in task files or Mastra checkpoints. The cropped image is sent as inline multimodal input, not a text filename or reusable file upload.

A real Gemini image-only request produced visible findings; a later fictional form request produced validated guidance. Reload the extension and refresh your page after upgrading; start a new task once when migrating from the old memory-only backend.

## Page compass and form evidence (0.5)

**Tools & settings** now opens a compact Page compass. Search returns concise destinations with their type and section, collapses duplicate links, and keeps same-name fields distinct by form group. **Show** moves the mascot to the item without activating it. **Find required fields**, **Find visible errors**, and **Current step** work locally without Gemini calls. Reading preferences sit in one collapsed group.

Beside the mascot, **Why this step?** separates observed page facts, what changed, and what to look for next. Saved guidance has a visible cache indicator; cooldown messages explain when another model call can be attempted. Form context includes groups, required status, types, and constraints without sending filled values. Screenshots still require crop review and explicit sharing.

Tiger Data is optional: set `TIGER_DATABASE_URL` in the backend `.env` and run `npm run cache:check` from `workflow-3`. Only reusable static form structure and guidance enter that cache. Answers, raw screenshots, and task progress do not. Until a database is configured, the backend uses local cache storage. Local task checkpoints remain separate.

## Public instructions (0.5.1)

The existing Mastra/Gemini flow searches for supporting public instructions on demand using Bright Data Bing SERP, then the backend reads up to three approved public results through normal HTTPS. Government and recognized nonprofit publishers are labeled separately. The mascot shows retrieval status, a collapsible preparation checklist, source excerpts and retrieval times. If lookup fails, live-page guidance continues with an explicit message. Reload the extension and refresh the website to see these controls.

Search and extraction succeeded against public government pages in a live check. Source requirements can be jurisdiction-specific; the guide should ask which state applies before using a state-specific checklist. Bright Data's restricted government proxy is not used for page fetching. API credentials remain in the backend only.
