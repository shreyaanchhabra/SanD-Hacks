# AccessPatch Companion

This is a separate companion extension for the untouched `exode-mascot-extension`. It does not import, edit, or merge with the mascot extension files.

## Features

- Searches visible headings, links, buttons, fields, and sections.
- Highlights matching page items and shows safe, user-clicked links.
- Provides Simplify, Easy Read, and Low Vision modes.
- Simplify hides only decorative images and unrelated sections that do not contain protected words such as errors, deadlines, costs, consent, help, or required information.
- Adds text notes from existing image alt text or captions for important photos. It reports when no text description is available; it does not pretend to identify image pixels with AI.
- Restores all companion changes.
- Floats above the page with a draggable title bar, resize handle, and collapse button.

## Install separately

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked**.
4. Choose this `accesspatch-companion` folder.
5. Load `exode-mascot-extension` separately if you want the mascot at the same time.

The companion intentionally does not edit the existing mascot extension manifest or source files.
