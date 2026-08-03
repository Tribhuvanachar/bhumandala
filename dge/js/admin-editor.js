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
window.DGE_VERSIONS['admin-editor.js'] = 'v1.1 (Fixed data-loss bug in rename/move for files >1MB)';

const GH_API = 'https://api.github.com';
let dgeAdminCurrentPath = '';
let dgeAdminDragSourcePath = null;

// ---------------------------------------------------------------
// Superadmin gate
// ---------------------------------------------------------------
function dgeCheckSuperadminGate() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('superadmin') === '2') {
      localStorage.setItem('is_superadmin', 'true');
    }
  } catch (e) { /* ignore */ }
  return localStorage.getItem('is_superadmin') === 'true';
}
window.dgeCheckSuperadminGate = dgeCheckSuperadminGate;

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
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

function dgeGithubListDir(dirPath) {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`;
  return dgeGithubRequest(url, { headers: dgeGithubHeaders() });
}

function dgeGithubGetFile(filePath) {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  return dgeGithubRequest(url, { headers: dgeGithubHeaders() });
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

// Full recursive tree — used for folder-level rename/move, where every
// descendant file needs to be relocated.
function dgeGithubGetRecursiveTree() {
  const { owner, repo, branch } = GITHUB_REPO_CONFIG;
  const url = `${GH_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  return dgeGithubRequest(url, { headers: dgeGithubHeaders() });
}

const DGE_TEXT_EXTENSIONS = ['.js', '.json', '.html', '.css', '.md', '.txt', '.svg', '.yml', '.yaml'];
function dgeIsTextFile(name) {
  return DGE_TEXT_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
}

// ---------------------------------------------------------------
// Modal open / PAT check
// ---------------------------------------------------------------
window.openAdminEditor = function() {
  if (!dgeCheckSuperadminGate()) return;
  const tokenInput = document.getElementById('adminGithubTokenInput');
  if (tokenInput) tokenInput.value = dgeGithubToken();
  if (typeof openModal === 'function') openModal('adminEditorModal');
  dgeAdminNavigate('dge');
};

window.saveAdminGithubToken = function() {
  const tokenInput = document.getElementById('adminGithubTokenInput');
  if (!tokenInput) return;
  localStorage.setItem('github_admin_pat', tokenInput.value.trim());
  if (typeof showToast === 'function') showToast('Token saved to this device.');
  dgeAdminNavigate(dgeAdminCurrentPath);
};

// ---------------------------------------------------------------
// Navigation + listing render
// ---------------------------------------------------------------
async function dgeAdminNavigate(path) {
  dgeAdminCurrentPath = path;
  const listEl = document.getElementById('adminEditorList');
  const crumbEl = document.getElementById('adminEditorBreadcrumb');
  if (!listEl) return;

  listEl.innerHTML = `<div style="padding:20px; text-align:center; color:var(--muted-text); font-size:12px;">Loading…</div>`;

  if (crumbEl) {
    const parts = path.split('/').filter(Boolean);
    let acc = '';
    let crumbHtml = '';
    parts.forEach((p, i) => {
      acc += (i === 0 ? '' : '/') + p;
      const dest = acc;
      crumbHtml += `<span class="admin-crumb" data-path="${dest}" onclick="window.dgeAdminNavigateClick('${dest}')" ondragover="event.preventDefault(); this.classList.add('drag-over');" ondragleave="this.classList.remove('drag-over');" ondrop="window.dgeAdminHandleDrop(event, '${dest}')">${p}</span>`;
      if (i < parts.length - 1) crumbHtml += ' / ';
    });
    crumbEl.innerHTML = crumbHtml;
  }

  if (!dgeGithubToken()) {
    listEl.innerHTML = `<div class="note-preview-box" style="margin:0;">Paste your GitHub token above and tap Save to browse and edit files.</div>`;
    return;
  }

  try {
    const items = await dgeGithubListDir(path);
    const sorted = [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    listEl.innerHTML = sorted.map(item => {
      const icon = item.type === 'dir' ? '📁' : (dgeIsTextFile(item.name) ? '📝' : '🖼️');
      const sizeLabel = item.type === 'file' ? `<span class="admin-file-size">${dgeFormatBytes(item.size)}</span>` : '';
      const rowAction = item.type === 'dir'
        ? `onclick="window.dgeAdminNavigateClick('${item.path}')"`
        : `onclick="window.dgeAdminOpenFile('${item.path}', '${item.name}')"`;

      return `
        <div class="admin-file-row" draggable="true"
             data-path="${item.path}" data-type="${item.type}"
             ondragstart="window.dgeAdminDragStart(event, '${item.path}')"
             ${item.type === 'dir' ? `ondragover="event.preventDefault(); this.classList.add('drag-over');" ondragleave="this.classList.remove('drag-over');" ondrop="window.dgeAdminHandleDrop(event, '${item.path}')"` : ''}>
          <div class="admin-file-main" ${rowAction}>
            <span>${icon}</span>
            <span class="admin-file-name">${item.name}</span>
            ${sizeLabel}
          </div>
          <div class="admin-file-actions">
            <button class="btn-icon" title="Rename" onclick="event.stopPropagation(); window.dgeAdminRename('${item.path}', '${item.type}')">✏️</button>
            <button class="btn-icon" title="Delete" onclick="event.stopPropagation(); window.dgeAdminDelete('${item.path}', '${item.type}', '${item.sha || ''}')">🗑️</button>
          </div>
        </div>`;
    }).join('') || `<div class="note-preview-box" style="margin:0;">Empty folder.</div>`;
  } catch (e) {
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
  const parts = dgeAdminCurrentPath.split('/').filter(Boolean);
  parts.pop();
  dgeAdminNavigate(parts.join('/'));
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
  if (nameEl) nameEl.innerText = 'Loading ' + path + '…';
  textarea.value = '';

  try {
    const file = await dgeGithubGetFile(path);
    dgeAdminOpenFileSha = file.sha;
    dgeAdminOpenFilePath = path;
    textarea.value = dgeBase64ToUtf8(file.content);
    if (nameEl) nameEl.innerText = path;
  } catch (e) {
    if (nameEl) nameEl.innerText = 'Failed to load: ' + e.message;
  }
};

window.dgeAdminCloseFileEditor = function() {
  const editorBox = document.getElementById('adminEditorFileBox');
  if (editorBox) editorBox.style.display = 'none';
  dgeAdminOpenFileSha = null;
  dgeAdminOpenFilePath = null;
};

window.dgeAdminSaveFile = async function() {
  if (!dgeAdminOpenFilePath) return;
  const textarea = document.getElementById('adminEditorTextarea');
  if (!textarea) return;
  const msg = prompt('Commit message:', `Update ${dgeAdminOpenFilePath} via admin editor`);
  if (msg === null) return;

  try {
    await dgeGithubPutFile(dgeAdminOpenFilePath, dgeUtf8ToBase64(textarea.value), msg, dgeAdminOpenFileSha);
    if (typeof showToast === 'function') showToast('Saved to GitHub.');
    window.dgeAdminCloseFileEditor();
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Save failed: ' + e.message);
  }
};

// ---------------------------------------------------------------
// Upload (single or multiple) — via file picker or OS drag-drop onto
// the file list background
// ---------------------------------------------------------------
window.dgeAdminUploadFiles = async function(fileList) {
  if (!fileList || !fileList.length) return;
  if (typeof showToast === 'function') showToast(`Uploading ${fileList.length} file(s)…`);

  for (const file of fileList) {
    try {
      const base64 = await dgeReadFileAsBase64(file);
      const targetPath = (dgeAdminCurrentPath ? dgeAdminCurrentPath + '/' : '') + file.name;
      await dgeGithubPutFile(targetPath, base64, `Upload ${file.name} via admin editor`);
    } catch (e) {
      if (typeof showToast === 'function') showToast(`Failed to upload ${file.name}: ${e.message}`);
    }
  }
  if (typeof showToast === 'function') showToast('Upload complete.');
  dgeAdminNavigate(dgeAdminCurrentPath);
};

function dgeReadFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // dataURL looks like "data:*/*;base64,AAAA..." — strip the prefix
      const result = reader.result;
      const base64 = result.substring(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
    await dgeGithubPutFile(targetPath, dgeUtf8ToBase64(''), `Create folder ${name} via admin editor`);
    if (typeof showToast === 'function') showToast('Folder created.');
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Failed: ' + e.message);
  }
};

// ---------------------------------------------------------------
// Rename (file: get+put-new-path+delete-old; folder: same, repeated
// across every descendant via the recursive tree)
// ---------------------------------------------------------------
window.dgeAdminRename = async function(path, type) {
  const oldName = path.split('/').pop();
  const newName = prompt('Rename to:', oldName);
  if (!newName || newName === oldName) return;
  const parentPath = path.split('/').slice(0, -1).join('/');
  const newPath = (parentPath ? parentPath + '/' : '') + newName.trim();

  try {
    if (type === 'file') {
      await dgeAdminMoveOneFile(path, newPath, `Rename ${oldName} to ${newName}`);
    } else {
      await dgeAdminMoveFolder(path, newPath);
    }
    if (typeof showToast === 'function') showToast('Renamed.');
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
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

async function dgeAdminMoveFolder(oldFolderPath, newFolderPath) {
  const tree = await dgeGithubGetRecursiveTree();
  const descendants = tree.tree.filter(t => t.type === 'blob' && t.path.startsWith(oldFolderPath + '/'));
  for (const entry of descendants) {
    const relative = entry.path.slice(oldFolderPath.length + 1);
    const newPath = newFolderPath + '/' + relative;
    await dgeAdminMoveOneFile(entry.path, newPath, `Move ${entry.path} to ${newPath}`);
  }
}

// ---------------------------------------------------------------
// Delete
// ---------------------------------------------------------------
window.dgeAdminDelete = async function(path, type, sha) {
  const confirmMsg = type === 'dir'
    ? `Delete the folder "${path}" and everything inside it? This can't be undone from here.`
    : `Delete "${path}"? This can't be undone from here.`;
  if (!confirm(confirmMsg)) return;

  try {
    if (type === 'dir') {
      const tree = await dgeGithubGetRecursiveTree();
      const descendants = tree.tree.filter(t => t.type === 'blob' && t.path.startsWith(path + '/'));
      for (const entry of descendants) {
        const f = await dgeGithubGetFile(entry.path);
        await dgeGithubDeleteFile(entry.path, `Delete ${entry.path} via admin editor`, f.sha);
      }
    } else {
      await dgeGithubDeleteFile(path, `Delete ${path} via admin editor`, sha);
    }
    if (typeof showToast === 'function') showToast('Deleted.');
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Delete failed: ' + e.message);
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

window.dgeAdminHandleDrop = async function(e, targetFolderPath) {
  e.preventDefault();
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

  // OS files dropped from outside the browser (real File objects)
  if (e.dataTransfer.files && e.dataTransfer.files.length) {
    const prevPath = dgeAdminCurrentPath;
    dgeAdminCurrentPath = targetFolderPath;
    await window.dgeAdminUploadFiles(e.dataTransfer.files);
    dgeAdminCurrentPath = prevPath;
    return;
  }

  // Internal move (dragging one of our own rows)
  if (!dgeAdminDragSourcePath || dgeAdminDragSourcePath === targetFolderPath) return;
  const name = dgeAdminDragSourcePath.split('/').pop();
  const newPath = targetFolderPath + '/' + name;
  if (newPath === dgeAdminDragSourcePath) return;

  const rowEl = document.querySelector(`.admin-file-row[data-path="${dgeAdminDragSourcePath}"]`);
  const type = rowEl ? rowEl.dataset.type : 'file';

  try {
    if (type === 'dir') {
      await dgeAdminMoveFolder(dgeAdminDragSourcePath, newPath);
    } else {
      await dgeAdminMoveOneFile(dgeAdminDragSourcePath, newPath, `Move ${name} to ${targetFolderPath}`);
    }
    if (typeof showToast === 'function') showToast(`Moved ${name}.`);
    dgeAdminNavigate(dgeAdminCurrentPath);
  } catch (err) {
    if (typeof showToast === 'function') showToast('Move failed: ' + err.message);
  }
  dgeAdminDragSourcePath = null;
};
