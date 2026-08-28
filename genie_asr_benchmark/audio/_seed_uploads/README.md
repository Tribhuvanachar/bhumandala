# Seed audio -- provided by the project lead, 28 Aug 2026

Two real recordings of the same/similar spoken command ("Open Sumadhwa
Vijaya 1.1"), used in earlier ad-hoc Sarvam Saaras testing (see
`dge/PENDING.md`/the Genie ASR session brief for that history):

- `sumadhwa_test.wav` -- despite the extension, an MP4 container (AAC-LC,
  8kHz mono, ~12kbps). Sarvam Saaras v3 REST transcribed this correctly.
- `sumadhwa_16k.m4a` -- MP4/AAC-LC, 16kHz mono, 64kbps. Sarvam transcribed
  this as "Sumadha Open Sumadha Vijaya 1.1" (noisy, but the target entity
  is still recoverable -- the point of the semantic-resolver layer, not
  a reason to discard the sample).

This is a **seed**, not the final benchmark corpus layout: the Genie ASR
session should fold these into its own `genie_asr_benchmark/audio/<NN_category>/`
structure with a proper manifest entry each (see that session's own brief
for the `01_english/`...`13_ambiguous_commands/` layout), not leave them
sitting in this holding folder as final structure.

This branch exists only to move personal voice recordings from the
project lead's own upload into the ASR session's reach without going
through `main` -- keep audio fixtures off `main` unless/until there's a
real reason for them to be there permanently.
