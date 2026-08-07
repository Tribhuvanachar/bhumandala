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
window.DGE_VERSIONS['library.js'] = 'v2.1 (Library labels and grantha titles now follow the selected script — were mixed IAST/Devanagari and ignored the script selector)';

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
  vyasakuta: 'व्यासकूटः',

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
    return { slug, title: dgeToActiveScript(g.title || slug) };
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
