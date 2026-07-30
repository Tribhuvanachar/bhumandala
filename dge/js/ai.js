// DGE Module: ai.js
// Maps to F-014: AI Assistance
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['ai.js'] = 'v1.1 (Selection Fix)';

document.addEventListener('selectionchange', () => {
  // AI Tooltip only activates if user authorized via passkey
  if (!document.body.classList.contains('is-authorized')) return;

  const activeTag = document.activeElement ? document.activeElement.tagName : '';
  if (['INPUT', 'TEXTAREA'].includes(activeTag)) {
     if(document.getElementById('actionTooltip')) document.getElementById('actionTooltip').style.display = 'none';
     if(document.getElementById('modalAppendBtn')) document.getElementById('modalAppendBtn').style.display = 'none';
     return;
  }

  clearTimeout(window.selectionTimeout);
  window.selectionTimeout = setTimeout(() => {
    const selection = window.getSelection();
    const txt = selection.toString().trim();
    const tooltip = document.getElementById('actionTooltip');
    const modalAppendBtn = document.getElementById('modalAppendBtn');

    if (!tooltip) return;

    const acharyaResEl = document.getElementById('acharyaResult');
    const isInsideAcharyaModal = acharyaResEl && acharyaResEl.contains(selection.anchorNode);

    const anchor = selection.anchorNode;
    const shlokaCard = anchor && anchor.nodeType === 3 ? anchor.parentElement.closest('.shloka-card') : (anchor && anchor.closest ? anchor.closest('.shloka-card') : null);
    
    if (shlokaCard) window.contextShlokaId = parseInt(shlokaCard.id.split('-')[1]);
    else if (!isInsideAcharyaModal) window.contextShlokaId = null;

    if (txt.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if(rect.top === 0 && rect.left === 0) return;

      if (isInsideAcharyaModal && modalAppendBtn) {
        window.modalSelectedText = txt;
        tooltip.style.display = 'none';
        modalAppendBtn.style.display = 'block';
        modalAppendBtn.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 50)}px`;
        modalAppendBtn.style.left = `${rect.left + (rect.width / 2)}px`;
      } else {
        window.lastSelectedText = txt;
        if (modalAppendBtn) modalAppendBtn.style.display = 'none';
        tooltip.style.display = 'flex';
        
        const tw = tooltip.offsetWidth || 260;
        let left = rect.left + (rect.width / 2);
        left = Math.max(tw/2 + 8, Math.min(left, window.innerWidth - tw/2 - 8));
        let yPos = rect.bottom + 8;
        if (yPos + 100 > window.innerHeight) yPos = rect.top - 95; 
        
        tooltip.style.top = `${yPos}px`;
        tooltip.style.left = `${left}px`;
      }
    } else {
      tooltip.style.display = 'none';
      if (modalAppendBtn) modalAppendBtn.style.display = 'none';
    }
  }, 50);
});
