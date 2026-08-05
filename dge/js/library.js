// dge/js/library.js — Library browser modal, window.openLibraryModal().
// Lists every POPULATED grantha from data/library.json, grouped by
// category, and jumps to one via ?path=<slug>. Deliberately excludes
// anything not yet populated — the catalog currently lists 172 planned
// granthas but only a handful have real content at any given time;
// showing empty placeholders in a public browse menu would look broken.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['library.js'] = 'v1.2 (Grantha links keep readable slashes instead of %2F)';

// Human-friendly labels for known top-level category folders under
// data/ — anything not listed here just falls back to a capitalized
// version of the folder name, so a new category folder never breaks this.
const DGE_CATEGORY_LABELS = {
  vedas: 'Vedas',
  brahmanas: 'Brāhmaṇas',
  aranyakas: 'Āraṇyakas',
  upanishads: 'Upaniṣads',
  itihasas: 'Itihāsas',
  puranas: 'Purāṇas',
  dharmashastras: 'Dharmaśāstras',
  pancharatra: 'Pāñcharātra',
  sarvamoola: 'Sarvamoola Grantha-s',
  stotras: 'Stotras'
};

function dgeCategoryLabel(key) {
  return DGE_CATEGORY_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g, ' ');
}

window.openLibraryModal = async function() {
  if (typeof openModal === 'function') openModal('libraryModal');
  const listEl = document.getElementById('libraryModalList');
  if (!listEl) return;
  listEl.innerHTML = `<div style="padding:20px; text-align:center; color:var(--muted-text); font-size:12px;">Loading library…</div>`;

  const library = await (window.dgeLibraryCatalogPromise || Promise.resolve(null));
  if (!library || !Array.isArray(library.granthas)) {
    listEl.innerHTML = `<div class="note-preview-box" style="margin:0;">Couldn't load the library catalog.</div>`;
    return;
  }

  const populated = library.granthas.filter(g => g.populated);
  if (!populated.length) {
    listEl.innerHTML = `<div class="note-preview-box" style="margin:0;">No texts are available yet — check back soon.</div>`;
    return;
  }

  const byCategory = {};
  populated.forEach(g => {
    const slug = window.dgeGranthaSlug(g.path);
    const category = slug.split('/')[0];
    (byCategory[category] = byCategory[category] || []).push({ slug, title: g.title || slug });
  });

  const categories = Object.keys(byCategory).sort();
  listEl.innerHTML = categories.map(cat => {
    // Plain string sort put "mandala 10" right after "mandala 1" (and
    // before "mandala 2") because "१०" starts with the same character as
    // "१" — classic lexicographic-vs-numeric ordering bug. Extracting the
    // trailing number from the SLUG (plain ASCII digits like "mandala_01"
    // — much more reliable to parse than the Devanagari numerals in the
    // title itself) and comparing numerically fixes this for any
    // similarly-numbered series, not just Rigveda mandalas.
    const items = byCategory[cat].slice().sort((a, b) => {
      const numA = (a.slug.match(/(\d+)$/) || [])[1];
      const numB = (b.slug.match(/(\d+)$/) || [])[1];
      if (numA !== undefined && numB !== undefined) {
        return parseInt(numA, 10) - parseInt(numB, 10);
      }
      return a.title.localeCompare(b.title);
    });
    const itemsHtml = items.map(item =>
      `<div class="pop-item" onclick="window.dgeGoToGrantha('${item.slug}')">${item.title}</div>`
    ).join('');
    return `<div style="margin-bottom:14px;">
      <div style="font-size:11px; font-weight:700; color:var(--muted-text); text-transform:uppercase; margin:6px 0;">${dgeCategoryLabel(cat)}</div>
      ${itemsHtml}
    </div>`;
  }).join('');
};

window.dgeGoToGrantha = function(slug) {
  // Grantha slugs are always plain lowercase letters, digits, underscores,
  // and slashes by design (see taxonomy.json) — none of that needs
  // percent-encoding, and encodeURIComponent turning every "/" into
  // "%2F" just makes the address bar hard to read for no real benefit.
  // Falls back to full encoding only if something outside that safe set
  // ever shows up, so this can't silently produce a broken URL.
  const readableSlug = /^[a-z0-9_/]+$/i.test(slug) ? slug : encodeURIComponent(slug);
  window.location.href = window.location.pathname + '?path=' + readableSlug;
};
