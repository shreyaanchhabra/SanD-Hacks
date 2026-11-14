# AccessPatch live-page connector

This separate unpacked extension connects live page text and controls to workflow 3. It leaves the original zipped prototype untouched so the extension/UI teammates can reuse this bridge later.

## Run it

1. In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this `extension-live` folder.
2. Copy the extension's ID. In `workflow-3`, copy `.env.example` to `.env` and add:

   ```dotenv
   ALLOWED_EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID
   ```

3. From `workflow-3`, run `npm run dev`. Copy the temporary local API token printed by the server. The connector currently uses port **4313**; keep that port for this setup.
4. Open a public ordinary HTTP/HTTPS page. Click the extension, expand **Connect your local backend**, paste the token, and select **Connect**. The token is stored only in Chrome session storage, not in the website. Never paste a Gemini API key into this field.
5. Enter a task. Select **Inspect this page** and review **the exact page context**. Nothing is sent to the backend until you explicitly choose **Share context & start guidance**.
6. Read the instruction, then select **Highlight target** if useful. Close the popup and perform the website action yourself. After acting or navigating, reopen the extension, inspect/review the current page, then choose **Continue**. On the same page, Continue is your explicit confirmation that you performed the step; it is not proof of form submission.
7. Use **Remove highlight**, **Pause**, or **New task** as needed. Keep the popup open while waiting for a response. If the backend restarts or the run expires, start a new task.

## Gemini versus demo mode

The connector reads actual DOM text in both modes. General page guidance requires `PLANNER_MODE=gemini` plus `GEMINI_API_KEY` and `GEMINI_MODEL` in the backend `.env`. These secrets never enter the extension. In that mode, approved task/page context goes to Gemini. Live Gemini calls have not been verified here because credentials were not provided.

The default `mock` mode is intentionally narrow: it recognizes an “Energy bill assistance” link and a “Household” field. It is useful for checking the full connection without credentials; it does not understand arbitrary websites. To try a live DOM fixture, run `npm run demo:page` from `workflow-3`, open `http://127.0.0.1:4320`, and enter “Help with my energy bill.” This is explicitly fictional data, not a government application.

## What is read

- Up to 50 visible labeled links/buttons/form controls, eight headings, and explicit `aria-describedby` help text.
- Page title and origin only. URL paths, queries, fragments, destinations, and credentials are not sent.
- No input values, password fields, selected option values, textarea contents, custom textbox contents, editable content, cookies, screenshots, or whole-page HTML.
- Task text, labels, headings, and help text can themselves contain personal information. Review before sharing; this is not a guarantee of automatic redaction. Use public pages and fictional data while developing.

Controls get temporary IDs held in an isolated content script. The backend never supplies CSS selectors or code. Highlighting rechecks the page ID/revision and node reference, never clicks/focuses/scrolls/fills a control, and restores only its own style properties. Changed labels or destinations invalidate prior guidance; slow replies for an old page are withheld. Page revisions do not track changes to entered values.

## Limits and teammate integration

This version handles the main document's ordinary DOM. Browser-internal pages, browser PDF viewers, cross-origin frames, shadow DOM widgets, unlabeled controls, and controls beyond the bounded snapshot may be unsupported. Disabled/hidden controls are omitted. The extension is activated per tab using `activeTab`; it does not continuously collect all browsing. Progress is explicit rather than automatic. Supported extraction is not a claim of reliable guidance for every website.

- Workflow 1 can reuse `content.js` mapping and target validation. Messages are `snapshot`, `highlight` with `pageId/revision/targetId`, and `restore`.
- Workflow 2 can replace this development popup with the mascot/panel; keep preview, consent, stale-response handling, and text-only operation.
- Workflow 3 owns the existing HTTP API. `chrome.storage.session` binds each tab to a task. Provider keys remain backend-only.
- Workflow 4's source/storage integrations are unchanged and still pending. The current API token is for a local single-developer demo, not production multi-user authentication.

Verification: browser tests exercise real Chromium DOM extraction, privacy canaries, reversible highlights, changed destinations, navigation into the real local Mastra service, and delayed popup replies. The test harness simulates Chrome messaging; manual installation/activeTab behavior and live third-party websites still need a Chrome smoke check. No real Gemini or other teammate provider call was made.
