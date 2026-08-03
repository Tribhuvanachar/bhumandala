// js/char-palette.js
// Maps to F-020: Floating Special-Character Keyboard
// A small floating panel of Sanskrit/IAST special characters (Om, long
// vowels, anusvara/visarga, retroflexes, avagraha, Vedic accent marks)
// that inserts into whichever text input or textarea was last focused —
// works for the search box, note composer, or the Ask Acharya follow-up
// box without needing a native IAST keyboard.

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['char-palette.js'] = 'v1.0';

const DGE_SPECIAL_CHARS = [
  { ch: 'ॐ', label: 'Om' },
  { ch: 'ā', label: 'ā' }, { ch: 'ī', label: 'ī' }, { ch: 'ū', label: 'ū' },
  { ch: 'ṛ', label: 'ṛ' }, { ch: 'ṝ', label: 'ṝ' },
  { ch: 'ḷ', label: 'ḷ' }, { ch: 'ḹ', label: 'ḹ' },
  { ch: 'ṃ', label: 'ṃ (anusvāra)' }, { ch: 'ḥ', label: 'ḥ (visarga)' },
  { ch: 'ṅ', label: 'ṅ' }, { ch: 'ñ', label: 'ñ' },
  { ch: 'ṭ', label: 'ṭ' }, { ch: 'ḍ', label: 'ḍ' }, { ch: 'ṇ', label: 'ṇ' },
  { ch: 'ś', label: 'ś' }, { ch: 'ṣ', label: 'ṣ' },
  { ch: '\u2019', label: "' (avagraha)" },
  { ch: '\u0951', label: '॑ (udātta)' },
  { ch: '\u0952', label: '॒ (anudātta)' }
];

let dgeLastFocusedInput = null;

document.addEventListener('focusin', (e) => {
  if (e.target && (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && e.target.type === 'text'))) {
    dgeLastFocusedInput = e.target;
  }
});

window.dgeInsertSpecialChar = function(ch) {
  const el = dgeLastFocusedInput;
  if (!el || !document.body.contains(el)) {
    if (typeof showToast === 'function') showToast('Tap into a text field first, then pick a character.');
    return;
  }
  const start = el.selectionStart != null ? el.selectionStart : el.value.length;
  const end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
  const val = el.value;
  el.value = val.slice(0, start) + ch + val.slice(end);
  const newPos = start + ch.length;
  el.focus();
  el.setSelectionRange(newPos, newPos);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

window.toggleCharPalette = function() {
  const panel = document.getElementById('charPalettePanel');
  if (panel) panel.classList.toggle('show');
};

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('charPaletteGrid');
  if (!grid) return;
  grid.innerHTML = DGE_SPECIAL_CHARS.map(c =>
    `<button type="button" title="${c.label}" onmousedown="event.preventDefault();" onclick="window.dgeInsertSpecialChar('${c.ch}')">${c.ch}</button>`
  ).join('');
});
