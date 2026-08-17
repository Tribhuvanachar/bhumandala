/* =========================================================================
   Edit a page's words on the page itself.

   Every page whose text now lives in admin/content/<page>.json can be edited
   where it is read: unlock super-admin, turn on Edit text, tap a sentence,
   change it, publish. The same shape as the reading page's shloka editor —
   nothing reaches GitHub on a keystroke; edits stage in memory, survive a
   refresh, and go up in one commit when a human confirms.

   A page opts in with two attributes and nothing else:

     <body data-content-file="admin/content/home.json">
     ...<h1 data-edit="brand.latin">…</h1>

   data-edit is a path into that JSON — "brand.latin", "sections.0.name",
   "panels.tribhuvan.groups.2.entries.0.note". The editor reads the current
   value from the file rather than from the DOM, so what you edit is the
   source text and not a transliterated or truncated rendering of it.

   Self-contained on purpose. The landing page loads no admin JavaScript at
   all — pulling in admin-editor.js (1,700 lines) to change one sentence
   would be absurd — so the sixty lines of GitHub API it needs are here,
   using the same PAT under the same localStorage key.
   ========================================================================= */
(function () {
  'use strict';

  window.DGE_VERSIONS = window.DGE_VERSIONS || {};
  window.DGE_VERSIONS['content-inline.js'] = 'v1.0 (in-place editing of admin/content/*.json)';

  const FILE = document.body && document.body.dataset.contentFile;
  if (!FILE) return;                       // page has not opted in

  const DRAFT_KEY = 'dgeContentInlineDraft:' + FILE;
  const self = (document.currentScript && document.currentScript.src) || '';

  function contentUrl() {
    // FILE is repo-relative; the page may sit at the root or inside dge/.
    try { return new URL('../../' + FILE, self).href; }
    catch (e) { return '/' + FILE; }
  }

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let source = null;      // the file as published
  let draft = {};         // path -> new value, staged
  let editing = false;

  /* ---------------------------------------------------------- the JSON --- */
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return (o == null) ? undefined : o[k];
    }, obj);
  }

  function setPath(obj, path, value) {
    const parts = path.split('.');
    let node = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (node[k] == null) node[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      node = node[k];
    }
    node[parts[parts.length - 1]] = value;
  }

  function loadSource() {
    return fetch(contentUrl() + '?t=' + Date.now(), { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null));
  }

  /* ----------------------------------------------------------- drafts ---- */
  function persist() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
  }
  function restore() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      draft = raw ? JSON.parse(raw) : {};
    } catch (e) { draft = {}; }
  }
  function clearDraft() {
    draft = {};
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  /* --------------------------------------------------------- the token --- */
  function token() { return localStorage.getItem('github_admin_pat') || ''; }

  function repo() {
    const c = window.GITHUB_REPO_CONFIG ||
      { owner: 'Tribhuvanachar', repo: 'bhumandala', branch: 'main' };
    return c;
  }

  function b64(text) {
    // btoa() breaks on anything outside Latin-1, and this file is mostly
    // Devanagari — encode to UTF-8 bytes first.
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(function (b) { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  function api(path, options) {
    const c = repo();
    const url = 'https://api.github.com/repos/' + c.owner + '/' + c.repo +
                '/contents/' + path;
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (token()) headers.Authorization = 'token ' + token();
    return fetch(url + (options && options.method ? '' : '?ref=' + c.branch),
                 Object.assign({ headers: headers }, options || {}));
  }

  function publish() {
    if (!token()) {
      alert('No GitHub token saved on this device.\n\nOpen the library, unlock ' +
            'Super Admin, and add a personal access token under Repo Files — ' +
            'this page uses the same one.');
      return Promise.resolve(false);
    }
    // Re-read before writing: someone may have edited the file since this
    // page loaded, and blind-overwriting their change would be the worst
    // possible behaviour for a tool whose whole job is editing text.
    return loadSource().then(function (latest) {
      const out = JSON.parse(JSON.stringify(latest || source));
      Object.keys(draft).forEach(function (p) { setPath(out, p, draft[p]); });
      const text = JSON.stringify(out, null, 2) + '\n';
      return api(FILE).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (existing) {
        const c = repo();
        return api(FILE, {
          method: 'PUT',
          body: JSON.stringify({
            message: 'Edit ' + FILE + ' in place',
            content: b64(text),
            branch: c.branch,
            sha: existing && existing.sha
          })
        });
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + ' ' + t.slice(0, 200)); });
        source = out;
        clearDraft();
        return true;
      });
    });
  }

  /* ------------------------------------------------------------- edit ---- */
  function currentValue(path) {
    return Object.prototype.hasOwnProperty.call(draft, path)
      ? draft[path] : getPath(source, path);
  }

  let closeOpen = null;   // the one editor currently open, if any

  function openEditor(el) {
    if (el.querySelector('.ci-box')) return;
    // One at a time. Two open textareas is two places the same page is being
    // changed, and the second one hides whether the first was saved.
    if (closeOpen) closeOpen();
    const path = el.getAttribute('data-edit');
    const value = currentValue(path);
    if (typeof value !== 'string') {
      alert('"' + path + '" is not a piece of text — it is ' +
            (value === undefined ? 'not in the file' : 'a ' + typeof value) +
            '. Edit it in ' + FILE + ' directly.');
      return;
    }

    const prev = el.innerHTML;
    const box = document.createElement('div');
    box.className = 'ci-box';
    const ta = document.createElement('textarea');
    ta.className = 'ci-input';
    ta.value = value;
    ta.rows = Math.min(14, Math.max(2, Math.ceil(value.length / 46)));
    const row = document.createElement('div');
    row.className = 'ci-row';
    row.innerHTML = '<span class="ci-path">' + esc(path) + '</span>' +
                    '<button class="ci-btn ci-save">Save</button>' +
                    '<button class="ci-btn ci-cancel">Cancel</button>';
    box.appendChild(ta); box.appendChild(row);
    el.innerHTML = '';
    el.appendChild(box);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);

    const close = function () { el.innerHTML = prev; closeOpen = null; };
    closeOpen = close;
    row.querySelector('.ci-cancel').addEventListener('click', function (ev) {
      ev.stopPropagation(); close();
    });
    row.querySelector('.ci-save').addEventListener('click', function (ev) {
      ev.stopPropagation();
      const next = ta.value;
      if (next !== getPath(source, path)) { draft[path] = next; persist(); }
      else { delete draft[path]; persist(); }
      close();
      rerender();
      bar();
    });
    ta.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.stopPropagation(); close(); }
      // Ctrl/Cmd+Enter saves, since Enter has to insert a line in a verse.
      if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault(); row.querySelector('.ci-save').click();
      }
    });
    ta.addEventListener('click', function (ev) { ev.stopPropagation(); });
  }

  /* The page draws itself from its own config object, so staged edits are
     applied there and the page asked to redraw — the reader sees the edit in
     place, in the real layout, rather than in a preview pane. */
  function rerender() {
    const target = window.SITE_CONFIG;
    if (target) Object.keys(draft).forEach(function (p) { setPath(target, p, draft[p]); });
    if (typeof window.dgeContentRerender === 'function') window.dgeContentRerender();
    if (editing) mark();
  }

  function mark() {
    document.querySelectorAll('[data-edit]').forEach(function (el) {
      el.classList.toggle('ci-on', editing);
      el.classList.toggle('ci-dirty',
        editing && Object.prototype.hasOwnProperty.call(draft, el.getAttribute('data-edit')));
    });
  }

  /* -------------------------------------------------------------- bar ---- */
  function bar() {
    let el = document.getElementById('ciBar');
    const n = Object.keys(draft).length;
    // Always present for a super-admin: the bar carries the only control that
    // turns editing on, so hiding it when nothing is staged left no way in.
    if (!el) {
      el = document.createElement('div');
      el.id = 'ciBar';
      el.className = 'ci-bar';
      document.body.appendChild(el);
      document.body.classList.add('ci-active');
    }
    el.innerHTML =
      '<span class="ci-count">' + (n ? n + ' unpublished edit' + (n === 1 ? '' : 's') +
        ' — in this browser only' : 'Edit text: tap any highlighted line') + '</span>' +
      (n ? '<button class="ci-btn ci-publish">Publish</button>' +
           '<button class="ci-btn ci-discard">Discard</button>' : '') +
      '<button class="ci-btn ci-done">' + (editing ? 'Done' : 'Edit text') + '</button>';

    const pub = el.querySelector('.ci-publish');
    if (pub) pub.addEventListener('click', function () {
      pub.disabled = true; pub.textContent = 'Publishing…';
      publish().then(function (done) {
        if (done) {
          alert('Published. GitHub has the change now.\n\nThe live site is served ' +
                'through a CDN that can take a few minutes to catch up — if a ' +
                'refresh still shows the old text, that is the delay, not a ' +
                'failed save.');
          rerender(); bar();
        } else { pub.disabled = false; pub.textContent = 'Publish'; }
      }).catch(function (e) {
        alert('Could not publish: ' + e.message);
        pub.disabled = false; pub.textContent = 'Publish';
      });
    });
    const dis = el.querySelector('.ci-discard');
    if (dis) dis.addEventListener('click', function () {
      if (!confirm('Discard ' + n + ' unpublished edit(s)?')) return;
      clearDraft(); location.reload();
    });
    el.querySelector('.ci-done').addEventListener('click', function () {
      editing = !editing; mark(); bar();
    });
  }

  document.addEventListener('click', function (ev) {
    if (!editing) return;
    const el = ev.target.closest && ev.target.closest('[data-edit]');
    if (!el || el.querySelector('.ci-box')) return;
    ev.preventDefault(); ev.stopPropagation();
    openEditor(el);
  }, true);

  /* -------------------------------------------------------------- boot --- */
  function allowed() {
    try { return localStorage.getItem('is_superadmin') === 'true'; }
    catch (e) { return false; }
  }

  window.dgeContentInlineReady = (function () {
    if (!allowed()) return Promise.resolve(false);
    restore();
    return loadSource().then(function (doc) {
      if (!doc) return false;
      source = doc;
      // Staged edits are already in the page's config from its own boot only
      // if it read them; apply them here so the page shows the draft.
      if (Object.keys(draft).length) rerender();
      bar();
      return true;
    }).catch(function () { return false; });
  })();
})();
