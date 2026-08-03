// DGE Module: modals.js
// Maps to F-012: ModalsUI

// Register Module Version
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['modals.js'] = 'v1.2 (About/Welcome modal + typo report)';

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open'); 
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open'); 
  }
}

function togglePopup(id) { 
  // Close all other open popups first
  document.querySelectorAll('.popup').forEach(p => { 
    if (p.id !== id) p.classList.remove('show'); 
  }); 
  
  // Toggle the requested popup
  const target = document.getElementById(id);
  if (target) {
    target.classList.toggle('show'); 
  }
}

// Global click listener to close popups when tapping outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.popup-container') && !e.target.closest('.popup') && !e.target.closest('.top-actions')) {
    document.querySelectorAll('.popup').forEach(p => p.classList.remove('show'));
  }
});

window.openAboutModal = function() {
  openModal('aboutModal');
  localStorage.setItem('has_seen_welcome', 'true');
};

// First-visit welcome — shows the same About modal automatically once,
// after the app has finished loading its data (so the title/content
// behind it isn't jarring). Never shows again after that unless the
// person clears site data.
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('has_seen_welcome') !== 'true') {
    setTimeout(() => {
      if (typeof stotraData !== 'undefined' && stotraData) window.openAboutModal();
    }, 900);
  }
});

window.sendTypoReport = function() {
  const shlokaEl = document.getElementById('reportTypoShloka');
  const detailsEl = document.getElementById('reportTypoDetails');
  const shloka = shlokaEl && shlokaEl.value ? shlokaEl.value.trim() : '(not specified)';
  const details = detailsEl && detailsEl.value ? detailsEl.value.trim() : '';

  if (!details) {
    if (typeof showToast === 'function') showToast('Please describe the issue first.');
    return;
  }

  const title = (typeof stotraData !== 'undefined' && stotraData && stotraData.metadata) ? stotraData.metadata.title : document.title;
  const email = (typeof appConfig !== 'undefined' && appConfig.contactEmail) ? appConfig.contactEmail : 'sanatanavidyagurukulam@gmail.com';
  const subject = encodeURIComponent(`DGE Issue Report — ${title} — Shloka ${shloka}`);
  const body = encodeURIComponent(`Text: ${title}\nShloka: ${shloka}\nPage: ${window.location.href}\n\nIssue:\n${details}`);

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
};
