# dge/images/

Static image assets for the app. Currently used by:

## Share-as-Image templates (`js/screenshot.js`)

Drop a PNG here named **`share-template.png`** (recommended size: 1080×1080,
matching the generated card) to use it as the background/frame for the
"🖼️ Share as Image" feature instead of the plain programmatic card.

- If `images/share-template.png` exists, it's drawn as the base layer and
  the shloka title/number/text are drawn on top of it.
- If it doesn't exist (or fails to load), the code falls back to the
  current solid-background + border card — nothing breaks either way.

To support multiple templates (e.g. a different design per theme), add
more files here (e.g. `share-template-vibrant.png`) and this can be
extended to pick one based on the active theme — ask if you want that
wired up once you have the files.

Leave plenty of empty space in the vertical-center third of the image —
that's where the shloka text gets drawn, and it word-wraps to fit
whatever space is available.
