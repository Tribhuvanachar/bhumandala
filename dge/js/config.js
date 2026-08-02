// js/config.js
// Maps to F-012: Preferences & Global Configuration
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['config.js'] = 'v4.1 (Configurable extra shloka fields schema)';

const appConfig = {
  appName: "Bhagavata Digital Library",
  designedBy: "Tribhuvan Achar",
  contactEmail: "sanatanavidyagurukulam@gmail.com",
  sarvamoolaProjectText: "Support the Sarvamoola Digitisation & Educational Project",
  geminiModel: "gemini-3.6-flash",
  secretPasskey: "SHRI108",
  version: "v4.12"
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
    id: 'translate', icon: '🌐', label: 'Custom', style: 'full', action: 'ask', enabled: true,
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

// Admin-only: whether Acharya may be instructed that it's allowed to
// include a plain external hyperlink when it's confident one exists (e.g.
// a well-known text repository). NOT exposed in the end-user Feature
// Visibility panel — AI-generated URLs can be hallucinated, so this is a
// deliberate admin call, made here in config.js only.
window.AI_ALLOW_EXTERNAL_LINKS = false;

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
