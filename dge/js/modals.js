// DGE Module: modals.js
// Maps to F-012: ModalsUI

// Register Module Version
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['modals.js'] = 'v1.1 (Fixed Click Listener)';

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
