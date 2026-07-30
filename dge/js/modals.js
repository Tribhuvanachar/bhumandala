// DGE Module: modals.js
// Maps to F-012: ModalsUI

window.openModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open'); 
  }
};

window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open'); 
  }
};

window.togglePopup = function(id) { 
  // Close all other open popups first to prevent overlap
  document.querySelectorAll('.popup').forEach(p => { 
    if (p.id !== id) p.classList.remove('show'); 
  }); 
  
  // Toggle the requested popup
  const target = document.getElementById(id);
  if (target) {
    target.classList.toggle('show'); 
  }
};

// Global click listener to close popups when tapping outside of them
document.addEventListener('click', (e) => {
  if (!e.target.closest('.popup-container') && !e.target.closest('.popup') && !e.target.closest('.top-actions')) {
    document.querySelectorAll('.popup').forEach(p => p.classList.remove('show'));
  }
});
