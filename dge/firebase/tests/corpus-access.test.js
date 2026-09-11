// Tests for functions/lib/corpus-access.js — the server-side answer to
// "may this person read this grantha?".
//
// This module's entire job is saying no, and a function whose job is saying
// no cannot be trusted on happy paths alone. So most of what follows asserts
// a REFUSAL, and the refusals that matter most are the ones an attacker
// reaches for: a path that traverses out of the corpus, a shelf entry that
// matches a sibling because it shares a prefix, a gate that a deeper gate
// should have overridden, a role string arriving from the client.
//
// The other half of the job is PARITY with dge/js/role-access.js. If the two
// disagree, the reader either offers a text the server then refuses (an ugly
// but harmless bug) or hides one the server would happily serve (a quiet
// leak). The last describe() block runs the same shelf inputs through both
// implementations and asserts they agree, so the day someone edits one of
// them, this suite fails rather than the launch.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const ca = require('../functions/lib/corpus-access');

// The live go-live shelf, read from the committed config rather than
// retyped, so this suite notices if the shelf is edited.
const OVERRIDES = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../../../admin/config/library-overrides.json'), 'utf8'));

describe('matchShelf', () => {
  test('no shelf configured means everything is on it', () => {
    assert.equal(ca.matchShelf('anything/at/all', []), true);
    assert.equal(ca.matchShelf('anything/at/all', null), true);
    assert.equal(ca.matchShelf('anything/at/all', undefined), true);
  });

  test('an exact allow entry is on the shelf', () => {
    assert.equal(ca.matchShelf('SarvaMula/kavya/sumadhva_vijaya', ['SarvaMula/kavya/sumadhva_vijaya']), true);
  });

  test('a descendant is on the shelf — each sarga of an allowed work', () => {
    assert.equal(ca.matchShelf('SarvaMula/kavya/sumadhva_vijaya/sarga_01',
      ['SarvaMula/kavya/sumadhva_vijaya']), true);
    assert.equal(ca.matchShelf('SarvaMula/kavya/sumadhva_vijaya/sarga_01/deep/er',
      ['SarvaMula/kavya/sumadhva_vijaya']), true);
  });

  test('an ancestor is on the shelf — the drawer needs something to open', () => {
    assert.equal(ca.matchShelf('SarvaMula', ['SarvaMula/kavya/sumadhva_vijaya']), true);
    assert.equal(ca.matchShelf('SarvaMula/kavya', ['SarvaMula/kavya/sumadhva_vijaya']), true);
  });

  test('a sibling that merely shares characters is NOT on the shelf', () => {
    // The bug this guards: 'SarvaMulaOther' starts with 'SarvaMula', and a
    // naive startsWith would publish a whole section nobody listed.
    assert.equal(ca.matchShelf('SarvaMulaOther/kavya', ['SarvaMula/kavya/sumadhva_vijaya']), false);
    assert.equal(ca.matchShelf('SarvaMula/kavya/sumadhva_vijayam',
      ['SarvaMula/kavya/sumadhva_vijaya']), false);
    assert.equal(ca.matchShelf('SarvaMula/kavya/sumadhva_vijaya_tika',
      ['SarvaMula/kavya/sumadhva_vijaya']), false);
  });

  test('an unrelated branch is off the shelf', () => {
    assert.equal(ca.matchShelf('darshana/vedanta/dvaita/SetuTila',
      ['SarvaMula/kavya/sumadhva_vijaya']), false);
  });

  test('any one entry matching is enough', () => {
    const allow = ['SarvaMula/kavya/sumadhva_vijaya', 'SarvaMula/kavya/mani_manjari'];
    assert.equal(ca.matchShelf('SarvaMula/kavya/mani_manjari/sarga_02', allow), true);
  });

  test('empty and junk entries are ignored, not treated as a wildcard', () => {
    assert.equal(ca.matchShelf('anything', ['', null, undefined]), false);
  });

  test('an empty path is not the lever that opens the shelf', () => {
    // An empty path can only come from a caller that has nothing to check;
    // it must not become a way to enumerate. decide() below is what actually
    // guards this — a request with no path never reaches here.
    assert.equal(ca.matchShelf('', ['SarvaMula']), true);
  });
});

describe('matchGate', () => {
  const gates = [
    { prefix: 'darshana', allowRoles: ['subscriber'] },
    { prefix: 'darshana/vedanta/dvaita/SetuTila', allowRoles: ['sponsor'] }
  ];

  test('a path with no gate above it matches nothing', () => {
    assert.equal(ca.matchGate('SarvaMula/kavya/sumadhva_vijaya', gates), null);
  });

  test('a shallow gate covers everything beneath it', () => {
    assert.equal(ca.matchGate('darshana/nyaya', gates).prefix, 'darshana');
  });

  test('the deepest matching gate wins', () => {
    assert.equal(ca.matchGate('darshana/vedanta/dvaita/SetuTila/ch_01', gates).prefix,
      'darshana/vedanta/dvaita/SetuTila');
  });

  test('a sibling sharing a prefix does not inherit the deeper gate', () => {
    assert.equal(ca.matchGate('darshana/vedanta/dvaita/SetuTilaka', gates).prefix, 'darshana',
      'SetuTilaka must fall back to the darshana gate, not pick up SetuTila’s');
  });

  test('no gates, no path, no crash', () => {
    assert.equal(ca.matchGate('x/y', []), null);
    assert.equal(ca.matchGate('', gates), null);
    assert.equal(ca.matchGate(null, gates), null);
  });
});

describe('decide — the whole rule', () => {
  const SHELF = {
    shelf: { enabled: true, allow: ['SarvaMula/kavya/sumadhva_vijaya'], openToRoles: [] }
  };

  test('with no config at all, everything is open (an unconfigured deployment is unchanged)', () => {
    assert.equal(ca.decide('anything/at/all', null, {}).allowed, true);
    assert.equal(ca.decide('anything/at/all', null, null).allowed, true);
  });

  test('a signed-out visitor may read an on-shelf text', () => {
    const d = ca.decide('SarvaMula/kavya/sumadhva_vijaya/sarga_01', null, SHELF);
    assert.equal(d.allowed, true);
  });

  test('a signed-out visitor may not read an off-shelf text', () => {
    const d = ca.decide('darshana/vedanta/dvaita/SetuTila', null, SHELF);
    assert.equal(d.allowed, false);
    assert.equal(d.reason, 'off-shelf');
  });

  test('an ordinary signed-in role is held to the shelf exactly like a visitor', () => {
    // The shelf is a launch gate, not a paywall: signing up does not open it.
    for (const role of ['basic', 'subscriber', 'sponsor', 'special']) {
      assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila', role, SHELF).allowed, false,
        role + ' must not clear the shelf');
    }
  });

  test('a role named in openToRoles clears the shelf', () => {
    const cfg = { shelf: { enabled: true, allow: ['SarvaMula/kavya/sumadhva_vijaya'], openToRoles: ['reviewer'] } };
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila', 'reviewer', cfg).allowed, true);
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila', 'basic', cfg).allowed, false);
  });

  test('shelf.enabled false opens the library again without emptying the list', () => {
    const cfg = { shelf: { enabled: false, allow: ['SarvaMula/kavya/sumadhva_vijaya'], openToRoles: [] } };
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila', null, cfg).allowed, true);
  });

  test('admin and superadmin see everything', () => {
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila', 'admin', SHELF).allowed, true);
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila', 'superadmin', SHELF).allowed, true);
  });

  test('the admin bypass is on the STORED role only — a made-up role is just a stranger', () => {
    // The caller resolves the role from users/<uid>; nothing the client sends
    // reaches this argument. These assertions pin the behaviour if that ever
    // slips: a near-miss spelling must not be treated as admin.
    for (const claim of ['Admin', 'ADMIN', ' admin', 'admin ', 'superadmin\n', 'admin;superadmin']) {
      assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila', claim, SHELF).allowed, false,
        JSON.stringify(claim) + ' must not pass as admin');
    }
  });

  test('a gate refuses a role it does not list, on-shelf or not', () => {
    const cfg = { gates: [{ prefix: 'darshana/vedanta/dvaita/SetuTila', allowRoles: ['sponsor'] }] };
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila/ch_01', 'basic', cfg).allowed, false);
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila/ch_01', 'sponsor', cfg).allowed, true);
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila/ch_01', null, cfg).allowed, false);
  });

  test('a gate with an empty allowRoles closes the path to everyone but admins', () => {
    const cfg = { gates: [{ prefix: 'secret', allowRoles: [] }] };
    assert.equal(ca.decide('secret/x', 'sponsor', cfg).allowed, false);
    assert.equal(ca.decide('secret/x', 'admin', cfg).allowed, true);
  });

  test('the shelf is checked before the gates, and either one is enough to refuse', () => {
    const cfg = {
      shelf: { enabled: true, allow: ['SarvaMula'], openToRoles: [] },
      gates: [{ prefix: 'SarvaMula/kavya', allowRoles: ['sponsor'] }]
    };
    assert.equal(ca.decide('SarvaMula/kavya/sumadhva_vijaya', 'basic', cfg).reason, 'gate:SarvaMula/kavya');
    assert.equal(ca.decide('elsewhere/x', 'sponsor', cfg).reason, 'off-shelf');
    assert.equal(ca.decide('SarvaMula/kavya/sumadhva_vijaya', 'sponsor', cfg).allowed, true);
  });

  test('the reason is diagnostic only — never a thing to return to the caller', () => {
    // Pinned as a reminder, not a mechanism: "gate:darshana/.../SetuTila"
    // tells a prober exactly what exists. corpusFile logs it and answers 404.
    const d = ca.decide('darshana/vedanta/dvaita/SetuTila', null, SHELF);
    assert.equal(typeof d.reason, 'string');
    assert.ok(d.reason.length);
  });

  test('the live committed shelf: Sumadhva Vijaya is public, SetuTila and DvaitaVedanta are not', () => {
    const cfg = { shelf: OVERRIDES.shelf };
    assert.equal(ca.decide('SarvaMula/kavya/sumadhva_vijaya/sarga_01', null, cfg).allowed, true);
    assert.equal(ca.decide('SarvaMula/kavya/raghavendra_vijaya', null, cfg).allowed, true);
    assert.equal(ca.decide('SarvaMula/kavya/tirtha_prabandha', null, cfg).allowed, true);
    assert.equal(ca.decide('SarvaMula/kavya/mani_manjari', null, cfg).allowed, true);
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila', null, cfg).allowed, false);
    assert.equal(ca.decide('darshana/vedanta/dvaita/DvaitaVedanta/others/yuktimallika', null, cfg).allowed, false);
    assert.equal(ca.decide('SarvaMula/stotra/prahlada_kruta_narasimha', null, cfg).allowed, false,
      'the wider SarvaMula shelf is deliberately closed — only the four listed works are live');
  });
});

describe('objectNameFor — hostile input is the whole job', () => {
  test('a well-formed corpus path passes through unchanged', () => {
    assert.equal(ca.objectNameFor('kavya_alankara/sumadhva_vijaya/sarga_01/data.json'),
      'kavya_alankara/sumadhva_vijaya/sarga_01/data.json');
  });

  test('a leading slash is stripped, not refused', () => {
    assert.equal(ca.objectNameFor('/kavya_alankara/sumadhva_vijaya/data.json'),
      'kavya_alankara/sumadhva_vijaya/data.json');
    assert.equal(ca.objectNameFor('///kavya_alankara/data.json'), 'kavya_alankara/data.json');
  });

  test('percent-encoding is decoded once, then judged on the decoded form', () => {
    assert.equal(ca.objectNameFor('kavya_alankara%2Fsumadhva_vijaya/data.json'),
      'kavya_alankara/sumadhva_vijaya/data.json');
    assert.equal(ca.objectNameFor('%2e%2e/%2e%2e/etc/data.json'), null,
      'encoded traversal must be refused after decoding');
  });

  test('traversal is refused, not sanitised', () => {
    for (const bad of [
      '../../../etc/passwd/data.json',
      'kavya/../../secret/data.json',
      'kavya/./data.json',
      'kavya/../data.json',
      '..%2f..%2fdata.json'
    ]) {
      assert.equal(ca.objectNameFor(bad), null, JSON.stringify(bad) + ' must be refused');
    }
  });

  test('backslashes, NUL and empty segments are refused', () => {
    assert.equal(ca.objectNameFor('kavya\\..\\data.json'), null);
    assert.equal(ca.objectNameFor('kavya/\0/data.json'), null);
    assert.equal(ca.objectNameFor('kavya//sarga/data.json'), null);
  });

  test('only a data.json may be asked for', () => {
    for (const bad of [
      'kavya_alankara/sumadhva_vijaya/notes.txt',
      'kavya_alankara/sumadhva_vijaya/data.json.bak',
      'kavya_alankara/sumadhva_vijaya/',
      'data.json.txt',
      'kavya_alankara/sumadhva_vijaya/DATA.JSON'
    ]) {
      assert.equal(ca.objectNameFor(bad), null, JSON.stringify(bad) + ' must be refused');
    }
  });

  test('a bare data.json at the root is refused — it names no grantha', () => {
    assert.equal(ca.objectNameFor('data.json'), null);
    assert.equal(ca.objectNameFor('/data.json'), null);
  });

  test('exotic characters in a segment are refused rather than escaped', () => {
    for (const bad of [
      'kavya/sumadhva vijaya/data.json',
      'kavya/sumadhvaक/data.json',
      'kavya/sum*/data.json',
      'kavya/sum?x/data.json',
      'kavya/sum#x/data.json',
      'kavya/sum:x/data.json'
    ]) {
      assert.equal(ca.objectNameFor(bad), null, JSON.stringify(bad) + ' must be refused');
    }
  });

  test('a malformed percent-escape is refused, not thrown', () => {
    assert.equal(ca.objectNameFor('kavya/%zz/data.json'), null);
    assert.equal(ca.objectNameFor('%'), null);
  });

  test('nothing at all is nothing', () => {
    assert.equal(ca.objectNameFor(''), null);
    assert.equal(ca.objectNameFor(null), null);
    assert.equal(ca.objectNameFor(undefined), null);
  });
});

describe('displayPathFor — the object name is on disk, the gate is written in display paths', () => {
  const MOVES = OVERRIDES.moves;

  test('an unmoved path is its own display path', () => {
    assert.equal(ca.displayPathFor('upanishad/isha/data.json', MOVES), 'upanishad/isha');
  });

  test('a moved work resolves to where the shelf expects it', () => {
    assert.equal(ca.displayPathFor('kavya_alankara/sumadhva_vijaya/data.json', MOVES),
      'SarvaMula/kavya/sumadhva_vijaya');
    assert.equal(ca.displayPathFor('kavya_alankara/sumadhva_vijaya/sarga_01/data.json', MOVES),
      'SarvaMula/kavya/sumadhva_vijaya/sarga_01');
  });

  test('the longest matching source wins, so a move inside a moved tree still lands right', () => {
    const moves = { 'a': 'X', 'a/b': 'Y' };
    assert.equal(ca.displayPathFor('a/c/data.json', moves), 'X/c');
    assert.equal(ca.displayPathFor('a/b/c/data.json', moves), 'Y/c');
  });

  test('a sibling sharing a prefix is not moved with it', () => {
    const moves = { 'kavya_alankara/sumadhva_vijaya': 'SarvaMula/kavya/sumadhva_vijaya' };
    assert.equal(ca.displayPathFor('kavya_alankara/sumadhva_vijaya_tika/data.json', moves),
      'kavya_alankara/sumadhva_vijaya_tika');
  });

  test('no moves configured changes nothing', () => {
    assert.equal(ca.displayPathFor('a/b/data.json', null), 'a/b');
    assert.equal(ca.displayPathFor('a/b/data.json', {}), 'a/b');
  });

  test('end to end: the on-disk path of a gated work is judged by its display path', () => {
    const cfg = { shelf: OVERRIDES.shelf };
    const obj = ca.objectNameFor('kavya_alankara/sumadhva_vijaya/sarga_01/data.json');
    assert.ok(obj);
    const disp = ca.displayPathFor(obj, MOVES);
    assert.equal(ca.decide(disp, null, cfg).allowed, true,
      'judging the on-disk path directly would have refused a public grantha');
    // and the same check against the unmoved on-disk form would be wrong:
    assert.equal(ca.decide(obj.replace(/\/data\.json$/, ''), null, cfg).allowed, false);
  });
});

// --- Parity with the client -----------------------------------------------
//
// dge/js/role-access.js decides what the READER offers; this module decides
// what the SERVER serves. They are separate files by necessity (one is a
// browser global, one is a CommonJS module) so nothing but a test keeps them
// honest. These cases run identical inputs through both.
describe('parity with dge/js/role-access.js', () => {
  function loadClientShelfMatcher() {
    const windowObj = { AUTH_CONFIG: { enabled: true, roles: ['basic'] }, DGE_VERSIONS: {} };
    const storage = () => {
      const m = new Map();
      return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: (k) => { m.delete(k); }
      };
    };
    const sandbox = {
      window: windowObj, localStorage: storage(), sessionStorage: storage(),
      document: { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null },
      console, setTimeout, clearTimeout
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(
      path.resolve(__dirname, '../../js/role-access.js'), 'utf8'), sandbox);
    return windowObj;
  }

  const CASES = [
    ['SarvaMula/kavya/sumadhva_vijaya', ['SarvaMula/kavya/sumadhva_vijaya']],
    ['SarvaMula/kavya/sumadhva_vijaya/sarga_01', ['SarvaMula/kavya/sumadhva_vijaya']],
    ['SarvaMula', ['SarvaMula/kavya/sumadhva_vijaya']],
    ['SarvaMulaOther', ['SarvaMula/kavya/sumadhva_vijaya']],
    ['SarvaMula/kavya/sumadhva_vijayam', ['SarvaMula/kavya/sumadhva_vijaya']],
    ['darshana/vedanta/dvaita/SetuTila', ['SarvaMula/kavya/sumadhva_vijaya']],
    ['anything', []],
    ['', ['SarvaMula']]
  ];

  test('dgeMatchShelf and matchShelf agree on every case', () => {
    const w = loadClientShelfMatcher();
    for (const [p, allow] of CASES) {
      assert.equal(ca.matchShelf(p, allow), w.dgeMatchShelf(p, allow),
        'shelf disagreement on ' + JSON.stringify(p) + ' against ' + JSON.stringify(allow));
    }
  });

  test('matchGate and dgeMatchRoleGate agree, including longest-prefix precedence', () => {
    const w = loadClientShelfMatcher();
    const gates = [
      { prefix: 'darshana', allowRoles: ['subscriber'] },
      { prefix: 'darshana/vedanta/dvaita/SetuTila', allowRoles: ['sponsor'] }
    ];
    for (const p of ['darshana/nyaya', 'darshana/vedanta/dvaita/SetuTila/ch_01',
                     'darshana/vedanta/dvaita/SetuTilaka', 'SarvaMula/kavya', '']) {
      const mine = ca.matchGate(p, gates);
      const theirs = w.dgeMatchRoleGate(p, gates);
      assert.equal(mine && mine.prefix, theirs && theirs.prefix,
        'gate disagreement on ' + JSON.stringify(p));
    }
  });

  test('a gated refusal matches dgeIsRoleGatedPath for every role', () => {
    const w = loadClientShelfMatcher();
    const gates = [{ prefix: 'darshana/vedanta/dvaita/SetuTila', allowRoles: ['sponsor'] }];
    for (const role of ['basic', 'subscriber', 'sponsor', 'special', null]) {
      const server = ca.decide('darshana/vedanta/dvaita/SetuTila/ch_01', role, { gates });
      const client = w.dgeIsRoleGatedPath('darshana/vedanta/dvaita/SetuTila/ch_01', role, gates);
      assert.equal(server.allowed, !client, 'gate disagreement for role ' + role);
    }
  });
});

describe('configFrom — two sources, one rule', () => {
  test('the shelf comes from the overrides, the gates from Firestore', () => {
    const cfg = ca.configFrom(
      { shelf: { enabled: true, allow: ['A'], openToRoles: [] }, moves: { 'x': 'y' } },
      { gates: [{ prefix: 'A/b', allowRoles: ['sponsor'] }], capabilities: { copy: ['basic'] } }
    );
    assert.equal(cfg.shelf.enabled, true);
    assert.deepEqual(cfg.gates, [{ prefix: 'A/b', allowRoles: ['sponsor'] }]);
    assert.deepEqual(cfg.moves, { x: 'y' });
  });

  test('either source may be missing entirely', () => {
    assert.deepEqual(ca.configFrom(null, null), { shelf: null, gates: [], moves: {} });
    assert.deepEqual(ca.configFrom(undefined, undefined), { shelf: null, gates: [], moves: {} });
    assert.equal(ca.configFrom({ shelf: { enabled: true, allow: ['A'] } }, null).gates.length, 0);
  });

  test('a malformed gate is dropped rather than trusted', () => {
    // A gate with no prefix would match nothing in matchGate anyway, but
    // dropping it here keeps the shape the tests above assume.
    const cfg = ca.configFrom({}, { gates: [null, {}, { prefix: 5 }, { prefix: 'ok', allowRoles: [] }] });
    assert.deepEqual(cfg.gates, [{ prefix: 'ok', allowRoles: [] }]);
  });

  test('a non-array gates field does not become one gate', () => {
    assert.deepEqual(ca.configFrom({}, { gates: 'everything' }).gates, []);
    assert.deepEqual(ca.configFrom({}, { gates: { prefix: 'A' } }).gates, []);
  });

  test('the real committed overrides flow straight through', () => {
    const cfg = ca.configFrom(OVERRIDES, null);
    assert.equal(cfg.shelf.enabled, true);
    assert.ok(cfg.shelf.allow.includes('SarvaMula/kavya/sumadhva_vijaya'));
    assert.equal(cfg.moves['kavya_alankara/sumadhva_vijaya'], 'SarvaMula/kavya/sumadhva_vijaya');
    assert.equal(ca.decide('darshana/vedanta/dvaita/SetuTila', null, cfg).allowed, false);
  });
});
