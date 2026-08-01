// js/actions.js
// Maps to F-014: Unified Shloka Actions Sheet
// One entry point (the ⋯ button on each card) for everything that used to
// be spread across a separate note button, a marker context-menu, and a
// snippet badge: favorite / practice flags, notes, and saved snippets —
// plus download & share for the full shloka and for individual snippets.

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['actions.js'] = 'v1.0';

window.currentActionsSheetId = null;

window.openActionsSheet = function(id) {
  window.currentActionsSheetId = id;
  if (typeof renderActionsSheetContent === 'function') renderActionsSheetContent(id);
  if (typeof openModal === 'function') openModal('actionsSheetModal');
};

window.renderActionsSheetContent = function(id) {
  const container = document.getElementById('actionsSheetContainer');
  if (!container || typeof stotraData === 'undefined' || !stotraData) return;

  const numEl = document.getElementById('actionsSheetShlokaNum');
  if (numEl) numEl.innerText = id;

  const isFav = typeof marks !== 'undefined' && marks[id] === 'fav';
  const isPractice = typeof marks !== 'undefined' && marks[id] === 'practice';
  const noteText = (typeof notes !== 'undefined' && notes[id]) ? notes[id] : '';
  const snippetList = (typeof snippets !== 'undefined' && snippets[id]) ? snippets[id] : [];

  let html = '';

  // --- Favorite / Practice marks ---
  html += `<div class="actions-section-label">Mark This Shloka</div>`;
  html += `<div style="display:flex; gap:8px; margin-bottom:18px;">`;
  html += `<button class="btn-sm mark-toggle-btn${isFav ? ' active-fav' : ''}" style="flex:1;" onclick="window.toggleMark(${id}, 'fav')">${isFav ? '★' : '☆'} Favorite</button>`;
  html += `<button class="btn-sm mark-toggle-btn${isPractice ? ' active-practice' : ''}" style="flex:1;" onclick="window.toggleMark(${id}, 'practice')">🚩 ${isPractice ? 'Flagged' : 'Needs Practice'}</button>`;
  html += `</div>`;

  // --- Note ---
  html += `<div class="actions-section-label">Your Note</div>`;
  if (noteText) {
    const preview = noteText.length > 140 ? noteText.slice(0, 140) + '…' : noteText;
    html += `<div class="note-preview-box">${preview.replace(/</g, '&lt;')}</div>`;
  } else {
    html += `<div class="note-preview-box empty">No note yet.</div>`;
  }
  html += `<button class="btn-sm" style="width:100%; margin-bottom:18px;" onclick="window.closeModal('actionsSheetModal'); window.openNote(${id});">${noteText ? '✏️ Edit Note' : '➕ Add Note'}</button>`;

  // --- Snippets ---
  html += `<div class="actions-section-label">Saved Snippets (${snippetList.length})</div>`;
  if (snippetList.length === 0) {
    html += `<div class="note-preview-box empty" style="margin-bottom:18px;">No snippets yet. In 🛠 Tools, turn on ✂️ Active Loop, set Start/End (or use 🎯 Auto A-B Capture), then 💾 Save Snippet.</div>`;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:18px;">`;
    snippetList.forEach((s, idx) => {
      const dur = (s.end - s.start).toFixed(1);
      html += `
        <div class="snippet-row">
          <div style="flex-grow:1; min-width:0;">
            <div style="font-weight:700; font-size:12px;">${s.start.toFixed(1)}s – ${s.end.toFixed(1)}s
              <span style="color:var(--muted-text); font-weight:600;">(${dur}s)</span>
            </div>
          </div>
          <div class="snippet-row-actions">
            <button class="btn-icon" title="Play" onclick="window.playSnippet(${id}, ${s.start}, ${s.end})">▶️</button>
            <button class="btn-icon" title="Download" onclick="window.downloadSnippetAudio(${id}, ${s.start}, ${s.end})">⬇️</button>
            <button class="btn-icon" title="Share" onclick="window.shareShlokaAudio(${id}, {start:${s.start}, end:${s.end}})">📤</button>
            <button class="btn-icon" title="Delete" style="color:var(--accent-red);" onclick="window.deleteSnippet(${id}, ${idx})">🗑️</button>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  // --- Full shloka download / share ---
  html += `<div class="actions-section-label">Share / Download Full Shloka</div>`;
  html += `<div style="display:flex; gap:8px;">`;
  html += `<button class="btn-sm" style="flex:1;" onclick="window.downloadFullShlokaAudio(${id})">⬇️ Audio</button>`;
  html += `<button class="btn-sm" style="flex:1;" onclick="window.shareShlokaAudio(${id})">📤 Share Text + Audio</button>`;
  html += `</div>`;

  container.innerHTML = html;
};
