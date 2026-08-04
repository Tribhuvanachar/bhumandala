# Changelog

## v0.4.0 — 2026-08-04
- **First real functional pipeline.** Previous versions (up to 0.3.0) were stub/placeholder modules only.
- PDF.js wired up for real (loaded from CDN — the local `libs/` placeholder files were never populated with a real build, so CDN is now the source of truth; `libs/` can be deleted).
- Page-by-page rendering to PNG, one page at a time (deliberate — avoids holding many rendered canvases in memory at once on mobile).
- Real Google Cloud Vision OCR integration, page-by-page with progress display.
- Real Gemini proofreading integration — prompts toward the actual DGE shloka/commentary schema, with loose JSON parsing to handle stray markdown fences in model output.
- Resume support: last successfully OCR'd page is saved to localStorage per-file; interrupted runs offer to resume instead of restarting.
- Error handling for invalid keys, quota limits, network failures, and unreadable PDFs — with specific, actionable messages rather than generic failures.
- Preview renders the final Gemini-proofread JSON as shloka/commentary blocks.
- Downloads for both `ocr.json` (raw OCR) and `final.json` (proofread).
- `window.DGE` used as the single global namespace throughout (`DGE.PDF`, `DGE.Vision`, `DGE.Gemini`, `DGE.Renderer`, `DGE.Utils`, `DGE.App`) — kept fully separate from the main reader app's globals since this is always a standalone page.

### Known limitations, not yet addressed
- Gemini proofreading sends the *entire* OCR text in one request — for a very long book this may exceed the model's practical input size and need chunking. Not yet hit in testing; flag if it happens.
- No GitHub integration yet, by design (see requirements) — when added, should reuse the Contents/Blobs API helpers already built in the main app's `admin-editor.js`.

## v0.3.0 (prior)
- Added PDF inspection module separation.
- Added page preparation module (stub only, not real rendering).
- Versioning and cache-busting scaffolding retained from this point forward.
