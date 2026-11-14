# AccessPatch — Simple Team Plan

## What we are building

A Chrome extension that helps older adults with cognitive accessibility needs use government, benefits, and insurance websites. The user describes a task, the extension highlights relevant parts, and a mascot explains the next step through text and voice.

The user navigates and fills out forms themselves. The extension provides guidance and reversible visual changes.

Starting reference: `/Users/shreyaanchhabra/Downloads/SanD-Hacks-main/accesspatch-usa-gov/`. Reuse useful ideas from it; the team can choose how much to keep.

## How coding agents should work

- Treat this as a direction, not a strict technical specification.
- Inspect existing work before choosing an approach.
- Make reasonable assumptions about libraries, file structure, and routine implementation details. Briefly record important assumptions.
- Ask for guidance when a decision changes the user experience, project scope, data sharing, or another person's work. Continue independent work while waiting.
- Start with sample pages and mock responses so each person can make progress independently.
- Keep boundaries simple. Agree on a small example of the information exchanged when connecting components; avoid designing a large shared framework upfront.
- Each person checks their own work and documents how to run it.

## Workflow 1 — Chrome extension and website changes

**Person 1 builds the part that interacts with the website.**

- Set up or extend the Chrome extension.
- Identify useful headings, links, buttons, and form labels on the current page.
- Highlight task-relevant elements and make them easier to read.
- Offer reversible simplification of unrelated content, keeping important information available.
- Add a way to restore the original page.
- Start with sample task instructions; connect the AI guidance later.

**First demo:** On a sample government page, highlight a useful link, simplify the view, and undo the changes.

## Workflow 2 — Mascot, help panel, and voice

**Person 2 builds the experience the user sees and hears.**

- Create the task-entry and help panel.
- Reuse Gleam or propose another mascot.
- Let the mascot stay in the panel or appear beside the relevant page element.
- Show one clear instruction at a time.
- Use ElevenLabs for spoken guidance; add spoken requests if time allows.
- Include pause, replay, hide, and reduced-motion options.
- Work with sample instructions and target positions until the other components are ready.

**First demo:** A person enters a task, sees a mascot explain a sample step, and hears it through ElevenLabs.

## Workflow 3 — AI understanding and task guidance

**Person 3 builds the system that decides what guidance to show.**

- Use Gemini to understand the user's goal and relevant page information.
- Return simple structured guidance that the extension can interpret.
- Explain confusing form labels in plain language.
- Use Mastra to organize the flow and remember the current task.
- Wait for the user to act, then decide the next instruction.
- Ask a clarification when the request or next step is unclear.
- Start with sample page descriptions and sample official information.

**First demo:** Given a task and sample page information, return a useful next step and continue after a simulated user action.

## Workflow 4 — Public information, storage, and demo evidence

**Person 4 builds the supporting information and data layer.**

- Use Bright Data to collect relevant public government or insurance instructions.
- Keep source links and retrieval times so explanations can be traced to official information.
- Use Tiger Data to store sources, minimal task progress, and consented interaction events.
- Provide a simple way for the AI component to retrieve useful context.
- Create a small developer/demo view showing source collection, task progress, and sponsor activity.
- Use fictional data while developing and clearly label anything synthetic.

**First demo:** Collect one real public page through Bright Data, save it in Tiger Data, and display its source and a few sample task events.

## Connecting the four parts

- Start with one government financial-assistance task and a fictional application form. Choose the exact example together.
- Everyone can develop their first demo independently using sample data.
- Connect the extension and mascot first, then add AI guidance and the information/storage layer as they become ready.
- Agree on the smallest useful shared format: task, relevant page elements, next instruction, target element, and source links. Let the implementing agents propose the details.
- Keep each sponsor's real contribution visible in the final demo; do not present mock responses as live integrations.
- Each person owns fixes in their area. Choose an integration lead to coordinate the final demonstration.
- Add insurance as a second journey once the first works. Keep Gmail scam guidance as a later feature.

## Essential boundaries

- Do not click website controls, fill answers, or submit forms for the user.
- Keep website changes local and reversible; do not change the website's internal application data.
- Keep API keys on the backend.
- Do not send passwords, identity numbers, private form answers, or unrelated account content by default. Ask before expanding data collection.
- Preserve errors, deadlines, costs, consent, security information, and recovery controls.
- Make guidance usable without voice or animation.
- If the guide cannot identify the next step reliably, explain that and ask rather than guessing.

## Final demo goal

The user states a task, the page becomes easier to follow, the mascot gives spoken instructions, the person performs the steps themselves, and the guide continues across the supported journey. All five sponsors contribute to that experience.
