// js/snippets.js
// Maps to F-009: Snippets Engine

function saveSnippet() {
  if (typeof activeId === 'undefined' || !activeId) return alert("Select a shloka first.");
  
  const loopA = document.getElementById('loopA');
  const loopB = document.getElementById('loopB');
  
  if (!loopA || !loopB) return;
  
  const a = parseFloat(loopA.value);
  const b = parseFloat(loopB.value);
  
  if (isNaN(a) || isNaN(b)) return alert("Set Start and End times in the A-B Loop first.");
  
  if (typeof snippets !== 'undefined') {
    if (!snippets[activeId]) snippets[activeId] = [];
    snippets[activeId].push({ start: a, end: b });
    
    if (typeof nsKey === 'function') {
      localStorage.setItem(nsKey('snippets'), JSON.stringify(snippets));
    }
  }
  
  if (typeof renderList === 'function') renderList();
}

let targetSnipId = null;

function openSnippetModal(id, e) {
  if (e) e.stopPropagation(); 
  targetSnipId = id;
  
  const shlokaNumEl = document.getElementById('snipShlokaNum');
  if (shlokaNumEl) shlokaNumEl.innerText = id;
  
  const container = document.getElementById('snippetListContainer'); 
  if (!container) return;
  
  container.innerHTML = '';

  if (typeof snippets !== 'undefined' && snippets[id] && snippets[id].length > 0) {
    snippets[id].forEach((snip, index) => {
      container.innerHTML += `
        <div class="snip-list-item" style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid var(--card-border); padding-bottom:8px;">
          <div><strong>Loop ${index + 1}:</strong> ${snip.start}s to ${snip.end}s</div>
          <div>
            <button class="btn-sm" style="color:var(--accent-red); margin-right:4px;" onclick="if(typeof playSnippet==='function') playSnippet(${id}, ${snip.start}, ${snip.end})">▶ Play</button>
            <button class="btn-sm" onclick="if(typeof deleteSnippet==='function') deleteSnippet(${id}, ${index})">🗑</button>
          </div>
        </div>`;
    });
  } else { 
    container.innerHTML = "<p style='font-size:12px; color:#8a7a63;'>No snippets saved.</p>"; 
  }
  
  if (typeof openModal === 'function') openModal('snippetModal');
}

function closeSnippetModal() { 
  if (typeof closeModal === 'function') closeModal('snippetModal'); 
}

function playSnippet(id, start, end) { 
  closeSnippetModal(); 
  if (typeof activeId !== 'undefined' && activeId !== id) { 
    if (typeof playShloka === 'function') playShloka(id); 
  } 
  
  const loopA = document.getElementById('loopA');
  const loopB = document.getElementById('loopB');
  const enableAB = document.getElementById('enableAB');
  
  if (loopA) loopA.value = start; 
  if (loopB) loopB.value = end; 
  if (enableAB) enableAB.checked = true; 
  
  if (typeof currentAudio !== 'undefined' && currentAudio) {
    currentAudio.currentTime = start; 
    currentAudio.play().catch(err => console.warn(err)); 
  }
}

function deleteSnippet(id, index) { 
  if (typeof snippets === 'undefined') return;
  
  snippets[id].splice(index, 1); 
  if (snippets[id].length === 0) delete snippets[id]; 
  
  if (typeof nsKey === 'function') {
    localStorage.setItem(nsKey('snippets'), JSON.stringify(snippets)); 
  }
  
  if (typeof renderList === 'function') renderList(); 
  openSnippetModal(id, { stopPropagation: () => {} }); 
}
