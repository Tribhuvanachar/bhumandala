// js/config.js
// Maps to F-012: Preferences & Global Configuration
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['config.js'] = 'v2.0 (Configurable Acharya Fields + AI Providers)';

const appConfig = {
  appName: "Bhagavata Digital Library",
  designedBy: "Tribhuvan Achar",
  contactEmail: "sanatanavidyagurukulam@gmail.com",
  sarvamoolaProjectText: "Support the Sarvamoola Digitisation & Educational Project",
  geminiModel: "gemini-3.6-flash",
  secretPasskey: "SHRI108",
  version: "v4.6"
};

// Globally configurable "Ask Acharya" query types. Edit this list to add,
// remove, rename, reorder, or temporarily disable (enabled:false) any of
// the buttons shown in the selection tooltip. `fields` is the exact list
// of things Acharya is asked to provide for that query type — end users
// can also override these per-device from the ⚙️ Ask Acharya Settings
// section in the 🔑 modal; this array is just the shipped default.
// action: 'ask' calls window.askAcharya(event, id); 'bhashya' opens the
// Bhashya picker. style: 'row' groups buttons side-by-side; 'full' renders
// its own full-width button below a divider.
const ACHARYA_QUERY_TYPES = [
  {
    id: 'shloka', icon: '📜', label: 'Shloka', style: 'row', action: 'ask', enabled: true,
    fields: [
      'Padachheda (word-by-word split)',
      'Anvaya (prose word order)',
      'Word Meaning',
      "Bhavartha (overarching theme, strictly per Sri Madhvacharya's Dvaita philosophy)"
    ]
  },
  {
    id: 'grammar', icon: '⚙️', label: 'Word', style: 'row', action: 'ask', enabled: true,
    fields: [
      'Word Meaning',
      'Prakriti & Pratyaya',
      'Dhatu & Gana (if this is a verb form)',
      'Vibhakti & Linga (if this is a noun form)',
      'Sandhi split, if applicable',
      'Samasa Vigraha — and if it is a compound, the Vigrahavakya and Samasta-pada',
      'Chandas / meter, if identifiable'
    ]
  },
  {
    id: 'bhashya', icon: '🔍', label: 'Bhashya', style: 'row', action: 'bhashya', enabled: true,
    // 'summary' | 'sentence' | 'word' — how deep the commentary analysis goes
    depth: 'summary'
  },
  {
    id: 'translate', icon: '🌐', label: 'Native Meaning', style: 'full', action: 'ask', enabled: true,
    fields: [
      'A natural translation into the selected language',
      'A brief note on its philosophical significance per the Madhva Sampradaya (Dvaita philosophy)',
      'If commentary text is available for this shloka, a short combined summary noting where the commentaries agree or differ'
    ]
  }
];
window.ACHARYA_QUERY_TYPES = ACHARYA_QUERY_TYPES;

// Multi-provider AI configuration. Each provider is only used if the person
// has saved a key for it (via the 🔑 Key modal). Model names are left
// user-editable rather than hardcoded, since exact current API model
// strings change over time and get out of date fast.
const AI_PROVIDERS = {
  gemini: { label: 'Gemini', defaultModel: appConfig.geminiModel },
  openai: { label: 'ChatGPT (OpenAI)', defaultModel: '' },
  claude: { label: 'Claude (Anthropic)', defaultModel: '' }
};
window.AI_PROVIDERS = AI_PROVIDERS;

// Note: All dynamic state variables (stotraData, activeId, marks, notes, etc.)
// and URL parameter parsing have been successfully migrated to js/state.js to 
// maintain strict separation of concerns.
