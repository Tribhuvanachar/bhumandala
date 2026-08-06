// dge/js/library.js — Library browser modal, window.openLibraryModal().
// Renders every POPULATED grantha from data/library.json as a collapsible
// TREE mirroring the real taxonomy folder structure, rather than one flat
// list per top-level category. With four Vedas x shakha x samhita x
// mandala/kanda now live, a flat list interleaved unrelated texts
// (Rigveda mandala 1, Atharvaveda kanda 1, Rigveda mandala 2 ...) and
// gave no sense of where anything sat in the corpus.
// Deliberately excludes unpopulated entries — the catalog lists hundreds
// of planned granthas, and showing empty placeholders would look broken.
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['library.js'] = 'v2.0 (Collapsible taxonomy tree; fixed sort that interleaved different texts by trailing number)';

// Display names for path segments. Anything not listed falls back to
// dgeAutoLabel() below, so new folders never break the browser — this map
// only exists to give proper diacritics/Devanagari where it matters.
const DGE_PATH_LABELS = {
  vedas: 'Vedas', stotras: 'Stotras', puranas: 'Purāṇas',
  itihasas: 'Itihāsas', smritis: 'Smṛtis', sutras: 'Sūtras',
  dharmashastra: 'Dharmaśāstra', pancharatra_agama: 'Pāñcarātra Āgama',
  sarvamoola_grantha: 'Sarvamūla Granthas', dasakuta: 'Dāsakūṭa',
  vyasakuta: 'Vyāsakūṭa', ancillary: 'Ancillary',

  rigveda: 'Ṛgveda', yajurveda: 'Yajurveda',
  samaveda: 'Sāmaveda', atharvaveda: 'Atharvaveda',

  krishna_yajurveda: 'Kṛṣṇa Yajurveda', shukla_yajurveda: 'Śukla Yajurveda',

  shakala_shakha: 'Śākala Śākhā', bashkala_shakha: 'Bāṣkala Śākhā',
  shaunaka_shakha: 'Śaunaka Śākhā', paippalada_shakha: 'Paippalāda Śākhā',
  kauthuma_shakha: 'Kauthuma Śākhā', ranayaniya_shakha: 'Rāṇāyanīya Śākhā',
  jaiminiya_shakha: 'Jaiminīya Śākhā', taittiriya_shakha: 'Taittirīya Śākhā',
  maitrayani_shakha: 'Maitrāyaṇī Śākhā', katha_shakha: 'Kaṭha Śākhā',
  vajasaneyi_madhyandina_shakha: 'Vājasaneyi Mādhyandina Śākhā',
  vajasaneyi_kanva_shakha: 'Vājasaneyi Kāṇva Śākhā',

  samhita: 'Saṃhitā', brahmana: 'Brāhmaṇa', brahmanas: 'Brāhmaṇas',
  aranyaka: 'Āraṇyaka', aranyakas: 'Āraṇyakas',
  upanishad: 'Upaniṣad', upanishads: 'Upaniṣads',
  mula: 'Mūla', tika: 'Ṭīkā', tippani: 'Ṭippaṇī',
  purvarchika: 'Pūrvārcika', uttararchika: 'Uttarārcika'
};

// "mandala_07" -> "Maṇḍala 7"; "some_folder_name" -> "Some Folder Name".
const DGE_NUMBERED_PREFIXES = {
  mandala: 'Maṇḍala', kanda: 'Kāṇḍa', adhyaya: 'Adhyāya',
  skandha: 'Skandha', prapathaka: 'Prapāṭhaka', anuvaka: 'Anuvāka',
  ashtaka: 'Aṣṭaka', parva: 'Parva', sarga: 'Sarga'
};

function dgeAutoLabel(seg) {
  const m = seg.match(/^([a-z]+)_(\d+)$/i);
  if (m && DGE_NUMBERED_PREFIXES[m[1].toLowerCase()]) {
    return DGE_NUMBERED_PREFIXES[m[1].toLowerCase()] + ' ' + parseInt(m[2], 10);
  }
  return seg.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function dgeSegLabel(seg) {
  return DGE_PATH_LABELS[seg] || dgeAutoLabel(seg);
}

// Compares path segments so "mandala_2" precedes "mandala_10" (numeric
// where both segments share a prefix), while keeping unrelated folders
// properly separated instead of interleaving them purely by trailing
// number — which is what the previous sort did.
function dgeCompareSlugs(a, b) {
  const pa = a.split('/'), pb = b.split('/');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const mx = x.match(/^(.*?)(\d+)$/), my = y.match(/^(.*?)(\d+)$/);
    if (mx && my && mx[1] === my[1]) return parseInt(mx[2], 10) - parseInt(my[2], 10);
    return x.localeCompare(y);
  }
  return 0;
}

function dgeBuildTree(entries) {
  const root = { children: {}, leaves: [] };
  entries.forEach(e => {
    const segs = e.slug.split('/');
    let node = root;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      node.children[s] = node.children[s] || { children: {}, leaves: [], key: s };
      node = node.children[s];
    }
    node.leaves.push(e);
  });
  return root;
}

let dgeTreeNodeSeq = 0;

// Collapses single-child chains ("Ṛgveda › Śākala Śākhā › Saṃhitā") into
// one row instead of three nested taps — the taxonomy is deep and mostly
// linear, so without this the tree needs four taps to reach any mantra.
function dgeRenderNode(node, labelPrefix, depth) {
  const childKeys = Object.keys(node.children).sort(dgeCompareSlugs);
  if (childKeys.length === 1 && node.leaves.length === 0) {
    const only = node.children[childKeys[0]];
    const label = (labelPrefix ? labelPrefix + ' › ' : '') + dgeSegLabel(childKeys[0]);
    return dgeRenderNode(only, label, depth);
  }

  const id = 'dgeTree' + (dgeTreeNodeSeq++);
  const inner =
    childKeys.map(k => dgeRenderNode(node.children[k], dgeSegLabel(k), depth + 1)).join('') +
    node.leaves.slice().sort((a, b) => dgeCompareSlugs(a.slug, b.slug)).map(leaf =>
      `<div class="pop-item" style="margin-left:${depth * 10}px;"
            onclick="window.dgeGoToGrantha('${leaf.slug}')">${leaf.title}</div>`
    ).join('');

  if (!labelPrefix) return inner;

  const count = dgeCountLeaves(node);
  return `<div style="margin-left:${depth * 10}px;">
    <div onclick="window.dgeToggleTreeNode('${id}', this)"
         style="cursor:pointer; padding:7px 4px; font-size:13px; font-weight:600;
                display:flex; align-items:center; gap:6px;">
      <span style="font-size:10px; width:10px;">▸</span>
      <span style="flex:1;">${labelPrefix}</span>
      <span style="font-size:10px; color:var(--muted-text); font-weight:400;">${count}</span>
    </div>
    <div id="${id}" style="display:none;">${inner}</div>
  </div>`;
}

function dgeCountLeaves(node) {
  let n = node.leaves.length;
  Object.values(node.children).forEach(c => { n += dgeCountLeaves(c); });
  return n;
}

window.dgeToggleTreeNode = function(id, headerEl) {
  const el = document.getElementById(id);
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  const arrow = headerEl.querySelector('span');
  if (arrow) arrow.textContent = open ? '▸' : '▾';
};

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

  const populated = library.granthas.filter(g => g.populated).map(g => {
    const slug = window.dgeGranthaSlug(g.path);
    return { slug, title: g.title || slug };
  });
  if (!populated.length) {
    listEl.innerHTML = `<div class="note-preview-box" style="margin:0;">No texts are available yet — check back soon.</div>`;
    return;
  }

  dgeTreeNodeSeq = 0;
  const tree = dgeBuildTree(populated);
  const topKeys = Object.keys(tree.children).sort(dgeCompareSlugs);
  listEl.innerHTML =
    `<div style="font-size:11px; color:var(--muted-text); margin-bottom:8px;">${populated.length} text(s) available</div>` +
    topKeys.map(k => dgeRenderNode(tree.children[k], dgeSegLabel(k), 0)).join('') +
    tree.leaves.sort((a, b) => dgeCompareSlugs(a.slug, b.slug)).map(leaf =>
      `<div class="pop-item" onclick="window.dgeGoToGrantha('${leaf.slug}')">${leaf.title}</div>`
    ).join('');
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
