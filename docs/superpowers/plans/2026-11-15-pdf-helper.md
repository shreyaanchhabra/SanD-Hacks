# PDF Helper Implementation Plan

> Use executing-plans for inline implementation.

**Goal:** Automatically recognize PDFs and provide a simple local viewer with field guidance.
**Architecture:** Background detects PDF navigation; viewer renders bundled PDF.js and creates value-free snapshots for existing API.
**Tech Stack:** Chrome MV3, PDF.js, existing Mastra/Gemini backend.
**Spec:** docs/superpowers/specs/2026-11-15-pdf-helper-design.md

## Constraints
No PDF uploads or entered values in requests. Keep original accessible. No merge/push.

## Tasks
- [x] Test PDF URL validation, detection, and value-free field snapshots.
- [x] Implement background routing with original-view bypass and MIME detection.
- [x] Bundle PDF.js; implement page rendering, field selection/editing, local download, mascot Q&A and persistent sources.
- [x] Verify unit/type/browser checks and actual IRS PDF parsing.

## Review focus
Prevent redirect loops; reject non-HTTP URLs; do not expose annotation values; handle failed fetch and scans explicitly; discard stale responses when selection changes.

Ruling: automatic detection uses existing site access and a user-clicked IRS-only grant. No tabs/webRequest or all-site permission added; non-.pdf endpoints deferred after automatic approval review rejected broader permissions.
