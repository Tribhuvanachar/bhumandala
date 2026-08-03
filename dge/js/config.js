// js/config.js
// Maps to F-012: Preferences & Global Configuration
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['config.js'] = 'v5.3 (3 contributor names added)';

const appConfig = {
  appName: "Bhagavata Digital Library",
  designedBy: "Tribhuvan Achar",
  contactEmail: "sanatanavidyagurukulam@gmail.com",
  sarvamoolaProjectText: "Support the Sarvamoola Digitisation & Educational Project",
  geminiModel: "gemini-3.6-flash",
  secretPasskey: "SHRI108",
  version: "v4.21"
};

// Globally configurable "Ask Acharya" query types. Edit this list to add,
// remove, rename, reorder, or temporarily disable (enabled:false) any of
// the buttons shown in the selection tooltip.
//
// `presets` are fixed-wording checkbox options (each has a stable `id` so
// per-device on/off overrides persist correctly even if labels change) —
// end users toggle these individually in ⚙️ Settings without being able
// to typo/break the wording. `customNotes` is a free-text box layered on
// top for anything not covered by the presets — editable, at the user's
// own risk, same as before.
// action: 'ask' calls window.askAcharya(event, id); 'bhashya' opens the
// Bhashya picker. style: 'row' groups buttons side-by-side; 'full' renders
// its own full-width button below a divider.
const ACHARYA_QUERY_TYPES = [
  {
    id: 'shloka', icon: '📜', label: 'Shloka', style: 'row', action: 'ask', enabled: true,
    presets: [
      { id: 'padachheda', label: 'Padachheda (word-by-word split)', default: true },
      { id: 'anvaya', label: 'Anvaya (prose word order)', default: true },
      { id: 'wordmeaning', label: 'Word Meaning', default: true },
      { id: 'bhavartha', label: "Bhavartha (overarching theme, per Sri Madhvacharya's Dvaita philosophy)", default: true },
      { id: 'chandas', label: 'Chandas / meter of this verse, if identifiable', default: true },
      { id: 'alankara', label: 'Alankara (figures of speech), if any are present', default: true },
      { id: 'citations', label: 'Citations & exact quotes for scriptural references (AI-generated — verify independently)', default: false }
    ],
    customNotes: ''
  },
  {
    id: 'grammar', icon: '⚙️', label: 'Word', style: 'row', action: 'ask', enabled: true,
    presets: [
      { id: 'wordmeaning', label: 'Word Meaning', default: true },
      { id: 'prakritipratyaya', label: 'Prakriti & Pratyaya', default: true },
      { id: 'dhatugana', label: 'Dhatu & Gana (if this is a verb form)', default: true },
      { id: 'vibhaktilinga', label: 'Vibhakti & Linga (if this is a noun form)', default: true },
      { id: 'sandhi', label: 'Sandhi split, if applicable', default: true },
      { id: 'samasa', label: 'Samasa Vigraha — Vigrahavakya & Samasta-pada if a compound', default: true }
    ],
    customNotes: ''
  },
  {
    id: 'bhashya', icon: '🔍', label: 'Bhashya', style: 'row', action: 'bhashya', enabled: true,
    // 'summary' | 'sentence' | 'word' — how deep the core breakdown goes
    depth: 'summary',
    presets: [
      { id: 'vyakarana', label: 'List grammatical (Vyakarana) aspects invoked, including relevant Ashtadhyayi sutras', default: true },
      { id: 'amarakosha_verse', label: 'Amarakosha deep-dive: the actual verse(s) for key terms, plus neighboring verses for context', default: false },
      { id: 'amarakosha_word', label: 'Word-by-word meaning for each word per Amarakosha', default: false },
      { id: 'parallels', label: 'Similar/parallel verses or expressions elsewhere (any author) — list them', default: true },
      { id: 'etymology_diff', label: 'Where commentators differ on etymology or interpretation, list the differences', default: true },
      { id: 'citations', label: 'Citations & exact quotes (AI-generated — verify independently)', default: true }
    ],
    customNotes: ''
  },
  {
    id: 'translate', icon: '✏️', label: 'Custom', style: 'full', action: 'ask', enabled: true,
    // No fixed presets — this is the open-ended slot. customNotes below IS
    // the entire instruction sent to Acharya for this button.
    presets: [],
    customNotes: 'Provide a natural translation into the selected language, plus a brief note on its philosophical significance per the Madhva Sampradaya (Dvaita philosophy).'
  }
];
window.ACHARYA_QUERY_TYPES = ACHARYA_QUERY_TYPES;

// Additional structured per-shloka fields, beyond the existing free-form
// commentaries — Padaccheda, Anvaya, etc. Purely additive and forward-
// looking: dataKey is what render.js looks for on each shloka object
// (e.g. shloka.padaccheda). If a given shloka's data doesn't have that
// field populated, that section simply doesn't render — nothing breaks
// for shlokas without this data yet. Toggle individual fields on/off in
// ⚙️ Settings → 🧩 Shloka Fields, or edit `enabled` here for the default.
const SHLOKA_EXTRA_FIELDS = [
  { id: 'padaccheda', label: 'Padaccheda', icon: '🔤', dataKey: 'padaccheda', enabled: true },
  { id: 'anvaya', label: 'Anvaya', icon: '🔗', dataKey: 'anvaya', enabled: true },
  { id: 'pratipadartha', label: 'Pratipadartha', icon: '📖', dataKey: 'pratipadartha', enabled: true },
  { id: 'tatparya', label: 'Tatparya', icon: '🎯', dataKey: 'tatparya', enabled: true },
  { id: 'vyakarana', label: 'Vyakarana', icon: '⚙️', dataKey: 'vyakarana', enabled: false },
  { id: 'vrutta', label: 'Vrutta (Meter)', icon: '🎼', dataKey: 'vrutta', enabled: true },
  { id: 'alankara', label: 'Alankara', icon: '✨', dataKey: 'alankara', enabled: false },
  { id: 'crossReferences', label: 'Cross References', icon: '🔀', dataKey: 'crossReferences', enabled: true }
];
window.SHLOKA_EXTRA_FIELDS = SHLOKA_EXTRA_FIELDS;

window.dgeGetEffectiveShlokaFields = function() {
  try {
    const override = JSON.parse(localStorage.getItem('shloka_extra_fields_override') || 'null');
    if (override && typeof override === 'object') {
      return SHLOKA_EXTRA_FIELDS.map(f => ({ ...f, enabled: override[f.id] !== undefined ? override[f.id] : f.enabled }));
    }
  } catch (e) { /* fall through to defaults */ }
  return SHLOKA_EXTRA_FIELDS;
};

// Share-as-Image templates (js/screenshot.js). Each safeZone is the
// approximate empty area (in the template's own native pixel dimensions)
// where shloka text can sit without colliding with the artwork — these
// are estimates from visual inspection, not pixel-measured, so nudge them
// if text still overlaps a border/motif on a given template.
// hasBakedBranding: true means "सनातन विद्या गुरुकुल · 3BU1" is already
// drawn into the image itself — the code must NOT draw its own footer
// text on top of these, or it'll double up.
// Share-as-Image templates (js/screenshot.js) are now discovered LIVE from
// the actual images/ folder on GitHub — nothing here is a hardcoded file
// list. Upload a new file named "template-whatever.png/.jpg" directly on
// GitHub and it appears in the picker automatically, no code change
// needed. This section only holds:
//   - where to look (repo location)
//   - explicit exclusions (files matching the pattern that should NOT
//     be offered — e.g. a reference/working file)
//   - optional fine-tuned overrides (safe zone, baked-branding flag) for
//     specific templates. Anything discovered that ISN'T listed here
//     still works, just with a generic centered safe zone by default.
const GITHUB_REPO_CONFIG = { owner: 'Tribhuvanachar', repo: 'bhumandala', branch: 'main', imagesPath: 'dge/images' };
window.GITHUB_REPO_CONFIG = GITHUB_REPO_CONFIG;

const SHARE_TEMPLATE_EXCLUDE = ['_collage-uncropped-reference'];
window.SHARE_TEMPLATE_EXCLUDE = SHARE_TEMPLATE_EXCLUDE;

const SHARE_TEMPLATE_OVERRIDES = {
  'template-01-jade-meander': { label: 'Jade Meander Border', safeZone: { x: 110, y: 180, w: 560, h: 780 } },
  'template-02-lotus-watercolor': { label: 'Lotus Watercolor', safeZone: { x: 110, y: 260, w: 560, h: 600 } },
  'template-03-temple-arch-dark': { label: 'Dark Temple Arch', safeZone: { x: 190, y: 300, w: 400, h: 640 } },
  'template-04-lotus-medallion': { label: 'Lotus Medallion', safeZone: { x: 130, y: 220, w: 520, h: 750 } },
  'template-05-parchment-diya': { label: 'Parchment + Diya', safeZone: { x: 110, y: 110, w: 800, h: 650 }, hasBakedBranding: true },
  'template-06-minimal-gold': { label: 'Minimal Gold', safeZone: { x: 110, y: 240, w: 800, h: 560 }, hasBakedBranding: true },
  'template-07-geometric-mihrab': { label: 'Geometric Mihrab', safeZone: { x: 300, y: 300, w: 430, h: 470 }, hasBakedBranding: true },
  'template-08-watercolor-river': { label: 'Watercolor River', safeZone: { x: 160, y: 160, w: 700, h: 440 }, hasBakedBranding: true },
  'template-09-stone-inscription': { label: 'Stone Inscription', safeZone: { x: 130, y: 190, w: 780, h: 580 }, hasBakedBranding: true }
};
window.SHARE_TEMPLATE_OVERRIDES = SHARE_TEMPLATE_OVERRIDES;

const PLAIN_TEMPLATE = { id: 'plain', filename: null, label: 'Plain (no template)', safeZone: { x: 90, y: 260, w: 900, h: 560 }, hasBakedBranding: false };

function dgeLabelFromFilename(id) {
  return id.replace(/^template-\d+-/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Live-discovers templates via GitHub's public (unauthenticated, CORS-
// enabled) Contents API, caching the result for an hour so repeat visits
// don't hit GitHub's rate limit or slow the page down. Falls back to
// whatever was last successfully cached — or just "Plain" — if the API
// call fails (offline, rate-limited, etc.), so this never breaks sharing.
window.dgeDiscoverShareTemplates = async function(forceRefresh) {
  const CACHE_KEY = 'share_templates_cache_v2';
  const CACHE_TTL_MS = 60 * 60 * 1000;

  if (!forceRefresh) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS && Array.isArray(cached.templates)) {
        return cached.templates;
      }
    } catch (e) { /* fall through to a live fetch */ }
  }

  const { owner, repo, branch, imagesPath } = GITHUB_REPO_CONFIG;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${imagesPath}?ref=${branch}`;
  const excludeSet = new Set(SHARE_TEMPLATE_EXCLUDE);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('GitHub API returned ' + res.status);
    const files = await res.json();

    const templates = [PLAIN_TEMPLATE];
    files
      .filter(f => f.type === 'file' && /^template.*\.(png|jpe?g)$/i.test(f.name))
      .forEach(f => {
        const id = f.name.replace(/\.(png|jpe?g)$/i, '');
        if (excludeSet.has(id)) return;
        const o = SHARE_TEMPLATE_OVERRIDES[id] || {};
        templates.push({
          id,
          filename: f.name,
          label: o.label || dgeLabelFromFilename(id),
          safeZone: o.safeZone || { x: 110, y: 220, w: 800, h: 600 },
          hasBakedBranding: !!o.hasBakedBranding
        });
      });

    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), templates }));
    return templates;
  } catch (e) {
    console.warn('Live template discovery failed, using last known list:', e);
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Array.isArray(cached.templates) && cached.templates.length) return cached.templates;
    } catch (e2) { /* ignore */ }
    return [PLAIN_TEMPLATE];
  }
};

window.dgeGetSelectedShareTemplate = async function() {
  const id = localStorage.getItem('default_share_template') || 'plain';
  const templates = await window.dgeDiscoverShareTemplates();
  return templates.find(t => t.id === id) || templates[0] || PLAIN_TEMPLATE;
};

// Admin-only: whether Acharya may be instructed that it's allowed to
// include a plain external hyperlink when it's confident one exists (e.g.
// a well-known text repository). NOT exposed in the end-user Feature
// Visibility panel — AI-generated URLs can be hallucinated, so this is a
// deliberate admin call, made here in config.js only.
window.AI_ALLOW_EXTERNAL_LINKS = false;

// Sponsor / Ongoing Expenses — admin-configured only. Edit this directly
// in config.js (via GitHub, or the admin editor once built) to update
// amounts/categories — this is NOT an end-user setting. Purely
// informational for now (no payment processing exists yet — that needs
// auth + a backend, which is a later phase); each category links to a
// pre-filled contact email.
const SPONSOR_CONFIG = {
  enabled: true,
  introText: "This project runs independently, with no ads, and relies entirely on community support to keep going. Here's exactly where funds go, month to month — and where a contribution would help most.",
  currency: '₹',
  recurringExpenses: [
    { label: 'Claude Pro subscription (development)', amount: 2000, period: 'month' },
    { label: 'Server hosting (planned)', amount: 5000, period: 'month' },
    { label: 'Domain & hosting', amount: 1000, period: 'year' },
    { label: 'Content digitisation & proofreading', amount: 20000, period: 'as needed' }
  ],
  sponsorCategories: [
    { icon: '💻', label: 'Backend / UI Development', description: 'Support ongoing feature work, bug fixes, and infrastructure for this app.' },
    { icon: '🕉️', label: "Acharya's Monthly Support", description: "Contribute toward the Acharya's monthly food and living expenses." },
    { icon: '🏫', label: 'Gurukula & Goshala', description: 'Support the Gurukula and the upcoming Goshala (cow shelter).' },
    { icon: '📚', label: "Children's Education", description: 'Support educational expenses for children at the Gurukula.' },
    { icon: '🙏', label: 'General Token of Appreciation', description: 'An open contribution, undesignated, used wherever most needed.' }
  ],
  contactForSponsorship: 'sanatanavidyagurukulam@gmail.com'
};
window.SPONSOR_CONFIG = SPONSOR_CONFIG;

// Contributors — admin-configured only, same pattern as SPONSOR_CONFIG.
// Empty by default; add entries here as real names/roles are confirmed.
const CONTRIBUTORS_CONFIG = {
  enabled: true,
  contributors: [
    { name: 'Sameer', role: '' },
    { name: 'Anirudha', role: '' },
    { name: 'Madhu', role: '' }
  ]
};
window.CONTRIBUTORS_CONFIG = CONTRIBUTORS_CONFIG;

// Multi-provider AI configuration. Each provider is only used if the person
// has saved a key for it (via the ⚙️ Settings). Model names are left
// user-editable rather than hardcoded, since exact current API model
// strings change over time and get out of date fast.
const AI_PROVIDERS = {
  gemini: { label: 'Gemini', defaultModel: appConfig.geminiModel },
  openai: { label: 'ChatGPT (OpenAI)', defaultModel: '' },
  claude: { label: 'Claude (Anthropic)', defaultModel: '' }
};
window.AI_PROVIDERS = AI_PROVIDERS;

// Globally configurable feature visibility. Controls which per-shloka
// indicators/controls and top-bar tools are shown. Can be overridden per
// device via ⚙️ → 🎛️ Feature Visibility (saved to localStorage), which
// layers on top of these shipped defaults the same way ACHARYA_QUERY_TYPES
// and AI_PROVIDERS overrides work.
const FEATURE_FLAGS = {
  showFavorite: true,
  showStatus: true,
  showDoubt: true,
  showNotes: true,
  showSnippetTools: true, // saved snippets + A-B repeat tools in 🛠 Tools
  showThemePicker: true,
  showScriptPicker: true,
  showPreloadButton: true, // "📥 Preload All Audio" button in 🛠 Tools
  showSpeedControl: true   // playback speed slider in 🛠 Tools
};
window.FEATURE_FLAGS = FEATURE_FLAGS;

// Which scripts/languages appear in the 🔠 script selector, and in what
// order. Remove an entry (or set enabled:false) to hide it from the
// picker without touching any transliteration code — it still works if
// selected via a saved preference, this only affects what's offered.
const SCRIPT_OPTIONS = [
  { id: 'devanagari', label: 'Sanskrit', enabled: true },
  { id: 'iast', label: 'English', enabled: true },
  { id: 'kannada', label: 'Kannada', enabled: true },
  { id: 'telugu', label: 'Telugu', enabled: true },
  { id: 'tamil', label: 'Tamil', enabled: true },
  { id: 'malayalam', label: 'Malayalam', enabled: true }
];
window.SCRIPT_OPTIONS = SCRIPT_OPTIONS;

window.dgeGetEffectiveScriptOptions = function() {
  try {
    const override = JSON.parse(localStorage.getItem('script_options_override') || 'null');
    if (override && typeof override === 'object') {
      return SCRIPT_OPTIONS.map(opt => ({ ...opt, enabled: override[opt.id] !== undefined ? override[opt.id] : opt.enabled }));
    }
  } catch (e) { /* fall through to defaults */ }
  return SCRIPT_OPTIONS;
};

window.dgeGetEffectiveFeatureFlags = function() {
  try {
    const override = JSON.parse(localStorage.getItem('feature_flags_override') || 'null');
    if (override && typeof override === 'object') {
      return Object.assign({}, FEATURE_FLAGS, override);
    }
  } catch (e) { /* fall through to defaults */ }
  return FEATURE_FLAGS;
};

// Note: All dynamic state variables (stotraData, activeId, marks, notes, etc.)
// and URL parameter parsing have been successfully migrated to js/state.js to 
// maintain strict separation of concerns.
