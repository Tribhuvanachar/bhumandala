// Tests for dge/js/user-roles.js's paste parser — the "Excel sheet" half of
// the lead's ask: export the user list, edit the role column in a
// spreadsheet, paste the column back.
//
// Only dgeParseRolePaste is exercised, because it is the only part that can
// be wrong on its own: everything else in that file is a Firestore write.
// What it has to survive is real clipboard content — a spreadsheet copy
// arrives tab-separated and usually carries the header row this tool itself
// exported, a hand-typed list arrives comma-separated, and either may hold
// columns (a display name, the OLD role, a timestamp) that must be ignored
// rather than mistaken for the answer.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const USER_ROLES_JS = path.resolve(__dirname, '../../js/user-roles.js');

function loadUserRoles() {
  const windowObj = { DGE_VERSIONS: {}, AUTH_CONFIG: { enabled: true, roles: ['basic'] } };
  const sandbox = {
    window: windowObj,
    document: { createElement: () => ({ set textContent(v) { this.innerHTML = String(v); }, innerHTML: '' }) },
    console: { log() {}, error() {}, warn() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    Promise, URL, Blob: function () {}, TextEncoder
  };
  const context = vm.createContext(sandbox);
  vm.runInContext('var window = this.window;', context);
  vm.runInContext(fs.readFileSync(USER_ROLES_JS, 'utf8'), context, { filename: 'user-roles.js' });
  return windowObj;
}

// The arrays the script builds come from the VM CONTEXT's own Array, which
// node:assert treats as a different value from this file's — the same realm
// mismatch role-access.test.js documents. Round-trip through JSON first.
const plain = (v) => JSON.parse(JSON.stringify(v));

const ROLES = ['basic', 'subscriber', 'sponsor', 'scholar', 'admin', 'superadmin'];

describe('dgeParseRolePaste', () => {
  test('a tab-separated spreadsheet paste, header and all', () => {
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste(
      'email\tdisplayName\trole\tphone\tlastLogin\n' +
      'ravi@example.com\tRavi\tscholar\t\t2026-09-10\n' +
      'sita@example.com\tSita\tsponsor\t\t2026-09-09\n', ROLES);
    assert.equal(rows.length, 2, 'the header row carries neither an email nor a role');
    assert.deepEqual(plain(rows.map(r => [r.email, r.role])),
      [['ravi@example.com', 'scholar'], ['sita@example.com', 'sponsor']]);
  });

  test('a comma-separated hand-typed list works too', () => {
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste('ravi@example.com, scholar', ROLES);
    assert.deepEqual(plain(rows.map(r => [r.email, r.role])), [['ravi@example.com', 'scholar']]);
  });

  test('email is matched by shape, not by column position', () => {
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste('scholar\tRavi\travi@example.com', ROLES);
    assert.deepEqual(plain(rows.map(r => [r.email, r.role])), [['ravi@example.com', 'scholar']]);
  });

  test('a trailing date column is not mistaken for the role', () => {
    // Taking "the last cell" outright is the obvious wrong implementation.
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste('ravi@example.com\tRavi\tscholar\t\t2026-09-10', ROLES);
    assert.equal(rows[0].role, 'scholar');
  });

  test('the OLD role column is overridden by the edited one to its right', () => {
    // Export gives ...role..., the admin adds a new column; the rightmost
    // known role wins, which is what makes "edit and paste back" work.
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste('ravi@example.com\tRavi\tbasic\tscholar', ROLES);
    assert.equal(rows[0].role, 'scholar');
  });

  test('an unknown role is reported, never applied', () => {
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste('ravi@example.com\tarchivist', ROLES);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].role, null, 'a typo must surface as a failed row, not a silent write');
    assert.equal(rows[0].email, 'ravi@example.com');
  });

  test('roles and emails are lowercased so a spreadsheet’s capitals still match', () => {
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste('Ravi@Example.COM\tScholar', ROLES);
    assert.deepEqual(plain([rows[0].email, rows[0].role]), ['ravi@example.com', 'scholar']);
  });

  test('quotes from a CSV export are stripped', () => {
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste('"ravi@example.com","Ravi","scholar"', ROLES);
    assert.deepEqual(plain([rows[0].email, rows[0].role]), ['ravi@example.com', 'scholar']);
  });

  test('blank lines and stray whitespace are skipped', () => {
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste('\n  \nravi@example.com\tscholar\n\n', ROLES);
    assert.equal(rows.length, 1);
  });

  test('line numbers are kept so a failed row can be pointed at', () => {
    const w = loadUserRoles();
    const rows = w.dgeParseRolePaste('email\trole\nravi@example.com\tscholar', ROLES);
    assert.equal(rows[0].line, 2);
  });

  test('nothing at all parses to nothing', () => {
    const w = loadUserRoles();
    assert.deepEqual(w.dgeParseRolePaste('', ROLES).length, 0);
    assert.deepEqual(w.dgeParseRolePaste(null, ROLES).length, 0);
  });
});
