// js/notes.js
// Maps to F-008: Notes Engine

function openNoteModal() {
  if (typeof openModal === 'function') openModal('noteModal');
}

function closeNoteModal() {
  if (typeof closeModal === 'function') closeModal('noteModal');
  const box = document.getElementById('noteModalBox');
  const btn = document.getElementById('maxNoteBtn');
  if (box) box.classList.remove('fullscreen');
  if (btn) btn.innerText = '⛶ Expand';
}

function openNote(id) { 
  targetNoteId = id; 
  const shlokaNumEl = document.getElementById('noteShlokaNum');
  const noteTextEl = document.getElementById('noteText');
  if (shlokaNumEl) shlokaNumEl.innerText = id; 
  if (noteTextEl) noteTextEl.value = (typeof notes !== 'undefined' && notes[id]) ? notes[id] : ""; 
  openNoteModal();
}

function saveNote() { 
  const noteTextEl = document.getElementById('noteText');
  if (!noteTextEl) return;
  const txt = noteTextEl.value.trim(); 
  
  if (typeof notes !== 'undefined') {
    if (txt) notes[targetNoteId] = txt; 
    else delete notes[targetNoteId]; 
    
    if (typeof nsKey === 'function') {
      localStorage.setItem(nsKey('notes'), JSON.stringify(notes)); 
    }
  }
  
  closeNoteModal(); 
  if (typeof renderList === 'function') renderList(); 
  
  if (typeof showToast === 'function') showToast(`Saved notes for Shloka ${targetNoteId}!`);
}

function clearNote() {
  if (confirm("Are you sure you want to clear all notes for this Shloka?")) {
      const noteTextEl = document.getElementById('noteText');
      if (noteTextEl) noteTextEl.value = "";
  }
}

function toggleMaximizeNote() {
  const box = document.getElementById('noteModalBox');
  const btn = document.getElementById('maxNoteBtn');
  if (!box || !btn) return;
  
  box.classList.toggle('fullscreen');
  if (box.classList.contains('fullscreen')) {
      btn.innerText = '🗗 Minimize';
  } else {
      btn.innerText = '⛶ Expand';
  }
}

function appendSelectedTextToNote(e) {
  if (e) e.preventDefault();

  const modalBtn = document.getElementById('modalAppendBtn');
  if (modalBtn) modalBtn.style.display = 'none';
  
  if (window.getSelection) window.getSelection().removeAllRanges();

  // Safely resolve the active target ID across different modules
  const targetId = (typeof currentAcharyaShlokaId !== 'undefined' && currentAcharyaShlokaId) ? currentAcharyaShlokaId : 
                   ((typeof contextShlokaId !== 'undefined' && contextShlokaId) ? contextShlokaId : 
                   ((typeof activeId !== 'undefined' && activeId) ? activeId : null));

  if (!targetId) {
    if (typeof showToast === 'function') showToast("Please tap on a Shloka card first to make it active before appending notes.");
    return;
  }

  if (typeof modalSelectedText === 'undefined' || !modalSelectedText) return;

  if (typeof notes !== 'undefined') {
    const existingNote = notes[targetId] || "";
    const updatedNote = existingNote ? `${existingNote}\n\n[Acharya Excerpt]:\n${modalSelectedText}` : `[Acharya Excerpt]:\n${modalSelectedText}`;
    notes[targetId] = updatedNote;
    
    if (typeof nsKey === 'function') {
      localStorage.setItem(nsKey('notes'), JSON.stringify(notes));
    }
  }

  if (typeof renderList === 'function') renderList();
  if (typeof showToast === 'function') showToast(`Successfully appended excerpt to Shloka ${targetId} notes!`);
}
