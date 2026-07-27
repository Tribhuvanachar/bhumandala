export function normalize(d){if(Array.isArray(d))return d;if(d.shlokas)return Object.values(d.shlokas);if(d.verses)return d.verses;return [];}
