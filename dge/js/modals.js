// DGE Module: modals.js
// Maps to F-012: ModalsUI

// Register Module Version
window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['modals.js'] = 'v1.5 ("NEW" badges on recently-added Admin dropdown items)';

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    if (window.DGE_DEV_LOG && window.DGE_DEV_LOG.recenterPill) window.DGE_DEV_LOG.recenterPill();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open'); 
  }
}

// "NEW" badges on recently-added Admin dropdown items -- easy to forget a
// link like Audio Admin ever got added at all once it's just one more row
// among many. Each entry here shows its badge (with the blink animation
// already in css/main.css) until the user has opened this menu once WHILE
// it's visible; add a new {itemId, badgeId} pair whenever an admin-only
// feature ships, and remove it once it's no longer worth flagging.
const NEW_ADMIN_FEATURES = [
  { itemId: 'adminAudioManagerItem', badgeId: 'adminAudioManagerBadge' }
];
const NEW_FEATURES_SEEN_KEY = 'dge_admin_new_features_seen';
function markNewFeatureBadges() {
  let seen;
  try { seen = JSON.parse(localStorage.getItem(NEW_FEATURES_SEEN_KEY)) || []; } catch (e) { seen = []; }
  const seenSet = new Set(seen);
  let sawAnyNew = false;
  NEW_ADMIN_FEATURES.forEach(({ itemId, badgeId }) => {
    const item = document.getElementById(itemId);
    const badge = document.getElementById(badgeId);
    if (!item || !badge || item.style.display === 'none') return; // not unlocked for this user yet
    if (seenSet.has(itemId)) { badge.style.display = 'none'; return; }
    badge.style.display = 'inline-block';
    sawAnyNew = true;
    seenSet.add(itemId); // don't show again on a future page load, once they've had this one chance to notice it
  });
  if (sawAnyNew) {
    try { localStorage.setItem(NEW_FEATURES_SEEN_KEY, JSON.stringify(Array.from(seenSet))); } catch (e) { /* storage full — non-fatal, badge just repeats next time */ }
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
    const isOpening = !target.classList.contains('show');
    target.classList.toggle('show');
    // Keeps the floating dev-log pill from ever sitting on top of a
    // popup that was just opened — see DGE_DEV_LOG.recenterPill in utils.js.
    if (isOpening && window.DGE_DEV_LOG && window.DGE_DEV_LOG.recenterPill) {
      window.DGE_DEV_LOG.recenterPill();
    }
    if (isOpening && id === 'adminToolsPopup') markNewFeatureBadges();
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

  const sponsorsEl = document.getElementById('keySponsorsSection');
  if (sponsorsEl) {
    const sCfg = (typeof KEY_SPONSORS_CONFIG !== 'undefined') ? KEY_SPONSORS_CONFIG : null;
    const sList = (sCfg && sCfg.enabled && Array.isArray(sCfg.sponsors)) ? sCfg.sponsors : [];
    if (sList.length) {
      sponsorsEl.innerHTML = `
        <div class="actions-section-label" style="margin-top:20px;">💝 Key Sponsors</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${sList.map(s => `
            <div>
              <div style="font-size:12px; font-weight:700;">${s.name}</div>
              <div style="font-size:11px; color:var(--muted-text);">${s.contribution || ''}</div>
            </div>`).join('')}
        </div>`;
    } else {
      sponsorsEl.innerHTML = '';
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

// Shows/hides the "💝 Support This Project" button based on admin config
// (SPONSOR_CONFIG.enabled, from admin/content/reader.json) — not an
// end-user toggle. window.SPONSOR_CONFIG is set asynchronously by
// core.js's fetch of reader.json, a promise that does not resolve before
// DOMContentLoaded fires — checking it right on DOMContentLoaded always
// read `undefined` and left the button hidden regardless of the admin
// setting. Wait on the same promise core.js exposes instead. This must
// stay inside the DOMContentLoaded callback, not run at parse time:
// modals.js's own <script> tag loads before core.js's, so
// window.dgeConfigOverridesPromise does not exist yet at parse time —
// only by DOMContentLoaded, once every synchronous <script> including
// core.js has already run, is it guaranteed to be the real promise.
document.addEventListener('DOMContentLoaded', () => {
  (window.dgeConfigOverridesPromise || Promise.resolve()).then(() => {
    const btn = document.getElementById('supportProjectBtn');
    if (btn && typeof SPONSOR_CONFIG !== 'undefined' && SPONSOR_CONFIG && SPONSOR_CONFIG.enabled) {
      btn.style.display = 'block';
    }
  });
});

// menu.js's config-driven popup items only ever call a named window
// function with no arguments (item.action -> window.<action>()), so
// opening a specific modal by id from menu.json needs its own zero-arg
// wrapper rather than menu.json trying to pass openModal an argument.
window.dgeOpenOurStory = function() { window.openModal('ourStoryModal'); };

window.openSponsorModal = function() {
  const body = document.getElementById('sponsorModalBody');
  if (!body || typeof SPONSOR_CONFIG === 'undefined' || !SPONSOR_CONFIG) return;
  const cfg = SPONSOR_CONFIG;
  const cur = cfg.currency || '₹';

  // data-edit names the path inside admin/content/reader.json, so a super
  // admin can correct this paragraph on the panel itself (content-inline.js).
  let html = `<p data-edit="SPONSOR_CONFIG.introText" style="font-size:13px; line-height:1.6; margin:0 0 18px 0;">${cfg.introText || ''}</p>`;

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
  (cfg.sponsorCategories || []).filter(c => c.enabled !== false).forEach(c => {
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

// Local escape helper — config-editor.js has its own dgeEsc, but that's a
// separate file/closure and isn't reachable from here.
function dgeModalsEsc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

// "What's New" is chronological by nature (sorted here, newest first,
// regardless of how the admin ordered them while editing) — entries
// missing a date sink to the bottom but keep their relative order among
// each other, rather than being scattered arbitrarily by a naive sort.
// "Coming Soon" has no date concept at all: its stored array order IS
// the display order, reordered manually in Site Settings to reflect
// actual priority.
function dgeSortUpdatesNewestFirst(updates) {
  return updates
    .map((u, i) => ({ u, i }))
    .sort((a, b) => {
      const ad = a.u.date, bd = b.u.date;
      if (ad && bd) return bd.localeCompare(ad);
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return a.i - b.i; // both undated — keep original relative order
    })
    .map(x => x.u);
}

/* Re-read on every open, uncached. This panel is the one part of the site
   whose whole purpose is to be current: baking it into a JS constant meant an
   update could only be published by changing code, and a visitor who left the
   tab open would never see it. */
window.openWhatsNewModal = function() {
  const url = (typeof window.dgeContentUrl === 'function')
    ? window.dgeContentUrl('whats-new.json') : 'admin/content/whats-new.json';
  fetch(url + '?t=' + Date.now(), { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(function (fresh) {
      if (fresh) window.WHATS_NEW_CONFIG = fresh;   // _readme kept, see core.js
      dgeRenderWhatsNew();
    });
};

function dgeRenderWhatsNew() {
  const body = document.getElementById('whatsNewBody');
  if (!body) return;
  const cfg = window.WHATS_NEW_CONFIG || null;

  if (!cfg || cfg.enabled === false ||
      (!(cfg.updates || []).length && !(cfg.comingSoon || []).length)) {
    body.innerHTML = `<p style="font-size:13px; color:var(--muted-text);">Nothing posted here yet — check back soon.</p>`;
    if (typeof openModal === 'function') openModal('whatsNewModal');
    return;
  }

  let html = '';

  if ((cfg.updates || []).length) {
    html += `<div class="actions-section-label">✨ What's New</div>`;
    html += `<div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">`;
    dgeSortUpdatesNewestFirst(cfg.updates).forEach(u => {
      html += `
        <div style="border-left:3px solid var(--accent-red); padding-left:10px;">
          ${u.date ? `<div style="font-size:10px; font-weight:700; color:var(--muted-text); text-transform:uppercase; margin-bottom:2px;">${dgeModalsEsc(u.date)}</div>` : ''}
          <div style="font-size:13px; font-weight:800; margin-bottom:2px;">${dgeModalsEsc(u.title)}</div>
          <div style="font-size:12px; color:var(--muted-text); line-height:1.5;">${dgeModalsEsc(u.description || '')}</div>
        </div>`;
    });
    html += `</div>`;
  }

  if ((cfg.comingSoon || []).length) {
    html += `<div class="actions-section-label">🔭 Coming Soon</div>`;
    html += `<div style="display:flex; flex-direction:column; gap:12px;">`;
    cfg.comingSoon.forEach(c => {
      html += `
        <div style="border-left:3px dashed var(--card-border); padding-left:10px;">
          <div style="font-size:13px; font-weight:800; margin-bottom:2px;">${dgeModalsEsc(c.title)}</div>
          <div style="font-size:12px; color:var(--muted-text); line-height:1.5;">${dgeModalsEsc(c.description || '')}</div>
        </div>`;
    });
    html += `</div>`;
  }

  body.innerHTML = html;
  if (typeof openModal === 'function') openModal('whatsNewModal');
}

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

// Contact Us — same mailto pattern as sendTypoReport above: no backend on
// a static site to actually receive a POST, so this opens the visitor's
// own email app with everything pre-filled instead of pretending to
// submit a form that goes nowhere.
window.sendContactMessage = function() {
  const nameEl = document.getElementById('contactName');
  const emailEl = document.getElementById('contactEmail');
  const phoneEl = document.getElementById('contactPhone');
  const subjectEl = document.getElementById('contactSubject');
  const messageEl = document.getElementById('contactMessage');
  const name = nameEl && nameEl.value ? nameEl.value.trim() : '';
  const fromEmail = emailEl && emailEl.value ? emailEl.value.trim() : '';
  const phone = phoneEl && phoneEl.value ? phoneEl.value.trim() : '';
  const subjectText = subjectEl && subjectEl.value ? subjectEl.value.trim() : '';
  const message = messageEl && messageEl.value ? messageEl.value.trim() : '';

  if (!message) {
    if (typeof showToast === 'function') showToast('Please write a message first.');
    return;
  }

  const toEmail = (typeof appConfig !== 'undefined' && appConfig.contactEmail) ? appConfig.contactEmail : 'sanatanavidyagurukulam@gmail.com';
  const subject = encodeURIComponent(subjectText || `DGE Contact — ${name || 'website visitor'}`);
  const bodyLines = [
    `Name: ${name || '(not given)'}`,
    `Reply-to email: ${fromEmail || '(not given)'}`,
    `Phone: ${phone || '(not given)'}`,
    '',
    message
  ];
  const body = encodeURIComponent(bodyLines.join('\n'));
  window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;
};
