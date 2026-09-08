// Tests for dge/js/role-access.js — the client-side gate matcher behind
// admin/access-control.html and dge/js/library.js's dgeIsHiddenPath.
//
// The matcher itself (dgeMatchRoleGate / dgeIsRoleGatedPath) is pure —
// no Firebase, no DOM — so it is exercised directly rather than through
// the heavier fake-env.js sandbox user-auth.test.js needs for its
// script-loading and Firestore-call assertions. What's covered here is
// exactly the logic that can be wrong on its own: prefix matching (not
// accidentally matching a sibling that merely shares characters),
// longest-prefix precedence, and the allow/deny default for a path with
// no gate at all vs. one that has a gate but doesn't list the role being
// checked.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const ROLE_ACCESS_JS = path.resolve(__dirname, '../../js/role-access.js');

function loadRoleAccess({ authConfig } = {}) {
  const windowObj = {
    AUTH_CONFIG: authConfig !== undefined ? authConfig : {
      enabled: true,
      roles: ['basic', 'subscriber', 'sponsor', 'admin', 'superadmin', 'special']
    },
    DGE_VERSIONS: {}
  };
  const storageStub = () => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => { m.set(k, String(v)); },
      removeItem: (k) => { m.delete(k); }
    };
  };
  const sandbox = {
    window: windowObj,
    console: { log() {}, error() {}, warn() {} },
    localStorage: storageStub(),
    sessionStorage: storageStub(),
    Promise
  };
  // Same reasoning as fake-env.js's loadAuth: the script assigns to bare
  // `window.x`, so the sandbox's global object must resolve `window` to
  // the same object returned below, or assertions would check a copy the
  // script never touched.
  const context = vm.createContext(sandbox);
  vm.runInContext('var window = this.window;', context);
  vm.runInContext(fs.readFileSync(ROLE_ACCESS_JS, 'utf8'), context, { filename: 'role-access.js' });
  // Exposed alongside window's own exports so a test can drive
  // localStorage directly (e.g. simulating a superadmin device) without
  // reaching into the sandbox itself.
  windowObj.localStorage = sandbox.localStorage;
  windowObj.sessionStorage = sandbox.sessionStorage;
  return windowObj;
}

// Arrays/objects the script under test builds itself are constructed with
// the VM CONTEXT's own Array/Object constructors, not this file's -- two
// structurally-identical-but-different-realm values, which Node's assert
// module treats as unequal for some shapes (notably empty arrays). Copying
// through JSON round-trips it into a plain host-realm value before
// comparing, sidestepping the realm mismatch entirely.
const plain = (v) => JSON.parse(JSON.stringify(v));

describe('dgeMatchRoleGate — pure prefix matcher', () => {
  test('no gates configured -> no match', () => {
    const w = loadRoleAccess();
    assert.equal(w.dgeMatchRoleGate('a/b/c', []), null);
  });

  test('matches a gate on an ancestor prefix', () => {
    const w = loadRoleAccess();
    const gates = [{ prefix: 'a/b', allowRoles: ['admin'] }];
    assert.deepEqual(w.dgeMatchRoleGate('a/b/c', gates), gates[0]);
  });

  test('a path outside the gated prefix is unaffected', () => {
    const w = loadRoleAccess();
    const gates = [{ prefix: 'a/b', allowRoles: ['admin'] }];
    assert.equal(w.dgeMatchRoleGate('a/x/y', gates), null);
  });

  test('does not match a sibling that merely shares a string prefix', () => {
    // The walk is path-SEGMENT based (split on '/'), not a raw
    // startsWith() -- "darshana/vedanta" must not swallow
    // "darshana/vedantaOTHER", which starts with the same characters but
    // is a different folder entirely.
    const w = loadRoleAccess();
    const gates = [{ prefix: 'darshana/vedanta', allowRoles: [] }];
    assert.equal(w.dgeMatchRoleGate('darshana/vedantaOTHER/x', gates), null);
  });

  test('the longest matching prefix wins over a shorter ancestor gate', () => {
    const w = loadRoleAccess();
    const gates = [
      { prefix: 'a', allowRoles: ['admin'] },
      { prefix: 'a/b', allowRoles: ['sponsor'] }
    ];
    assert.deepEqual(w.dgeMatchRoleGate('a/b/c', gates), gates[1]);
  });

  test('a gate on the exact leaf path matches', () => {
    const w = loadRoleAccess();
    const gates = [{ prefix: 'a/b/c', allowRoles: ['sponsor'] }];
    assert.deepEqual(w.dgeMatchRoleGate('a/b/c', gates), gates[0]);
  });
});

describe('dgeIsRoleGatedPath — allow/deny', () => {
  test('a path with no configured gate is open to everyone, including anonymous', () => {
    const w = loadRoleAccess();
    assert.equal(w.dgeIsRoleGatedPath('open/path', 'anonymous', []), false);
  });

  test('a gated path blocks a role that is not on its allow list', () => {
    const w = loadRoleAccess();
    const gates = [{ prefix: 'gated', allowRoles: ['sponsor'] }];
    assert.equal(w.dgeIsRoleGatedPath('gated/x', 'basic', gates), true);
  });

  test('a gated path admits a role that is on its allow list', () => {
    const w = loadRoleAccess();
    const gates = [{ prefix: 'gated', allowRoles: ['sponsor'] }];
    assert.equal(w.dgeIsRoleGatedPath('gated/x', 'sponsor', gates), false);
  });

  test('a signed-out visitor (role null/undefined) is blocked from a gate that never listed "anonymous"', () => {
    const w = loadRoleAccess();
    const gates = [{ prefix: 'members-only', allowRoles: ['basic', 'sponsor'] }];
    assert.equal(w.dgeIsRoleGatedPath('members-only/x', null, gates), true);
    assert.equal(w.dgeIsRoleGatedPath('members-only/x', undefined, gates), true);
  });

  test('a gate can explicitly admit anonymous visitors', () => {
    const w = loadRoleAccess();
    const gates = [{ prefix: 'open-to-all', allowRoles: ['anonymous', 'basic'] }];
    assert.equal(w.dgeIsRoleGatedPath('open-to-all/x', 'anonymous', gates), false);
  });

  test('an empty allowRoles list blocks every role', () => {
    const w = loadRoleAccess();
    const gates = [{ prefix: 'locked', allowRoles: [] }];
    assert.equal(w.dgeIsRoleGatedPath('locked/x', 'superadmin', gates), true);
  });
});

describe('inert defaults when accounts are switched off', () => {
  test('dgeLoadRoleAccessConfig resolves to the fixed roles with no gates, no network calls', async () => {
    const w = loadRoleAccess({ authConfig: { enabled: false, roles: ['basic', 'admin'] } });
    await w.dgeLoadRoleAccessConfig();
    assert.deepEqual(plain(w.dgeAllRoleIds()), ['basic', 'admin']);
    assert.deepEqual(plain(w.dgeCurrentRoleGates()), []);
  });

  test('dgeIsHiddenByRoleGate is false for everything when there are no gates', () => {
    const w = loadRoleAccess({ authConfig: { enabled: false, roles: ['basic'] } });
    assert.equal(w.dgeIsHiddenByRoleGate('anything/at/all'), false);
  });
});

describe('preview-as-role — superadmin only', () => {
  test('setting a preview role is refused for a non-superadmin device', () => {
    const w = loadRoleAccess();
    w.dgeSetPreviewRole('basic');
    assert.equal(w.dgeGetPreviewRole(), null);
  });

  test('a superadmin device can set and read a preview role', () => {
    const w = loadRoleAccess();
    w.localStorage.setItem('is_superadmin', 'true');

    w.dgeSetPreviewRole('subscriber');
    assert.equal(w.dgeGetPreviewRole(), 'subscriber');
    w.dgeClearPreviewRole();
    assert.equal(w.dgeGetPreviewRole(), null);
  });
});
