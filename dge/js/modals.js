// DGE Module: modals.js
// Maps to F-012: ModalsUI

// Register Module Version
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['modals.js'] = 'v1.3 (Contributors section)';

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
  const contribEl = document.getElementById('contributorsSection');
  if (contribEl) {
    const cfg = (typeof CONTRIBUTORS_CONFIG !== 'undefined') ? CONTRIBUTORS_CONFIG : null;
    const list = (cfg && cfg.enabled && Array.isArray(cfg.contributors)) ? cfg.contributors : [];
    if (list.length) {
      contribEl.innerHTML = `
        <div class="actions-section-label" style="margin-top:20px;">🙏 Contributors</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${list.map(c => `
            <div style="display:flex; justify-content:space-between; font-size:12px;">
              <span style="font-weight:700;">${c.name}</span>
              <span style="color:var(--muted-text);">${c.role || ''}</span>
            </div>`).join('')}
        </div>`;
    } else {
      contribEl.innerHTML = '';
    }
  }
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

// Shows/hides the "💝 Support This Project" button based on admin
// config (SPONSOR_CONFIG.enabled in config.js) — not an end-user toggle.
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('supportProjectBtn');
  if (btn && typeof SPONSOR_CONFIG !== 'undefined' && SPONSOR_CONFIG && SPONSOR_CONFIG.enabled) {
    btn.style.display = 'block';
  }
});

window.openSponsorModal = function() {
  const body = document.getElementById('sponsorModalBody');
  if (!body || typeof SPONSOR_CONFIG === 'undefined' || !SPONSOR_CONFIG) return;
  const cfg = SPONSOR_CONFIG;
  const cur = cfg.currency || '₹';

  let html = `<p style="font-size:13px; line-height:1.6; margin:0 0 18px 0;">${cfg.introText || ''}</p>`;

  html += `<div class="actions-section-label">📊 Recurring Expenses</div>`;
  html += `<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">`;
  (cfg.recurringExpenses || []).forEach(e => {
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--card-border); border-radius:var(--radius-sm);">
        <span style="font-size:12px; font-weight:600;">${e.label}</span>
        <span style="font-size:13px; font-weight:800; color:var(--accent-red); white-space:nowrap; margin-left:10px;">${cur}${e.amount.toLocaleString('en-IN')}<span style="font-size:10px; font-weight:600; color:var(--muted-text);">/${e.period}</span></span>
      </div>`;
  });
  html += `</div>`;

  html += `<div class="actions-section-label">🙏 Ways to Sponsor</div>`;
  html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
  (cfg.sponsorCategories || []).forEach(c => {
    const subject = encodeURIComponent(`Sponsorship enquiry — ${c.label}`);
    const bodyText = encodeURIComponent(`I'd like to know more about sponsoring: ${c.label}`);
    const mailto = `mailto:${cfg.contactForSponsorship}?subject=${subject}&body=${bodyText}`;
    html += `
      <a href="${mailto}" style="display:block; padding:12px; border:1.5px solid var(--card-border); border-radius:var(--radius-sm); text-decoration:none; color:inherit;">
        <div style="font-weight:800; font-size:13px; margin-bottom:3px;">${c.icon} ${c.label}</div>
        <div style="font-size:11px; color:var(--muted-text); line-height:1.4;">${c.description}</div>
      </a>`;
  });
  html += `</div>`;

  html += `<p style="font-size:11px; color:var(--muted-text); margin-top:18px;">Tapping any option above opens an email to <strong>${cfg.contactForSponsorship}</strong> — there's no in-app payment yet, this just starts the conversation.</p>`;

  body.innerHTML = html;
  if (typeof openModal === 'function') openModal('sponsorModal');
};

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
