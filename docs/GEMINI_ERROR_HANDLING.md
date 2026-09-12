# Shared Gemini error handling — integration guide

**Round-3, brief #1 (the only complete one).** One shared client, `dge/js/gemini.js`,
that replaces the three separate `fetch(...generativelanguage...)` blocks in
Ashtadhyayi, Kosha and Convert.

## What it fixes

The quota-exceeded error (`429 / RESOURCE_EXHAUSTED`) is a **BYOK billing/quota issue
on the user's own Google key** — DGE can't grant more quota. So the fix is not a retry
loop, it's:

1. **Human error messages.** Every Gemini failure maps to a title + plain explanation +
   an *action the user can actually take* (add a key, wait for the per-minute reset,
   enable billing, pick a lighter model, enable the API on their key, etc.).
2. **One-step model fallback.** When the chosen model is quota-limited, missing, or
   temporarily overloaded, it retries **once** with a lighter model
   (`gemini-2.5-flash` → `gemini-2.5-flash-lite`) and tells the user it fell back.
   Failures that a retry can't fix (bad key, permission, network) fail fast — no wasted call.

Built once here so all three surfaces behave identically instead of three separate patches.

## Files

```
dge/js/gemini.js        ← drop in as-is (no dependencies, no build step)
```

## Step 1 — load it before the three page scripts

In `ashtadhyayi.html`, `kosha.html`, and the Convert page, add the script tag
**before** the page's own JS:

```html
<script src="js/gemini.js"></script>
<!-- then the existing page script, e.g. -->
<script src="js/ashtadhyayi.js"></script>
```

If a page uses different localStorage keys for the key/model than the defaults
(`dge_gemini_api_key` / `dge_gemini_model`), tell the module once, at the top of that
page's script:

```js
DGEGemini.configure({ lsKey: "myKeyName", lsModel: "myModelName" });
```

## Step 2 — replace each hand-rolled Gemini call

Find the block in each file that does `fetch("https://generativelanguage.googleapis.com/...")`,
reads `data.candidates[0].content.parts[0].text`, and has its own `try/catch`. Replace the
whole thing with one call:

```js
const r = await DGEGemini.generate({
  prompt: userText,                 // OR: contents: [...] for multi-turn
  system: systemInstruction,        // optional
  generationConfig: { temperature: 0.3, maxOutputTokens: 2048 } // optional
});

if (r.ok) {
  showAnswer(r.text);
  if (r.fellBack) showNotice(r.notice);   // "Switched to …-lite because …"
} else {
  showError(r.error);   // { kind, title, message, action, detail }
}
```

`generate()` **always resolves** (it never throws except on an `AbortController` abort),
so you don't need a `try/catch` around it — just branch on `r.ok`.

### Error surface

Use your existing error UI, or the built-in renderer for a consistent block:

```js
container.appendChild(DGEGemini.renderError(r.error));
```

`r.error.kind` is one of `DGEGemini.KIND`:
`no_key`, `bad_key`, `quota`, `permission`, `model_missing`,
`bad_request`, `blocked`, `overloaded`, `network`, `unknown`
— branch on it if a surface wants custom behaviour (e.g. open the key dialog on `no_key`/`bad_key`).

## Per-surface notes

- **Ashtadhyayi tutor** — grounding on open commentary layers is unchanged: keep building
  your prompt/`contents` as today and pass them straight to `generate()`. If a request can
  be cancelled (user closes the card), pass `signal: controller.signal`.
- **Kosha cross-language pivot** — same call; the Kannada/English/Hindi pivot prompt goes in
  as `prompt`. Quota fallback to Flash-Lite is ideal here since pivots are short.
- **Convert** — same call. If Convert loops over many items, note that a `quota` error on one
  item will apply to all; surface it once rather than per row.

## Streaming?

This module is request/response (non-streaming) with clean errors. If a surface currently
streams (`:streamGenerateContent`), keep its streaming path but route its **error handling**
through the same messages by calling `DGEGemini` only on the failure branch — or drop
streaming for that surface to get the unified behaviour. Streaming can be added to the shared
module later if you want it everywhere.

## Config knobs (optional)

```js
DGEGemini.configure({
  defaultModel:  "gemini-2.5-flash",
  fallbackModel: "gemini-2.5-flash-lite",
  lsKey: "dge_gemini_api_key",
  lsModel: "dge_gemini_model"
});
```

Per-call overrides: `generate({ ..., model, fallbackModel, apiKey })`.
Set `fallbackModel: null` on a call to disable the one-step fallback for that call.

## Delivery

`git`-add `dge/js/gemini.js`, add the script tag to the three HTML pages, swap the three
call blocks. Everything is additive except the three replaced fetch blocks.
