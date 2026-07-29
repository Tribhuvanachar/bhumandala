// js/markers.js
// Maps to F-010: Markers Engine

function openMarkerMenu(e, id) {
  if (typeof targetMenuId !== 'undefined') {
      targetMenuId = id;
  }

  const menu = document.getElementById('markerMenu');
  if (!menu) return;

  menu.classList.add('show');
  
  const rect = menu.getBoundingClientRect();
  let x = e.clientX - 130;
  let y = e.clientY - 40;
  
  // Ensure the menu does not render off-screen
  x = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
  y = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
  
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
}

function setMark(type) {
  const menu = document.getElementById('markerMenu');

  if (typeof marks !== 'undefined' && typeof targetMenuId !== 'undefined') {
    if (type === 'none') {
        delete marks[targetMenuId];
    } else {
        marks[targetMenuId] = type;
    }

    if (typeof nsKey === 'function') {
      localStorage.setItem(nsKey('marks'), JSON.stringify(marks));
    }
  }

  if (menu) menu.classList.remove('show');
  if (typeof renderList === 'function') renderList();
}

// Global listener to close the marker menu when clicking outside of it
document.addEventListener('click', (e) => {
  const menu = document.getElementById('markerMenu');
  if (menu && !e.target.closest('.card-actions') && !e.target.closest('.context-menu')) {
     menu.classList.remove('show');
  }
});
