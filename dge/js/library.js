// dge/js/library.js — Library browser modal, window.openLibraryModal().
// Lists every POPULATED grantha from data/library.json, grouped by
// category, and jumps to one via ?path=<slug>. Deliberately excludes
// anything not yet populated — the catalog currently lists 172 planned
// granthas but only a handful have real content at any given time;
// showing empty placeholders in a public browse menu would look broken.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['library.js'] = 'v1.0 (Library browser modal)';

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
    const items = byCategory[cat].slice().sort((a, b) => a.title.localeCompare(b.title));
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
  window.location.href = window.location.pathname + '?path=' + encodeURIComponent(slug);
};
