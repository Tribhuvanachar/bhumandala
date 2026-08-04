// js/admin-editor.js
// Maps to F-019: Admin GitHub File Manager
//
// Lets the admin (and only the admin) browse, upload, edit, rename, move,
// and delete files anywhere in this repo, directly from the live site —
// using their OWN GitHub Personal Access Token (same BYOK pattern as the
// AI provider keys), gated behind a secret URL flag. Nobody else can see
// or use this: the gate only reveals the UI, and without a real PAT
// pasted into THIS specific browser, none of the write calls succeed.
//
// SECURITY NOTE FOR THE ADMIN: use a fine-grained PAT scoped to ONLY this
// repo, with "Contents: Read and write" permission — not a classic
// all-access token — and set an expiration on it. See images/README.md
// or the in-app note in Settings for details.

window.DGE_VERSIONS = window.DGE_VERSIONS || {};
window.DGE_VERSIONS['admin-editor.js'] = 'v1.12 (Multi-select + batch delete in one commit; single delete now uses the same batch technique instead of one commit per descendant file)';

const GH_API = 'https://api.github.com';
let dgeAdminCurrentPath = '';
let dgeAdminDragSourcePath = null;
let dgeAdminSortMode = 'name'; // 'name' | 'modified' — toggled via dgeAdminToggleSort()
let dgeAdminSelectedItems = new Map(); // path -> type, cleared on every navigate (selection is per-folder)

// ---------------------------------------------------------------
// Superadmin gate
// ---------------------------------------------------------------
function dgeCheckSuperadminGate() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('superadmin');
    if (code && window.ADMIN_ACCESS_LEVELS && window.ADMIN_ACCESS_LEVELS[code]) {
      localStorage.setItem('is_superadmin', 'true');
      localStorage.setItem('admin_root_path', window.ADMIN_ACCESS_LEVELS[code].rootPath);
    }
  } catch (e) { /* ignore */ }
  return localStorage.getItem('is_superadmin') === 'true';
}
window.dgeCheckSuperadminGate = dgeCheckSuperadminGate;

// The path this device's access code is bound to — navigation can never
// go above this, regardless of what's clicked or dragged. Defaults to
// 'dge' (the narrowest, safest scope) if nothing was ever granted.
function dgeAdminGetRootPath() {
  return localStorage.getItem('admin_root_path') || 'dge';
}

function dgeAdminGetName() {
  return localStorage.getItem('admin_editor_name') || 'Admin';
}

// Appends who made a change and when to every commit message, so GitHub's
// own commit history becomes scannable at a glance (which edit, by whom,
// at what time) without clicking into each commit individually — and
// makes reverting to a specific version straightforward.
function dgeAdminBuildCommitMessage(action) {
  const name = dgeAdminGetName();
  const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  return `${action} — by ${name} at ${timestamp}`;
}

document.addEventListener('DOMContentLoaded', () => {
  if (dgeCheckSuperadminGate()) {
    const btn = document.getElementById('adminEditorBtn');
    if (btn) btn.style.display = 'flex';
  }
});

// ---------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------
function dgeGithubToken() {
  return localStorage.getItem('github_admin_pat') || '';
}

function dgeGithubHeaders() {
  const headers = { 'Accept': 'application/vnd.github+json' };
  const token = dgeGithubToken();
  if (token) headers['Authorization'] = `token ${token}`;
  return headers;
}

function dgeUtf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function dgeBase64ToUtf8(b64) {
  return decodeURIComponent(escape(atob((b64 || '').replace(/\n/g, ''))));
}

async function dgeGithubRequest(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); if (j.message) msg += ` — ${j.message}`; } catch (e) { /* ignore */ }
    if (res.status === 401 || res.status === 403) msg += ' (check your GitHub token in Settings)';
    if (msg.includes('does not match')) msg += ' — this file was likely deleted, moved, or edited elsewhere since it was opened here. Close and reopen it, then try again.';
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

function dgeGithubListDir(dirPath) {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}&_=${Date.now()}`;
  return dgeGithubRequest(url, { headers: dgeGithubHeaders(), cache: 'no-store' });
}

function dgeGithubGetFile(filePath) {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}&_=${Date.now()}`;
  return dgeGithubRequest(url, { headers: dgeGithubHeaders(), cache: 'no-store' });
}

function dgeGithubPutFile(filePath, contentBase64, message, sha) {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/contents/${filePath}`;
  const body = { message, content: contentBase64, branch };
  if (sha) body.sha = sha;
  return dgeGithubRequest(url, {
    method: 'PUT',
    headers: { ...dgeGithubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function dgeGithubDeleteFile(filePath, message, sha) {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/contents/${filePath}`;
  return dgeGithubRequest(url, {
    method: 'DELETE',
    headers: { ...dgeGithubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha, branch })
  });
}

function dgeGithubGetBranchHead() {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/branches/${branch}?_=${Date.now()}`;
  return dgeGithubRequest(url, { headers: dgeGithubHeaders(), cache: 'no-store' });
}

function dgeGithubCreateBlob(base64Content) {
  const { owner, repo } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/git/blobs`;
  return dgeGithubRequest(url, {
    method: 'POST',
    headers: { ...dgeGithubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: base64Content, encoding: 'base64' })
  });
}

function dgeGithubCreateTree(baseTreeSha, treeEntries) {
  const { owner, repo } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/git/trees`;
  return dgeGithubRequest(url, {
    method: 'POST',
    headers: { ...dgeGithubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries })
  });
}

function dgeGithubCreateCommit(message, treeSha, parentSha) {
  const { owner, repo } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/git/commits`;
  return dgeGithubRequest(url, {
    method: 'POST',
    headers: { ...dgeGithubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] })
  });
}

function dgeGithubUpdateRef(newCommitSha) {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  return dgeGithubRequest(url, {
    method: 'PATCH',
    headers: { ...dgeGithubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: newCommitSha })
  });
}

// GitHub's directory-listing endpoint doesn't include a modified date per
// file — the only way to get one is a per-file commit-history lookup
// (?per_page=1 for just the most recent). Deliberately NOT called on every
// navigation — only when "Sort: Modified" is active — since it's one extra
// API call per FILE in the current folder.
function dgeGithubGetFileLastModified(filePath) {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(filePath)}&sha=${branch}&per_page=1&_=${Date.now()}`;
  return dgeGithubRequest(url, { headers: dgeGithubHeaders(), cache: 'no-store' });
}

function dgeFormatShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

window.dgeAdminToggleSort = function() {
  dgeAdminSortMode = dgeAdminSortMode === 'name' ? 'modified' : 'name';
  const btn = document.getElementById('adminSortBtn');
  if (btn) btn.textContent = dgeAdminSortMode === 'modified' ? '🕒 Sort: Modified' : '🔤 Sort: Name';
  dgeAdminNavigate(dgeAdminCurrentPath);
};

// Full recursive tree — used for folder-level rename/move, where every
// descendant file needs to be relocated.
function dgeGithubGetRecursiveTree() {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1&_=${Date.now()}`;
  return dgeGithubRequest(url, { headers: dgeGithubHeaders(), cache: 'no-store' });
}

const DGE_TEXT_EXTENSIONS = ['.js', '.json', '.html', '.css', '.md', '.txt', '.svg', '.yml', '.yaml'];
function dgeIsTextFile(name) {
  return DGE_TEXT_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
}

// ---------------------------------------------------------------
// Modal open / PAT check
// ---------------------------------------------------------------
function dgeAdminShowWorking() {
  const el = document.getElementById('adminEditorWorking');
  if (el) el.style.display = 'block';
}
function dgeAdminHideWorking() {
  const el = document.getElementById('adminEditorWorking');
  if (el) el.style.display = 'none';
}

window.openAdminEditor = function() {
  if (!dgeCheckSuperadminGate()) return;
  const tokenInput = document.getElementById('adminGithubTokenInput');
  if (tokenInput) tokenInput.value = dgeGithubToken();
  const nameInput = document.getElementById('adminNameInput');
  if (nameInput) nameInput.value = dgeAdminGetName();
  if (typeof openModal === 'function') openModal('adminEditorModal');
  // Return to wherever was last being browsed, not back to the root —
  // dgeAdminCurrentPath survives a close (the modal only hides, it
  // doesn't reset any state) so this just needs to not override it.
  dgeAdminNavigate(dgeAdminCurrentPath || dgeAdminGetRootPath());
};

window.saveAdminGithubToken = function() {
  const tokenInput = document.getElementById('adminGithubTokenInput');
  if (!tokenInput) return;
  localStorage.setItem('github_admin_pat', tokenInput.value.trim());
  const nameInput = document.getElementById('adminNameInput');
  if (nameInput) localStorage.setItem('admin_editor_name', nameInput.value.trim() || 'Admin');
  if (typeof showToast === 'function') showToast('Saved to this device.');
  dgeAdminNavigate(dgeAdminCurrentPath);
};

// ---------------------------------------------------------------
// Navigation + listing render
// ---------------------------------------------------------------
async function dgeAdminNavigate(path) {
  dgeAdminHideWorking();
  const root = dgeAdminGetRootPath();
  // Hard clamp: never allow the current folder to end up above the
  // granted root, regardless of how this was called.
  if (root && path !== root && !path.startsWith(root + '/')) {
    path = root;
  }
  dgeAdminCurrentPath = path;
  dgeAdminSelectedItems.clear();

  const upBtn = document.getElementById('adminUpBtn');
  if (upBtn) {
    const atBoundary = (path === root);
    upBtn.disabled = atBoundary;
    upBtn.style.opacity = atBoundary ? '0.4' : '1';
    upBtn.style.cursor = atBoundary ? 'default' : 'pointer';
  }

  const listEl = document.getElementById('adminEditorList');
  const crumbEl = document.getElementById('adminEditorBreadcrumb');
  if (!listEl) return;

  listEl.innerHTML = `<div style="padding:20px; text-align:center; color:var(--muted-text); font-size:12px;">Loading…</div>`;

  if (crumbEl) {
    // Only render breadcrumb segments from the granted root onward — a
    // scoped admin never sees (or can drop onto) anything above it.
    const rootParts = root.split('/').filter(Boolean);
    const allParts = path.split('/').filter(Boolean);
    const visibleParts = allParts.slice(rootParts.length);
    let acc = root;
    let crumbHtml = `<span class="admin-crumb" data-path="${root}" onclick="window.dgeAdminNavigateClick('${root}')" ondragover="event.preventDefault(); this.classList.add('drag-over');" ondragleave="this.classList.remove('drag-over');" ondrop="window.dgeAdminHandleDrop(event, '${root}')">${root || '/'}</span>`;
    visibleParts.forEach(p => {
      acc += '/' + p;
      const dest = acc;
      crumbHtml += ` / <span class="admin-crumb" data-path="${dest}" onclick="window.dgeAdminNavigateClick('${dest}')" ondragover="event.preventDefault(); this.classList.add('drag-over');" ondragleave="this.classList.remove('drag-over');" ondrop="window.dgeAdminHandleDrop(event, '${dest}')">${p}</span>`;
    });
    crumbEl.innerHTML = crumbHtml;
  }

  if (!dgeGithubToken()) {
    listEl.innerHTML = `<div class="note-preview-box" style="margin:0;">Paste your GitHub token above and tap Save to browse and edit files.</div>`;
    return;
  }

  try {
    const items = await dgeGithubListDir(path);
    let sorted = [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    let modifiedByPath = {};
    if (dgeAdminSortMode === 'modified') {
      const fileItems = sorted.filter(i => i.type === 'file');
      if (fileItems.length) {
        listEl.innerHTML = `<div style="padding:20px; text-align:center; color:var(--muted-text); font-size:12px;">Loading modified dates for ${fileItems.length} file(s)…</div>`;
        const results = await Promise.all(fileItems.map(async item => {
          try {
            const commits = await dgeGithubGetFileLastModified(item.path);
            const c = commits && commits[0];
            const date = c && c.commit && c.commit.author && c.commit.author.date;
            return { path: item.path, date: date || null };
          } catch (e) {
            return { path: item.path, date: null };
          }
        }));
        results.forEach(r => { modifiedByPath[r.path] = r.date; });

        // Folders still sort by name first (a folder's "modified" date
        // would mean aggregating every descendant file — expensive and
        // not worth it here); files within this folder sort newest first.
        const dirs = sorted.filter(i => i.type === 'dir');
        const files = fileItems.slice().sort((a, b) => {
          const da = modifiedByPath[a.path], db = modifiedByPath[b.path];
          if (!da && !db) return a.name.localeCompare(b.name);
          if (!da) return 1;
          if (!db) return -1;
          return new Date(db) - new Date(da);
        });
        sorted = [...dirs, ...files];
      }
    }

    listEl.innerHTML = sorted.map(item => {
      const icon = item.type === 'dir' ? '📁' : (dgeIsTextFile(item.name) ? '📝' : '🖼️');
      const modifiedLabel = (dgeAdminSortMode === 'modified' && item.type === 'file' && modifiedByPath[item.path])
        ? `<span class="admin-file-size">${dgeFormatShortDate(modifiedByPath[item.path])}</span>`
        : (item.type === 'file' ? `<span class="admin-file-size">${dgeFormatBytes(item.size)}</span>` : '');
      const rowAction = item.type === 'dir'
        ? `onclick="window.dgeAdminNavigateClick('${item.path}')"`
        : `onclick="window.dgeAdminOpenFile('${item.path}', '${item.name}')"`;
      const isOpenFile = item.type === 'file' && item.path === dgeAdminOpenFilePath;

      const checked = dgeAdminSelectedItems.has(item.path) ? 'checked' : '';

      return `
        <div class="admin-file-row${isOpenFile ? ' admin-file-row-open' : ''}" draggable="true"
             data-path="${item.path}" data-type="${item.type}"
             ondragstart="window.dgeAdminDragStart(event, '${item.path}')"
             ${item.type === 'dir' ? `ondragover="event.preventDefault(); this.classList.add('drag-over');" ondragleave="this.classList.remove('drag-over');" ondrop="window.dgeAdminHandleDrop(event, '${item.path}')"` : ''}>
          <input type="checkbox" class="admin-select-checkbox" ${checked} onclick="event.stopPropagation(); window.dgeAdminToggleSelect('${item.path}', '${item.type}', this.checked)">
          <div class="admin-file-main" ${rowAction}>
            <span>${icon}</span>
            <span class="admin-file-name">${item.name}</span>
            ${modifiedLabel}
          </div>
          <div class="admin-file-actions">
            ${item.type === 'dir' ? `<button class="btn-icon" title="Download this folder as a .zip" onclick="event.stopPropagation(); window.dgeAdminDownloadFolderZip('${item.path}')">📦</button>` : `<button class="btn-icon" title="Download this file" onclick="event.stopPropagation(); window.dgeAdminDownloadFile('${item.path}')">⬇️</button>`}
            <button class="btn-icon" title="Rename" onclick="event.stopPropagation(); window.dgeAdminRename('${item.path}', '${item.type}')">✏️</button>
            <button class="btn-icon" title="Delete" onclick="event.stopPropagation(); window.dgeAdminDelete('${item.path}', '${item.type}', '${item.sha || ''}')">🗑️</button>
          </div>
        </div>`;
    }).join('') || `<div class="note-preview-box" style="margin:0;">Empty folder.</div>`;

    dgeAdminUpdateSelectionBar();
  } catch (e) {
    // A 404 here usually means this folder just stopped existing — most
    // often because its last remaining file was deleted, and Git doesn't
    // track empty folders. Rather than dead-ending on an error, step up
    // to the parent folder automatically (unless we're already at the
    // granted root, which can't disappear).
    if (String(e.message).includes('404') && path !== root) {
      const parts = path.split('/').filter(Boolean);
      parts.pop();
      const parentPath = parts.join('/');
      if (typeof showToast === 'function') showToast('That folder no longer exists (its last file was likely just removed) — moved up a level.');
      dgeAdminNavigate(parentPath || root);
      return;
    }
    listEl.innerHTML = `<div class="note-preview-box" style="margin:0; color:var(--accent-red);">Couldn't load this folder: ${e.message}</div>`;
  }
}
window.dgeAdminNavigate = dgeAdminNavigate;

window.dgeAdminNavigateClick = function(path) {
  dgeAdminNavigate(path);
};

function dgeFormatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

window.dgeAdminGoUp = function() {
  const root = dgeAdminGetRootPath();
  if (dgeAdminCurrentPath === root) return; // already at the boundary — Up does nothing, by design
  const parts = dgeAdminCurrentPath.split('/').filter(Boolean);
  parts.pop();
  const candidate = parts.join('/');
  // Never allow landing above the granted root, even via odd path math
  if (root && !(candidate === root || candidate.startsWith(root + '/'))) {
    dgeAdminNavigate(root);
    return;
  }
  dgeAdminNavigate(candidate);
};

// ---------------------------------------------------------------
// Open / edit / save a text file
// ---------------------------------------------------------------
let dgeAdminOpenFileSha = null;
let dgeAdminOpenFilePath = null;

window.dgeAdminOpenFile = async function(path, name) {
  if (!dgeIsTextFile(name)) {
    if (typeof showToast === 'function') showToast('This file type can only be uploaded/replaced, not edited inline here.');
    return;
  }
  const editorBox = document.getElementById('adminEditorFileBox');
  const nameEl = document.getElementById('adminEditorFileName');
  const textarea = document.getElementById('adminEditorTextarea');
  if (!editorBox || !textarea) return;

  editorBox.style.display = 'block';
  editorBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (nameEl) nameEl.innerText = 'Loading ' + path + '…';
  textarea.value = '';

  try {
    const file = await dgeGithubGetFile(path);
    dgeAdminOpenFileSha = file.sha;
    dgeAdminOpenFilePath = path;
    textarea.value = dgeBase64ToUtf8(file.content);
    if (nameEl) nameEl.innerText = path;
    document.querySelectorAll('#adminEditorList .admin-file-row').forEach(row => {
      row.classList.toggle('admin-file-row-open', row.dataset.path === path);
    });
  } catch (e) {
    if (nameEl) nameEl.innerText = 'Failed to load: ' + e.message;
  }
};

window.dgeAdminCloseFileEditor = function() {
  const editorBox = document.getElementById('adminEditorFileBox');
  if (editorBox) editorBox.style.display = 'none';
  dgeAdminOpenFileSha = null;
  dgeAdminOpenFilePath = null;
  document.querySelectorAll('#adminEditorList .admin-file-row-open').forEach(row => row.classList.remove('admin-file-row-open'));
};

window.dgeAdminSelectAllText = function() {
  const ta = document.getElementById('adminEditorTextarea');
  if (ta) { ta.focus(); ta.select(); }
};

window.dgeAdminClearAllText = function() {
  const ta = document.getElementById('adminEditorTextarea');
  if (!ta) return;
  if (!confirm('Clear all text in the editor? This only clears the box here — nothing is saved to GitHub until you tap Save.')) return;
  ta.value = '';
  ta.focus();
};

window.dgeAdminSaveFile = async function() {
  if (!dgeAdminOpenFilePath) return;
  const textarea = document.getElementById('adminEditorTextarea');
  if (!textarea) return;
  const rawMsg = prompt('Commit message:', `Update ${dgeAdminOpenFilePath}`);
  if (rawMsg === null) return;
  const msg = dgeAdminBuildCommitMessage(rawMsg);
  if (msg === null) return;

  try {
    dgeAdminShowWorking();
    await dgeGithubPutFile(dgeAdminOpenFilePath, dgeUtf8ToBase64(textarea.value), msg, dgeAdminOpenFileSha);
    if (typeof showToast === 'function') showToast('Saved to GitHub.');
    window.dgeAdminCloseFileEditor();
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    dgeAdminHideWorking();
    if (typeof showToast === 'function') showToast('Save failed: ' + e.message);
  }
};

// ---------------------------------------------------------------
// Upload (single or multiple) — via file picker or OS drag-drop onto
// the file list background
// ---------------------------------------------------------------
window.dgeAdminUploadFiles = async function(fileList) {
  if (!fileList || !fileList.length) return;
  if (typeof showToast === 'function') showToast(`Preparing ${fileList.length} file(s)…`);
  dgeAdminShowWorking();

  try {
    const fileEntries = [];
    for (const file of fileList) {
      const bytes = await dgeReadFileAsUint8Array(file);
      const targetPath = (dgeAdminCurrentPath ? dgeAdminCurrentPath + '/' : '') + file.name;
      fileEntries.push({ path: targetPath, bytes });
    }
    const label = fileEntries.length === 1 ? `Upload ${fileEntries[0].path.split('/').pop()}` : `Upload ${fileEntries.length} file(s)`;
    const result = await dgeAdminBatchCommit(fileEntries, dgeAdminBuildCommitMessage(label));
    if (result.uploaded === 0) {
      if (typeof showToast === 'function') showToast(`Nothing to commit — already matched GitHub.`);
    } else {
      if (typeof showToast === 'function') showToast(`Committed ${result.uploaded} changed file(s) in one commit${result.unchanged ? ` (${result.unchanged} unchanged, skipped)` : ''}.`);
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Upload failed: ' + e.message);
  } finally {
    dgeAdminHideWorking();
  }
  dgeAdminNavigate(dgeAdminCurrentPath);
};

// Uploads an entire local folder, preserving its internal structure.
// file.webkitRelativePath looks like "myFolder/sub/file.js" — everything
// after the first segment (the folder name itself, which the browser
// always includes) gets appended under the current admin folder, so the
// SUBFOLDER structure is preserved without recreating the top-level
// folder name redundantly.
window.dgeAdminUploadFolder = async function(fileList) {
  if (!fileList || !fileList.length) return;
  const topFolderName = (fileList[0].webkitRelativePath || '').split('/')[0] || 'this folder';
  if (typeof showToast === 'function') showToast(`Preparing "${topFolderName}" (${fileList.length} file(s))…`);
  dgeAdminShowWorking();

  try {
    const currentFolderName = (dgeAdminCurrentPath || '').split('/').filter(Boolean).pop() || '';
    const fileEntries = [];
    for (const file of fileList) {
      // webkitRelativePath includes the selected folder's own name as its
      // first segment (e.g. "myfolder/sub/file.js") — normally kept as-is
      // so the folder itself is recreated here, EXCEPT when that name
      // matches the admin folder already being stood in, which would
      // otherwise double up (see dgeStripRedundantFolderPrefix).
      const rel = file.webkitRelativePath || file.name;
      const relPath = dgeStripRedundantFolderPrefix(rel, currentFolderName);
      if (!relPath) continue;
      const bytes = await dgeReadFileAsUint8Array(file);
      const targetPath = (dgeAdminCurrentPath ? dgeAdminCurrentPath + '/' : '') + relPath;
      fileEntries.push({ path: targetPath, bytes });
    }
    const result = await dgeAdminBatchCommit(
      fileEntries,
      dgeAdminBuildCommitMessage(`Upload (folder) ${topFolderName} — ${fileEntries.length} file(s)`)
    );
    if (result.uploaded === 0) {
      if (typeof showToast === 'function') showToast(`Nothing to commit — all ${result.unchanged} file(s) already matched GitHub.`);
    } else {
      if (typeof showToast === 'function') showToast(`Committed ${result.uploaded} changed file(s) in one commit (${result.unchanged} unchanged, skipped).`);
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Folder upload failed: ' + e.message);
  } finally {
    dgeAdminHideWorking();
  }
  dgeAdminNavigate(dgeAdminCurrentPath);
};

// Extracts a .zip file entirely client-side (JSZip — already loaded for
// the folder-download feature) and pushes only the files that actually
// changed to GitHub, all as ONE commit — see dgeAdminBatchCommit above.
// Two things this handles that a naive extract-and-upload wouldn't:
//  - Redundant leading folder segment (see dgeStripRedundantFolderPrefix)
//    — matters a lot here since the admin's access is root-locked to
//    "dge" and every delivery zip is itself wrapped in "dge/".
//  - Directories in the zip that end up with no files under them (after
//    stripping) get a ".gitkeep" placeholder — Git has no concept of an
//    empty directory at all, so without this an empty folder in the zip
//    simply wouldn't appear on GitHub.
window.dgeAdminUploadZip = async function(file) {
  if (!file) return;
  if (typeof JSZip === 'undefined') {
    if (typeof showToast === 'function') showToast('Zip library not loaded — check your connection and try again.');
    return;
  }

  if (typeof showToast === 'function') showToast(`Extracting "${file.name}"…`);
  dgeAdminShowWorking();

  try {
    const zip = await JSZip.loadAsync(file);
    const allEntries = Object.values(zip.files);
    const fileZipEntries = allEntries.filter(f => !f.dir);
    const dirZipEntries = allEntries.filter(f => f.dir);
    if (!fileZipEntries.length && !dirZipEntries.length) throw new Error('This zip appears to be empty.');

    const currentFolderName = (dgeAdminCurrentPath || '').split('/').filter(Boolean).pop() || '';

    const fileEntries = [];
    for (const entry of fileZipEntries) {
      const relPath = dgeStripRedundantFolderPrefix(entry.name, currentFolderName);
      if (!relPath) continue;
      const bytes = await entry.async('uint8array');
      const targetPath = (dgeAdminCurrentPath ? dgeAdminCurrentPath + '/' : '') + relPath;
      fileEntries.push({ path: targetPath, bytes });
    }
    if (!fileEntries.length && !dirZipEntries.length) throw new Error('No files found inside this zip.');

    // Any directory in the zip with no file living under it needs an
    // explicit placeholder, or it silently won't exist on GitHub at all.
    const nonEmptyDirPrefixes = new Set();
    fileEntries.forEach(f => {
      const parts = f.path.split('/');
      let acc = '';
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? acc + '/' + parts[i] : parts[i];
        nonEmptyDirPrefixes.add(acc);
      }
    });
    let emptyDirCount = 0;
    for (const dirEntry of dirZipEntries) {
      const relDir = dgeStripRedundantFolderPrefix(dirEntry.name.replace(/\/$/, ''), currentFolderName);
      if (!relDir) continue;
      const targetDirPath = (dgeAdminCurrentPath ? dgeAdminCurrentPath + '/' : '') + relDir;
      if (!nonEmptyDirPrefixes.has(targetDirPath)) {
        fileEntries.push({ path: targetDirPath + '/.gitkeep', bytes: new Uint8Array(0) });
        nonEmptyDirPrefixes.add(targetDirPath);
        emptyDirCount++;
      }
    }

    const result = await dgeAdminBatchCommit(
      fileEntries,
      dgeAdminBuildCommitMessage(`Sync from zip "${file.name}" — ${fileEntries.length} file(s) in zip`)
    );

    if (result.uploaded === 0) {
      if (typeof showToast === 'function') showToast(`Nothing to commit — all ${result.unchanged} file(s) in the zip already matched GitHub.`);
    } else {
      if (typeof showToast === 'function') showToast(`Committed ${result.uploaded} changed file(s) in one commit (${result.unchanged} unchanged, skipped)${emptyDirCount ? `, including ${emptyDirCount} empty folder(s) preserved via .gitkeep` : ''}.`);
    }
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Zip upload failed: ' + e.message);
  } finally {
    dgeAdminHideWorking();
  }
};

// Uploads/writes a file whether or not something already exists at that
// path — GitHub's PUT requires the CURRENT sha to update an existing
// file; without one it's treated as "create new" and rejected with a
// 422 if the path is already taken. This checks first and supplies the
// sha automatically when needed, so Upload/Upload Folder correctly
// overwrite existing files instead of erroring on every one of them.
async function dgeAdminUpsertFile(targetPath, base64, message) {
  let sha;
  try {
    const existing = await dgeGithubGetFile(targetPath);
    sha = existing.sha;
  } catch (e) {
    // Doesn't exist yet — that's fine, sha stays undefined and this
    // becomes a create rather than an update.
  }
  await dgeGithubPutFile(targetPath, base64, message, sha);
}

// Git's blob sha is sha1("blob " + byteLength + "\0" + content) — computing
// this locally (Web Crypto, no library) lets us know whether a file has
// actually changed WITHOUT fetching or re-uploading it, just by comparing
// against the sha already sitting in the repo's tree listing.
async function dgeComputeGitBlobSha(bytes) {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const combined = new Uint8Array(header.length + bytes.length);
  combined.set(header, 0);
  combined.set(bytes, header.length);
  const digest = await crypto.subtle.digest('SHA-1', combined);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function dgeUint8ToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// A zip/folder upload's own internal paths often start with a folder name
// that MATCHES the admin folder you're currently standing in (e.g. every
// delivery zip for this project is wrapped in a top-level "dge/" folder,
// and the admin's own access is root-locked to "dge" — so uploading from
// there would otherwise land at "dge/dge/..."). Stripping one redundant
// matching leading segment fixes that automatically, regardless of which
// folder happens to be current when the upload runs. Returns '' if the
// entry WAS just the folder name itself with nothing under it.
function dgeStripRedundantFolderPrefix(relPath, currentFolderName) {
  if (!currentFolderName) return relPath;
  if (relPath === currentFolderName) return '';
  if (relPath.startsWith(currentFolderName + '/')) return relPath.slice(currentFolderName.length + 1);
  return relPath;
}

async function dgeReadFileAsUint8Array(file) {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

// ---------------------------------------------------------------
// Batch diff-commit — the core of "sync only what changed, in one
// commit" behaviour. Given a list of { path, bytes } entries:
//   1. Reads the current branch head + its recursive tree ONCE (not
//      per file).
//   2. Computes each entry's git blob sha locally and skips any file
//      that's byte-identical to what's already on GitHub — no API
//      call at all for unchanged files.
//   3. For files that are new or different, creates blobs, builds one
//      new tree on top of the existing base tree (untouched files are
//      inherited automatically via base_tree — they don't need to be
//      listed), creates ONE commit, and moves the branch ref forward.
// This is atomic: either every changed file lands together in that one
// commit, or (if something fails before the ref update) nothing on
// GitHub changes at all — unlike the old per-file loop, where a failure
// partway through left some files updated and others not.
// ---------------------------------------------------------------
async function dgeAdminBatchCommit(fileEntries, commitMessage) {
  if (!fileEntries.length) return { uploaded: 0, unchanged: 0 };

  const head = await dgeGithubGetBranchHead();
  const baseCommitSha = head.commit.sha;
  const baseTreeSha = head.commit.commit.tree.sha;

  let existingTree = [];
  try {
    const treeData = await dgeGithubGetRecursiveTree();
    existingTree = treeData.tree || [];
  } catch (e) {
    // Empty/new repo or branch — fine, everything is treated as new.
  }
  const existingShaByPath = {};
  existingTree.forEach(entry => {
    if (entry.type === 'blob') existingShaByPath[entry.path] = entry.sha;
  });

  const changed = [];
  let unchanged = 0;
  for (const f of fileEntries) {
    const localSha = await dgeComputeGitBlobSha(f.bytes);
    if (existingShaByPath[f.path] === localSha) {
      unchanged++;
    } else {
      changed.push(f);
    }
  }

  if (!changed.length) return { uploaded: 0, unchanged };

  const treeEntries = [];
  for (const f of changed) {
    const blob = await dgeGithubCreateBlob(dgeUint8ToBase64(f.bytes));
    treeEntries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await dgeGithubCreateTree(baseTreeSha, treeEntries);
  const newCommit = await dgeGithubCreateCommit(commitMessage, newTree.sha, baseCommitSha);
  await dgeGithubUpdateRef(newCommit.sha);

  return { uploaded: changed.length, unchanged };
}

// ---------------------------------------------------------------
// New folder (Git has no real empty folders — create a .gitkeep
// placeholder file inside the new path to make it exist)
// ---------------------------------------------------------------
window.dgeAdminNewFolder = async function() {
  const name = prompt('New folder name:');
  if (!name) return;
  const targetPath = (dgeAdminCurrentPath ? dgeAdminCurrentPath + '/' : '') + name.trim() + '/.gitkeep';
  try {
    dgeAdminShowWorking();
    await dgeGithubPutFile(targetPath, dgeUtf8ToBase64(''), dgeAdminBuildCommitMessage(`Create folder ${name}`));
    if (typeof showToast === 'function') showToast('Folder created.');
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    dgeAdminHideWorking();
    if (typeof showToast === 'function') showToast('Failed: ' + e.message);
  }
};

// Creates a new blank file, restricted to a curated extension list
// (ADMIN_NEW_FILE_EXTENSIONS in config.js) rather than allowing anything.
window.dgeAdminNewFile = async function() {
  const allowed = window.ADMIN_NEW_FILE_EXTENSIONS || ['.js', '.json', '.html', '.css', '.md', '.txt'];
  const name = prompt(`New file name (allowed types: ${allowed.join(', ')}):`, 'untitled.txt');
  if (!name) return;
  const trimmed = name.trim();
  const hasAllowedExt = allowed.some(ext => trimmed.toLowerCase().endsWith(ext));
  if (!hasAllowedExt) {
    if (typeof showToast === 'function') showToast(`File type not allowed. Use one of: ${allowed.join(', ')}`);
    return;
  }
  const targetPath = (dgeAdminCurrentPath ? dgeAdminCurrentPath + '/' : '') + trimmed;
  try {
    dgeAdminShowWorking();
    await dgeGithubPutFile(targetPath, dgeUtf8ToBase64(''), dgeAdminBuildCommitMessage(`Create ${trimmed}`));
    if (typeof showToast === 'function') showToast('File created.');
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    dgeAdminHideWorking();
    if (typeof showToast === 'function') showToast('Failed: ' + e.message);
  }
};

// Fetches an image from an external URL and uploads it into the current
// folder. Honest limitation: this only works when the source host sends
// permissive CORS headers — many image hosts (and most social/CMS sites)
// don't, and the fetch will fail for those. There's no way around this
// from client-side JS; it would need a server-side proxy to fetch on the
// browser's behalf, which this static site doesn't have.
window.dgeAdminAddImageFromUrl = async function() {
  const url = prompt('Image URL to fetch and upload here:');
  if (!url || !url.trim()) return;
  const trimmedUrl = url.trim();

  let filename;
  try {
    const u = new URL(trimmedUrl);
    filename = u.pathname.split('/').pop() || 'image.png';
    if (!/\.[a-z0-9]+$/i.test(filename)) filename += '.png';
  } catch (e) {
    if (typeof showToast === 'function') showToast('That doesn\'t look like a valid URL.');
    return;
  }

  if (typeof showToast === 'function') showToast('Fetching image…');
  try {
    dgeAdminShowWorking();
    const res = await fetch(trimmedUrl);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const blob = await res.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.substring(reader.result.indexOf(',') + 1));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const targetPath = (dgeAdminCurrentPath ? dgeAdminCurrentPath + '/' : '') + filename;
    await dgeAdminUpsertFile(targetPath, base64, dgeAdminBuildCommitMessage(`Add image from URL: ${trimmedUrl}`));
    if (typeof showToast === 'function') showToast('Image uploaded.');
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    dgeAdminHideWorking();
    if (typeof showToast === 'function') showToast(`Couldn't fetch that image — likely a CORS restriction from the source site (${e.message}). Try downloading it and using Upload instead.`);
  }
};

// ---------------------------------------------------------------
// Rename (file: get+put-new-path+delete-old; folder: same, repeated
// across every descendant via the recursive tree)
// ---------------------------------------------------------------
window.dgeAdminRename = async function(path, type) {
  const root = dgeAdminGetRootPath();
  const newPathRaw = prompt('Edit the full path (rename and/or move it here):', path);
  if (!newPathRaw || newPathRaw.trim() === path) return;
  const newPath = newPathRaw.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!newPath) return;
  if (root && newPath !== root && !newPath.startsWith(root + '/')) {
    if (typeof showToast === 'function') showToast("Can't move outside your allowed folder.");
    return;
  }
  const oldName = path.split('/').pop();
  const newName = newPath.split('/').pop();

  try {
    dgeAdminShowWorking();
    if (type === 'file') {
      await dgeAdminMoveOneFile(path, newPath, dgeAdminBuildCommitMessage(`Move/rename ${oldName} to ${newPath}`));
    } else {
      await dgeAdminMoveFolder(path, newPath);
    }
    if (typeof showToast === 'function') showToast('Moved/renamed.');
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    dgeAdminHideWorking();
    if (typeof showToast === 'function') showToast('Rename failed: ' + e.message);
  }
};

function dgeGithubGetBlob(sha) {
  const { owner, repo } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/git/blobs/${sha}`;
  return dgeGithubRequest(url, { headers: dgeGithubHeaders() });
}

// Fetches a file's base64 content reliably regardless of size. GitHub's
// Contents API silently omits `content` (no error — it just isn't
// there) for files above roughly 1MB, which is exactly what caused a
// renamed file to end up 0 bytes: the code trusted an empty string as
// real content. This checks for that and falls back to the Git Blobs
// API (much higher size limit) before ever writing anything.
async function dgeAdminGetFileContentSafe(path) {
  const file = await dgeGithubGetFile(path);

  // A genuinely empty file (0 bytes, e.g. a .gitkeep placeholder) legitimately
  // has empty content — that's correct, not a failure, and must not be
  // confused with "content missing because the file is too large."
  if (file.size === 0) {
    return { content: '', sha: file.sha };
  }

  let content = file.content;
  if (!content || !content.replace(/\n/g, '').trim()) {
    const blob = await dgeGithubGetBlob(file.sha);
    content = blob.content;
  }
  if (!content || !content.replace(/\n/g, '').trim()) {
    throw new Error(`Could not read content for "${path}" (it may be too large, or a transient GitHub API issue) — stopped before writing anything, to avoid creating an empty file.`);
  }
  return { content: content.replace(/\n/g, ''), sha: file.sha };
}

async function dgeAdminMoveOneFile(oldPath, newPath, message) {
  const { content, sha } = await dgeAdminGetFileContentSafe(oldPath);
  await dgeGithubPutFile(newPath, content, message);
  await dgeGithubDeleteFile(oldPath, message, sha);
}

// Downloads a folder and everything in it as a single .zip, built
// entirely client-side with JSZip. Uses the Git Blobs API (not the
// Contents API) to fetch each file's bytes, since the Contents API
// silently omits content for files above ~1MB — the same lesson learned
// from the earlier rename data-loss bug applies here.
// Downloads a single file, reusing the same safe content-fetch as
// rename/move — so large files (>1MB, where the Contents API omits
// content) download correctly via the Blobs API fallback too.
window.dgeAdminDownloadFile = async function(path) {
  try {
    dgeAdminShowWorking();
    const { content } = await dgeAdminGetFileContentSafe(path);
    const byteChars = atob(content);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('Downloaded.');
  } catch (e) {
    if (typeof showToast === 'function') showToast('Download failed: ' + e.message);
  } finally {
    dgeAdminHideWorking();
  }
};

window.dgeAdminDownloadFolderZip = async function(folderPath) {
  if (typeof JSZip === 'undefined') {
    if (typeof showToast === 'function') showToast('Zip library failed to load — check your connection and try again.');
    return;
  }
  if (typeof showToast === 'function') showToast(`Preparing zip of "${folderPath}"…`);
  dgeAdminShowWorking();

  try {
    const tree = await dgeGithubGetRecursiveTree();
    const descendants = tree.tree.filter(t => t.type === 'blob' && t.path.startsWith(folderPath + '/'));
    if (!descendants.length) {
      throw new Error('No files found in this folder according to GitHub\'s current tree.');
    }

    const zip = new JSZip();
    let done = 0;
    for (const entry of descendants) {
      const blob = await dgeGithubGetBlob(entry.sha);
      const relativePath = entry.path.slice(folderPath.length + 1);
      zip.file(relativePath, blob.content, { base64: true });
      done++;
      if (typeof showToast === 'function' && done % 5 === 0) showToast(`Zipping… ${done}/${descendants.length}`);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const folderName = folderPath.split('/').pop() || 'download';
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') showToast(`Downloaded ${folderName}.zip (${descendants.length} file(s)).`);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Zip download failed: ' + e.message);
  } finally {
    dgeAdminHideWorking();
  }
};

async function dgeAdminMoveFolder(oldFolderPath, newFolderPath) {
  const tree = await dgeGithubGetRecursiveTree();
  const descendants = tree.tree.filter(t => t.type === 'blob' && t.path.startsWith(oldFolderPath + '/'));
  if (descendants.length === 0) {
    throw new Error(`GitHub's current file tree shows no files under "${oldFolderPath}" — nothing to move. Try 🔄 Refresh first if you just changed something in this folder.`);
  }
  for (const entry of descendants) {
    const relative = entry.path.slice(oldFolderPath.length + 1);
    const newPath = newFolderPath + '/' + relative;
    await dgeAdminMoveOneFile(entry.path, newPath, dgeAdminBuildCommitMessage(`Move ${entry.path} to ${newPath}`));
  }
}

// ---------------------------------------------------------------
// Delete
// ---------------------------------------------------------------
// Deletes one or more files/folders in ONE commit — a tree entry with
// sha: null removes that path when built on top of the current base
// tree (same Git Data API technique as dgeAdminBatchCommit, in reverse).
// Folders are expanded to every descendant file first, since Git only
// ever tracks files, never folders directly — "deleting a folder" really
// means deleting everything inside it.
async function dgeAdminBatchDelete(items) {
  if (!items.length) return { deleted: 0 };

  const head = await dgeGithubGetBranchHead();
  const baseCommitSha = head.commit.sha;
  const baseTreeSha = head.commit.commit.tree.sha;

  const tree = await dgeGithubGetRecursiveTree();
  const allBlobPaths = tree.tree.filter(t => t.type === 'blob').map(t => t.path);

  const pathsToDelete = new Set();
  items.forEach(item => {
    if (item.type === 'dir') {
      allBlobPaths.forEach(p => {
        if (p === item.path || p.startsWith(item.path + '/')) pathsToDelete.add(p);
      });
    } else {
      pathsToDelete.add(item.path);
    }
  });
  if (!pathsToDelete.size) return { deleted: 0 };

  const treeEntries = Array.from(pathsToDelete).map(p => ({ path: p, mode: '100644', type: 'blob', sha: null }));
  const newTree = await dgeGithubCreateTree(baseTreeSha, treeEntries);
  const message = dgeAdminBuildCommitMessage(items.length === 1 ? `Delete ${items[0].path}` : `Delete ${items.length} item(s)`);
  const newCommit = await dgeGithubCreateCommit(message, newTree.sha, baseCommitSha);
  await dgeGithubUpdateRef(newCommit.sha);
  return { deleted: pathsToDelete.size };
}

window.dgeAdminDelete = async function(path, type) {
  let confirmMsg = type === 'dir'
    ? `Delete the folder "${path}" and everything inside it? This can't be undone from here.`
    : `Delete "${path}"? This can't be undone from here.`;

  if (type === 'file') {
    const siblingCount = document.querySelectorAll('#adminEditorList .admin-file-row').length;
    if (siblingCount <= 1) {
      confirmMsg = `This is the only item in this folder. Git doesn't track empty folders, so deleting it will remove the folder itself too. Continue?`;
    }
  }

  if (!confirm(confirmMsg)) return;

  try {
    dgeAdminShowWorking();
    await dgeAdminBatchDelete([{ path, type }]);
    if (dgeAdminOpenFilePath === path || (type === 'dir' && dgeAdminOpenFilePath && dgeAdminOpenFilePath.startsWith(path + '/'))) {
      window.dgeAdminCloseFileEditor();
    }
    if (typeof showToast === 'function') showToast('Deleted.');
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Delete failed: ' + e.message);
    dgeAdminHideWorking();
  }
};

// ---------------------------------------------------------------
// Multi-select + batch delete
// ---------------------------------------------------------------
function dgeAdminUpdateSelectionBar() {
  const bar = document.getElementById('adminSelectionBar');
  const countEl = document.getElementById('adminSelectionCount');
  if (!bar) return;
  const count = dgeAdminSelectedItems.size;
  bar.style.display = count ? 'flex' : 'none';
  if (countEl) countEl.textContent = `${count} selected`;
}

window.dgeAdminToggleSelect = function(path, type, checked) {
  if (checked) dgeAdminSelectedItems.set(path, type);
  else dgeAdminSelectedItems.delete(path);
  dgeAdminUpdateSelectionBar();
};

window.dgeAdminSelectAllInFolder = function() {
  document.querySelectorAll('#adminEditorList .admin-file-row').forEach(row => {
    const path = row.getAttribute('data-path');
    const type = row.getAttribute('data-type');
    dgeAdminSelectedItems.set(path, type);
    const cb = row.querySelector('.admin-select-checkbox');
    if (cb) cb.checked = true;
  });
  dgeAdminUpdateSelectionBar();
};

window.dgeAdminClearSelection = function() {
  dgeAdminSelectedItems.clear();
  document.querySelectorAll('#adminEditorList .admin-select-checkbox').forEach(cb => { cb.checked = false; });
  dgeAdminUpdateSelectionBar();
};

window.dgeAdminDeleteSelected = async function() {
  const items = Array.from(dgeAdminSelectedItems.entries()).map(([path, type]) => ({ path, type }));
  if (!items.length) return;
  const names = items.map(i => i.path.split('/').pop()).join(', ');
  if (!confirm(`Delete ${items.length} selected item(s) in one commit?\n${names}\nThis can't be undone from here.`)) return;

  try {
    dgeAdminShowWorking();
    const result = await dgeAdminBatchDelete(items);
    const wasOpenFileAffected = dgeAdminOpenFilePath && items.some(i =>
      i.path === dgeAdminOpenFilePath || (i.type === 'dir' && dgeAdminOpenFilePath.startsWith(i.path + '/'))
    );
    if (wasOpenFileAffected) window.dgeAdminCloseFileEditor();
    dgeAdminSelectedItems.clear();
    if (typeof showToast === 'function') showToast(`Deleted ${result.deleted} file(s) across ${items.length} selected item(s) — one commit.`);
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    dgeAdminHideWorking();
    if (typeof showToast === 'function') showToast('Batch delete failed: ' + e.message);
  }
};

// ---------------------------------------------------------------
// Drag-and-drop move: drag a file/folder row onto another folder row
// (or a breadcrumb segment) to move it there
// ---------------------------------------------------------------
window.dgeAdminDragStart = function(e, path) {
  dgeAdminDragSourcePath = path;
  e.dataTransfer.effectAllowed = 'move';
};

// Auto-scrolls the admin modal's body while dragging near its top/bottom
// edge, so folders above or below the current viewport become reachable
// as drop targets without needing to release and manually scroll first.
let dgeAdminAutoScrollTimer = null;
document.addEventListener('dragover', (e) => {
  const modal = document.getElementById('adminEditorModal');
  if (!modal || modal.style.display === 'none' || !modal.style.display) return;
  const body = modal.querySelector('.modal-body');
  if (!body) return;

  const rect = body.getBoundingClientRect();
  const EDGE = 60;
  const y = e.clientY;

  clearInterval(dgeAdminAutoScrollTimer);
  if (y - rect.top < EDGE && y >= rect.top) {
    dgeAdminAutoScrollTimer = setInterval(() => { body.scrollTop -= 12; }, 16);
  } else if (rect.bottom - y < EDGE && y <= rect.bottom) {
    dgeAdminAutoScrollTimer = setInterval(() => { body.scrollTop += 12; }, 16);
  }
});
document.addEventListener('dragend', () => clearInterval(dgeAdminAutoScrollTimer));
document.addEventListener('drop', () => clearInterval(dgeAdminAutoScrollTimer));

// The list's own background (not a specific folder row) only accepts
// real OS file drops for upload. An internal row dragged here and
// released — without landing precisely on a folder or breadcrumb
// segment — is intentionally a no-op: the file stays exactly where it
// was, no error, nothing happens.
window.dgeAdminHandleBackgroundDrop = async function(e) {
  e.preventDefault();
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

  if (e.dataTransfer.files && e.dataTransfer.files.length) {
    await window.dgeAdminUploadFiles(e.dataTransfer.files);
  }
  dgeAdminDragSourcePath = null;
};

// Drop target = a SPECIFIC folder row or breadcrumb segment — the only
// valid places to actually move a file to.
window.dgeAdminHandleDrop = async function(e, targetFolderPath) {
  e.preventDefault();
  e.stopPropagation();
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

  if (e.dataTransfer.files && e.dataTransfer.files.length) {
    const prevPath = dgeAdminCurrentPath;
    dgeAdminCurrentPath = targetFolderPath;
    await window.dgeAdminUploadFiles(e.dataTransfer.files);
    dgeAdminCurrentPath = prevPath;
    return;
  }

  if (!dgeAdminDragSourcePath || dgeAdminDragSourcePath === targetFolderPath) { dgeAdminDragSourcePath = null; return; }
  const name = dgeAdminDragSourcePath.split('/').pop();
  const newPath = targetFolderPath ? targetFolderPath + '/' + name : name;
  if (newPath === dgeAdminDragSourcePath) { dgeAdminDragSourcePath = null; return; }

  const rowEl = document.querySelector(`.admin-file-row[data-path="${dgeAdminDragSourcePath}"]`);
  const type = rowEl ? rowEl.dataset.type : 'file';

  try {
    dgeAdminShowWorking();
    if (type === 'dir') {
      await dgeAdminMoveFolder(dgeAdminDragSourcePath, newPath);
    } else {
      await dgeAdminMoveOneFile(dgeAdminDragSourcePath, newPath, dgeAdminBuildCommitMessage(`Move ${name} to ${targetFolderPath}`));
    }
    if (typeof showToast === 'function') showToast(`Moved ${name}.`);
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (err) {
    dgeAdminHideWorking();
    if (typeof showToast === 'function') showToast('Move failed: ' + err.message);
  }
  dgeAdminDragSourcePath = null;
};
