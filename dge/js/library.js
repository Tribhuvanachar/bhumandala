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
window.DGE_VERSIONS['library.js'] = 'v3.0 (Library Manager curation overrides — hide/pin/reorder/rename/move, non-destructive; numeral localization for titles that mix Devanagari + ASCII digits)';

// Display names for path segments, stored in DEVANAGARI as the single
// source of truth — every label is then run through the app's existing
// applyTransliteration() into whichever script the user has selected
// (Sanskrit / English-IAST / Kannada / Telugu / Tamil / Malayalam).
// Previously these were hardcoded IAST while grantha titles rendered in
// Devanagari, so the same menu mixed two scripts and neither responded
// to the script selector.
// Anything not listed falls back to dgeAutoLabel(), which is ASCII and
// deliberately left untransliterated — a folder name we have no Sanskrit
// name for shouldn't be mangled through a Devanagari->script converter.
const DGE_PATH_LABELS = {
  vedas: 'वेदाः', stotras: 'स्तोत्राणि', puranas: 'पुराणानि',
  itihasas: 'इतिहासाः', smritis: 'स्मृतयः', sutras: 'सूत्राणि',
  dharmashastra: 'धर्मशास्त्रम्', pancharatra_agama: 'पाञ्चरात्रागमः',
  sarvamoola_grantha: 'सर्वमूलग्रन्थाः', dasakuta: 'दासकूटः',
  vyasakuta: 'व्यासकूटः', dasa_sahitya: 'दाससाहित्यम्',
  koshas: 'कोशाः', ancillary: 'अङ्गानि',

  // The branches of the recommended DGE taxonomy (DGE_Shastra_Taxonomy.md).
  // Listed whether or not the corpus has been moved onto it yet: the Library
  // Manager can regroup the tree onto these names without the folders moving
  // (see the "moves" map in admin/config/library-overrides.json, and
  // tools/restructure_taxonomy.py), and an unlabelled segment falls back to
  // ASCII, which would leave a Sanskrit tree with English branch headings.
  vedanga: 'वेदाङ्गानि',
  shiksha: 'शिक्षा', chandas: 'छन्दः', nirukta: 'निरुक्तम्',
  jyotisha: 'ज्योतिषम्', kalpa: 'कल्पः', pratishakhya: 'प्रातिशाख्यानि',
  vyakarana: 'व्याकरणम्',
  ashtadhyayi: 'अष्टाध्यायी', dhatupatha: 'धातुपाठः', vritti: 'वृत्तिः',

  darshana: 'दर्शनानि', vedanta: 'वेदान्तः',
  dvaita: 'द्वैतम्', advaita: 'अद्वैतम्', vishishtadvaita: 'विशिष्टाद्वैतम्',
  nyaya: 'न्यायः', vaisheshika: 'वैशेषिकम्', sankhya: 'साङ्ख्यम्',
  yoga: 'योगः', mimamsa: 'मीमांसा',
  sarvamula: 'सर्वमूलग्रन्थाः',

  itihasa: 'इतिहासाः', purana: 'पुराणानि',
  ramayana: 'रामायणम्', ananda_ramayana: 'आनन्दरामायणम्',
  adbhuta_ramayana: 'अद्भुतरामायणम्',
  // Not a category anyone would claim: a holding place for material whose
  // home is not settled. Named plainly so it reads as temporary.
  misc: 'अन्यत्',
  smriti_dharma: 'स्मृतिधर्मशास्त्राणि', smriti: 'स्मृतयः',
  kavya_alankara: 'काव्यालङ्कारौ', kavya: 'काव्यम्',
  kosha: 'कोशाः', stotra: 'स्तोत्राणि',
  agama: 'आगमाः', pancharatra: 'पाञ्चरात्रम्',

  rigveda: 'ऋग्वेदः', yajurveda: 'यजुर्वेदः',
  samaveda: 'सामवेदः', atharvaveda: 'अथर्ववेदः',

  krishna_yajurveda: 'कृष्णयजुर्वेदः', shukla_yajurveda: 'शुक्लयजुर्वेदः',

  shakala_shakha: 'शाकलशाखा', bashkala_shakha: 'बाष्कलशाखा',
  shaunaka_shakha: 'शौनकशाखा', paippalada_shakha: 'पैप्पलादशाखा',
  kauthuma_shakha: 'कौथुमशाखा', ranayaniya_shakha: 'राणायनीयशाखा',
  jaiminiya_shakha: 'जैमिनीयशाखा', taittiriya_shakha: 'तैत्तिरीयशाखा',
  maitrayani_shakha: 'मैत्रायणीशाखा', katha_shakha: 'कठशाखा',
  vajasaneyi_madhyandina_shakha: 'वाजसनेयिमाध्यन्दिनशाखा',
  vajasaneyi_kanva_shakha: 'वाजसनेयिकाण्वशाखा',

  samhita: 'संहिता', brahmana: 'ब्राह्मणम्', brahmanas: 'ब्राह्मणानि',
  aranyaka: 'आरण्यकम्', aranyakas: 'आरण्यकानि',
  upanishad: 'उपनिषत्', upanishads: 'उपनिषदः',
  mula: 'मूलम्', tika: 'टीका', tippani: 'टिप्पणी',
  purvarchika: 'पूर्वार्चिकः', uttararchika: 'उत्तरार्चिकः',
  taittiriya_brahmana: 'तैत्तिरीयब्राह्मणम्',
  taittiriya_aranyaka: 'तैत्तिरीयारण्यकम्'
};

// Numbered folders, e.g. "mandala_07". The prefix is Devanagari (so it
// transliterates with everything else) and the numeral is converted to
// the matching script's digits by the same engine.
const DGE_NUMBERED_PREFIXES = {
  mandala: 'मण्डलम्', kanda: 'काण्डम्', adhyaya: 'अध्यायः',
  skandha: 'स्कन्धः', prapathaka: 'प्रपाठकः', anuvaka: 'अनुवाकः',
  ashtaka: 'अष्टकम्', parva: 'पर्व', sarga: 'सर्गः'
};

const DGE_DEVA_DIGITS = ['०','१','२','३','४','५','६','७','८','९'];
function dgeDevaNum(n) {
  return String(n).split('').map(d => DGE_DEVA_DIGITS[+d]).join('');
}

// A label/title that mixes Devanagari text with plain ASCII digits (e.g.
// a custom curator label like "स्कन्धः 1") passes dgeToActiveScript's
// Devanagari-detection gate as a whole, but the digit run itself is never
// touched by that gate -- it stays ASCII through a non-Devanagari script
// selection too, so the digits don't follow the rest of the label into
// Kannada/Tamil/etc. Converting the digits to Devanagari first lets the
// later transliteration pass carry them through like everything else.
function dgeLocalizeNumerals(text) {
  if (!text || !/[ऀ-ॿ]/.test(text)) return text;
  return text.replace(/\d+/g, m => dgeDevaNum(parseInt(m, 10)));
}

// ---------------------------------------------------------------------- //
// Library Manager curation overrides (admin/library.html exports
// admin/config/library-overrides.json). A NON-DESTRUCTIVE display layer only:
// hide/pin/reorder/rename/move all affect how populated granthas group
// and sort in this tree, never library.json/taxonomy.json or the actual
// fetch path -- dgeGoToGrantha always navigates on the real slug even
// after a display-only move. Absent/empty file = identical to before
// this existed.
// ---------------------------------------------------------------------- //
let dgeLibOverrides = { hidden: [], pinned: [], labels: {}, order: {}, moves: {} };

async function dgeLoadLibraryOverrides() {
  try {
    const url = window.dgeAdminConfigUrl ? window.dgeAdminConfigUrl('library-overrides.json')
                                        : '../admin/config/library-overrides.json';
    const ov = await fetch(url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
    if (ov) {
      dgeLibOverrides = {
        hidden: Array.isArray(ov.hidden) ? ov.hidden : [],
        pinned: Array.isArray(ov.pinned) ? ov.pinned : [],
        labels: (ov.labels && typeof ov.labels === 'object') ? ov.labels : {},
        order: (ov.order && typeof ov.order === 'object') ? ov.order : {},
        moves: (ov.moves && typeof ov.moves === 'object') ? ov.moves : {}
      };
      return;
    }
  } catch (e) { /* no overrides file yet */ }
  // Legacy fallback: the older hide-only file, still honored when the
  // newer overrides file doesn't exist yet.
  try {
    const vis = await fetch('data/library-visibility.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
    if (vis && Array.isArray(vis.hidden)) dgeLibOverrides.hidden = vis.hidden;
  } catch (e) { /* nothing hidden */ }
}

function dgeIsHiddenPath(path) {
  const parts = path.split('/');
  for (let i = 1; i <= parts.length; i++) {
    if (dgeLibOverrides.hidden.indexOf(parts.slice(0, i).join('/')) >= 0) return true;
  }
  return false;
}

// A 'move' override is keyed by the REAL taxonomy slug and rewrites where
// a grantha (or, as a side effect, every grantha under that same prefix)
// GROUPS in the tree -- the longest matching source prefix wins so moving
// a deep subfolder isn't shadowed by a move of one of its ancestors.
function dgeEffectiveDisplayPath(realSlug) {
  const moves = dgeLibOverrides.moves;
  let best = null;
  Object.keys(moves).forEach(src => {
    if (realSlug === src || realSlug.indexOf(src + '/') === 0) {
      if (!best || src.length > best.length) best = src;
    }
  });
  if (!best) return realSlug;
  const dest = moves[best];
  const rel = realSlug.slice(best.length).replace(/^\//, '');
  return dest ? (rel ? dest + '/' + rel : dest) : rel;
}

function dgePinRank(path) {
  const i = dgeLibOverrides.pinned.indexOf(path);
  return i < 0 ? Infinity : i;
}
function dgeOrderRank(parentPath, name) {
  const explicit = dgeLibOverrides.order[parentPath];
  if (!explicit) return Infinity;
  const i = explicit.indexOf(name);
  return i < 0 ? Infinity : i;
}
// Pin/order apply WITHIN each of the two existing sibling groups (folders,
// then leaves) rather than fully interleaving them — a deliberately
// smaller scope than the admin tool's own single merged sibling list, to
// avoid restructuring how folders vs. leaves render. A curator can still
// pin/reorder subfolders among themselves, or a grantha among its
// leaf-siblings, just not mix the two groups' order together.
function dgeSortChildKeys(parentPath, keys) {
  return keys.slice().sort((a, b) => {
    const pa = dgePinRank(parentPath ? parentPath + '/' + a : a);
    const pb = dgePinRank(parentPath ? parentPath + '/' + b : b);
    if (pa !== pb) return pa - pb;
    const oa = dgeOrderRank(parentPath, a), ob = dgeOrderRank(parentPath, b);
    if (oa !== ob) return oa - ob;
    return dgeCompareSlugs(a, b);
  });
}
function dgeSortLeaves(parentPath, leaves) {
  return leaves.slice().sort((a, b) => {
    const pa = dgePinRank(a.slug), pb = dgePinRank(b.slug);
    if (pa !== pb) return pa - pb;
    const na = a.slug.split('/').pop(), nb = b.slug.split('/').pop();
    const oa = dgeOrderRank(parentPath, na), ob = dgeOrderRank(parentPath, nb);
    if (oa !== ob) return oa - ob;
    return dgeCompareSlugs(a.slug, b.slug);
  });
}

// Converts a Devanagari label into the user's currently selected script,
// reusing the same engine the reading view uses so the whole app stays
// consistent. Non-Devanagari input (an auto-generated ASCII folder name)
// is returned untouched.
function dgeToActiveScript(devaText) {
  const script = window.activeScript || localStorage.getItem('app_script') || 'devanagari';
  if (script === 'devanagari') return devaText;
  if (!/[\u0900-\u097F]/.test(devaText)) return devaText;
  if (typeof window.applyTransliteration === 'function') {
    try { return window.applyTransliteration(devaText, script); } catch (e) { return devaText; }
  }
  return devaText;
}

function dgeAutoLabel(seg) {
  const m = seg.match(/^([a-z]+)_(\d+)$/i);
  if (m && DGE_NUMBERED_PREFIXES[m[1].toLowerCase()]) {
    return DGE_NUMBERED_PREFIXES[m[1].toLowerCase()] + ' ' + dgeDevaNum(parseInt(m[2], 10));
  }
  // No Sanskrit name known — plain ASCII, left as-is by dgeToActiveScript.
  return seg.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function dgeSegLabel(seg) {
  return dgeToActiveScript(DGE_PATH_LABELS[seg] || dgeAutoLabel(seg));
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
function dgeRenderNode(node, labelPrefix, depth, nodePath) {
  const childKeys = dgeSortChildKeys(nodePath, Object.keys(node.children));
  if (childKeys.length === 1 && node.leaves.length === 0) {
    const only = node.children[childKeys[0]];
    const label = (labelPrefix ? labelPrefix + ' › ' : '') + dgeSegLabel(childKeys[0]);
    const onlyPath = nodePath ? nodePath + '/' + childKeys[0] : childKeys[0];
    return dgeRenderNode(only, label, depth, onlyPath);
  }

  const id = 'dgeTree' + (dgeTreeNodeSeq++);
  const inner =
    childKeys.map(k => dgeRenderNode(node.children[k], dgeSegLabel(k), depth + 1, nodePath ? nodePath + '/' + k : k)).join('') +
    dgeSortLeaves(nodePath, node.leaves).map(leaf =>
      `<div class="pop-item" style="margin-left:${depth * 10}px;"
            onclick="window.dgeGoToGrantha('${leaf.realSlug}')">${leaf.title}</div>`
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

  // Admin-curated overrides — see admin/library.html. Optional; most
  // repos won't have one until the project lead actually curates something.
  await dgeLoadLibraryOverrides();

  const populated = library.granthas.filter(g => g.populated).map(g => {
    const realSlug = window.dgeGranthaSlug(g.path);
    const slug = dgeEffectiveDisplayPath(realSlug); // where it GROUPS in the tree
    const custom = dgeLibOverrides.labels[slug];
    const rawTitle = custom !== undefined ? custom : (g.title || realSlug);
    return { slug, realSlug, title: dgeToActiveScript(dgeLocalizeNumerals(rawTitle)) };
  }).filter(e => !dgeIsHiddenPath(e.slug));
  if (!populated.length) {
    listEl.innerHTML = `<div class="note-preview-box" style="margin:0;">No texts are available yet — check back soon.</div>`;
    return;
  }

  dgeTreeNodeSeq = 0;
  const tree = dgeBuildTree(populated);
  const topKeys = dgeSortChildKeys('', Object.keys(tree.children));
  listEl.innerHTML =
    `<div style="font-size:11px; color:var(--muted-text); margin-bottom:8px;">${populated.length} text(s) available</div>` +
    topKeys.map(k => dgeRenderNode(tree.children[k], dgeSegLabel(k), 0, k)).join('') +
    dgeSortLeaves('', tree.leaves).map(leaf =>
      `<div class="pop-item" onclick="window.dgeGoToGrantha('${leaf.realSlug}')">${leaf.title}</div>`
    ).join('');
};

// Quick Search entry point — parses e.g. "rv1.1.3" (see
// dgeParseQuickSearchQuery in config.js) and navigates straight to that
// verse, reusing dgeGoToGrantha's own path-encoding rule. The actual
// verse selection happens after the new page loads and normalizes its
// data (see the jumpVedicId/jumpShloka handling in core.js) — a full
// navigation is unavoidable here since the target grantha's data isn't
// loaded yet at the point this runs.
window.dgeQuickJump = function(text) {
  const target = (typeof window.dgeParseQuickSearchQuery === 'function') ? window.dgeParseQuickSearchQuery(text) : null;
  if (!target) {
    if (typeof showToast === 'function') showToast('Not recognized — try e.g. "rv1.1.3" or "pns5".');
    return false;
  }
  const readableSlug = /^[a-z0-9_/]+$/i.test(target.granthaPath) ? target.granthaPath : encodeURIComponent(target.granthaPath);
  let url = window.location.pathname + '?path=' + readableSlug;
  if (target.vedicId) url += '&jumpVedicId=' + encodeURIComponent(target.vedicId);
  else if (target.shlokaNumber) url += '&jumpShloka=' + target.shlokaNumber;
  window.location.href = url;
  return true;
};

// A handful of taxonomy leaves are not shloka-shaped at all (a root/word
// list, not verses) and have their own dedicated browser/search page
// instead of being readable through the general reader. Opening one of
// these via the normal ?path= route fed dge/index.html data it has no
// renderer for — the library entry existed and looked clickable, but
// nothing ever appeared ("Dhatu Patha... is not loading"). Keyed by the
// realSlug PREFIX so a future sibling under the same folder is covered
// without a new entry.
const DGE_SPECIAL_PAGES = [
  { prefix: 'vedanga/vyakarana/dhatupatha', page: 'dhatu.html' },
  { prefix: 'vedanga/vyakarana/shabdapatha', page: 'shabda.html' }
];
function dgeSpecialPageFor(realSlug) {
  const hit = DGE_SPECIAL_PAGES.find(function (e) {
    return realSlug === e.prefix || realSlug.indexOf(e.prefix + '/') === 0;
  });
  return hit ? hit.page : null;
}

window.dgeGoToGrantha = function(slug) {
  const special = dgeSpecialPageFor(slug);
  if (special) { window.location.href = special; return; }
  // Grantha slugs are always plain lowercase letters, digits, underscores,
  // and slashes by design (see taxonomy.json) — none of that needs
  // percent-encoding, and encodeURIComponent turning every "/" into
  // "%2F" just makes the address bar hard to read for no real benefit.
  // Falls back to full encoding only if something outside that safe set
  // ever shows up, so this can't silently produce a broken URL.
  const readableSlug = /^[a-z0-9_/]+$/i.test(slug) ? slug : encodeURIComponent(slug);
  window.location.href = window.location.pathname + '?path=' + readableSlug;
};
