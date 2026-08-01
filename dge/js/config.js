// js/config.js
// Maps to F-012: Preferences & Global Configuration

const appConfig = {
  appName: "Bhagavata Digital Library",
  designedBy: "Tribhuvan Achar",
  contactEmail: "sanatanavidyagurukulam@gmail.com",
  sarvamoolaProjectText: "Support the Sarvamoola Digitisation & Educational Project",
  geminiModel: "gemini-3.6-flash",
  secretPasskey: "SHRI108",
  version: "v4.4"
};

// Globally configurable "Ask Acharya" query types. Edit this list to add,
// remove, rename, reorder, or temporarily disable (enabled:false) any of
// the buttons shown in the selection tooltip — nothing else in the code
// needs to change.
// action: 'ask' calls window.askAcharya(event, id); 'bhashya' opens the
// Bhashya picker. style: 'row' groups buttons side-by-side; 'full' renders
// its own full-width button below a divider.
const ACHARYA_QUERY_TYPES = [
  { id: 'shloka',   icon: '📜', label: 'Shloka',        style: 'row',  action: 'ask',     enabled: true },
  { id: 'grammar',  icon: '⚙️', label: 'Word',           style: 'row',  action: 'ask',     enabled: true },
  { id: 'bhashya',  icon: '🔍', label: 'Bhashya',        style: 'row',  action: 'bhashya', enabled: true },
  { id: 'translate',icon: '🌐', label: 'Native Meaning', style: 'full', action: 'ask',     enabled: true }
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
