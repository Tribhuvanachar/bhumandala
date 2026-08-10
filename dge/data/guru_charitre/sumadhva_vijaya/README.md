# Sumadhva Vijaya — Sri Narayana Panditacharya

The foundational hagiography of Sri Madhvacharya's life, 16 sargas. This
folder currently holds **audio only** — no verse text yet (see below).

## Status

- **Audio**: `assets/` — 1,041 mp3 files, renamed from the original app's
  `<lead><sarga:2><index:3>.mp3` codes to `smv<sarga>.<n>.mp3`
  (e.g. `smv1.1.mp3`, `smv1.2.mp3`, ..., `smv16.61.mp3`), sequential per
  sarga in the source app's own recording order. Extracted from
  `smv-assets-audio.7z.001/.002/.003` (joined, then a 7z containing a
  nested `smv-assets-audio.zip`).
- **Text**: not yet available. `smv-assets-text.zip` was expected to hold
  the Sanskrit verse text but on inspection contains only Android `res/`
  resources (layouts, ExoPlayer UI) — no `assets/` folder, no verse
  content at all. A proper source (the app's actual `assets/` folder, or
  another edition) is still needed before this grantha can be populated
  with text the way Yukti Mallika / Svapna-Vrindavanakhyana were.

## Flagged during renaming (20 files, ~2% of total) — worth a spot-check

The source app's numbering is mostly a clean per-sarga sequence starting
at 0, but two patterns didn't fit that and were kept (nothing discarded)
rather than guessed away:

1. **3 duplicate-index pairs, sarga 1 only** — `001001.mp3`/`101001.mp3`,
   `001002.mp3`/`101002.mp3`, and `001003.mp3`/`101003.mp3` each map to
   the same verse index under this renaming scheme. Both files in each
   pair were kept as consecutive sequential numbers (landing next to each
   other, e.g. around `smv1.1.mp3`/`smv1.2.mp3`) — likely an alternate
   take of the opening verses, but which one (if either) should be
   treated as canonical isn't determinable from the data alone.
2. **One high-numbered outlier per sarga** (e.g. `101555.mp3` for sarga 1,
   `116558.mp3`/`116559.mp3` for sarga 16) — index far above that sarga's
   normal verse-count range. File sizes are normal (not empty/corrupt),
   so these are real distinct short recordings — most likely a closing
   colophon or phalashruti clip tacked on after the main verses, using a
   high number to avoid colliding with future verse additions, rather
   than genuinely being "verse 555" of a sarga with only ~55 verses. They
   ended up as the **last** `smv<sarga>.<n>.mp3` file for their sarga.

Full original-filename ↔ new-filename mapping for every file (not just
the flagged ones) is available on request if useful for cross-checking
against the source app.
