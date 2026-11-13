'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Contract } = require('fabric-contract-api');
const QaitaPass = require('../lib/qaitapass-contract');

const ID = 'DEV-UNIT-001';
const digest = text => createHash('sha256').update(text).digest('hex');
const HASH = digest('synthetic intake');
const ROLES = ['refurbisher', 'diagnostics', 'repairer', 'reviewer', 'reader'];
const mspFor = role => ['repairer', 'reviewer'].includes(role) ? 'Org2MSP' : 'Org1MSP';

// Only the Fabric context is doubled. Tests execute the real Contract subclass.
// This fixture is not consensus, endorsement, a CA, or an integration network.
function fixture() {
  const contract = new QaitaPass();
  const state = new Map();
  const writes = [];
  let tx = 0;
  const context = (role, msp = mspFor(role)) => ({
    clientIdentity: {
      getMSPID: () => msp,
      getAttributeValue: name => name === 'qaitapass.role' ? role : null,
      getID: () => `x509::/CN=synthetic-${role}::/CN=synthetic-ca`
    },
    stub: {
      createCompositeKey: (type, attrs) => `\u0000${type}\u0000${attrs.join('\u0000')}\u0000`,
      getState: async key => Buffer.from(state.get(key) || ''),
      putState: async (key, value) => { writes.push(key); state.set(key, Buffer.from(value)); },
      getTxID: () => `synthetic-tx-${tx}`
    }
  });
  const call = (role, fn, ...args) => {
    tx++;
    return contract[fn](context(role), ...args);
  };
  const ready = () => call('refurbisher', 'registerDevice', ID, HASH);
  const read = () => call('reader', 'verifyHistory', ID);
  const snapshot = () => [...state].map(([key, value]) => [key, value.toString()]);
  return { contract, state, writes, context, call, ready, read, snapshot };
}

test('Fabric entry point exports a Contract with only the five application transactions', () => {
  const { contracts } = require('../index');
  assert.equal(contracts[0], QaitaPass);
  assert.ok(new QaitaPass() instanceof Contract);
  assert.deepEqual(Object.getOwnPropertyNames(QaitaPass.prototype).filter(x => x !== 'constructor').sort(),
    ['registerDevice', 'addDiagnostic', 'appendRepair', 'flagDispute', 'verifyHistory'].sort());
});

test('full scenario records authenticated provenance and preserves old event bytes', async () => {
  const f = fixture();
  await f.ready();
  const initial = f.snapshot().find(([key]) => key.startsWith('\u0000event'));
  await f.call('diagnostics', 'addDiagnostic', ID, digest('synthetic battery'));
  await f.call('repairer', 'appendRepair', ID, digest('synthetic SSD'));
  await f.call('reviewer', 'flagDispute', ID, 'REVIEW_REQUEST');
  const history = await f.read();
  assert.deepEqual(history.events.map(e => e.type), ['DIAGNOSTIC', 'DIAGNOSTIC', 'REPAIR', 'DISPUTE']);
  assert.deepEqual(history.events.map(e => e.supersedes), [null, 0, 1, 2]);
  assert.equal(history.disputed, true);
  assert.equal(history.chronological, true);
  assert.equal(history.events[2].issuer, 'Org2MSP');
  assert.match(history.events[2].issuerId, /synthetic-repairer/);
  assert.equal(history.events[2].txId, 'synthetic-tx-3');
  assert.equal(f.state.get(initial[0]).toString(), initial[1]);
  assert.equal(f.writes.filter(k => k === initial[0]).length, 1);
});

test('every writer operation rejects all disallowed certificate roles without writes', async () => {
  const operations = [
    ['registerDevice', ['refurbisher'], 'DEV-OTHER-001', HASH],
    ['addDiagnostic', ['refurbisher', 'diagnostics'], ID, HASH],
    ['appendRepair', ['repairer'], ID, HASH],
    ['flagDispute', ['reviewer'], ID, 'REVIEW_REQUEST']
  ];
  for (const [fn, allowed, ...args] of operations) {
    for (const role of ROLES.filter(role => !allowed.includes(role))) {
      const f = fixture();
      await f.ready();
      const before = f.snapshot();
      await assert.rejects(f.call(role, fn, ...args), /Not authorized/, `${role}: ${fn}`);
      assert.deepEqual(f.snapshot(), before);
    }
  }
});

test('unknown, absent and inherited-property role names fail closed, including reads', async () => {
  const f = fixture();
  await f.ready();
  for (const role of [null, undefined, '', 'admin', 'constructor', '__proto__']) {
    await assert.rejects(f.call(role, 'registerDevice', 'DEV-OTHER-001', HASH), /Not authorized/);
    await assert.rejects(f.call(role, 'verifyHistory', ID), /Not authorized/);
  }
});

test('MSP restriction rejects an otherwise valid role from the wrong organization', async () => {
  const f = fixture();
  await f.ready();
  await assert.rejects(f.contract.registerDevice(f.context('refurbisher', 'Org2MSP'), 'DEV-OTHER-001', HASH), /Not authorized/);
  await assert.rejects(f.contract.appendRepair(f.context('repairer', 'Org1MSP'), ID, HASH), /Not authorized/);
  await assert.rejects(f.contract.verifyHistory(f.context('reader', 'UnknownMSP'), ID), /Not authorized/);
});

test('request fields cannot spoof certificate identity or role', async () => {
  const f = fixture();
  const forged = { deviceId: ID, digest: HASH, actor: { role: 'refurbisher', org: 'Org1MSP' } };
  await assert.rejects(f.contract.registerDevice(f.context('reader'), forged, HASH), /Not authorized/);
  await assert.rejects(f.contract.registerDevice(f.context('reader'), ID, HASH, forged.actor), /Not authorized/);
  assert.equal(f.state.size, 0);
});

test('duplicate registration cannot replace passport or events', async () => {
  const f = fixture();
  await f.ready();
  const before = f.snapshot();
  await assert.rejects(f.call('refurbisher', 'registerDevice', ID, digest('replacement')), /Duplicate/);
  assert.deepEqual(f.snapshot(), before);
});

test('only bounded synthetic DEV identifiers are accepted', async () => {
  const f = fixture();
  for (const id of ['', 'DEV-AB', 'REAL-123', 'DEV-lower', `DEV-${'A'.repeat(25)}`, 'DEV-ABC\u0000', 'DEV-ABC\n', 'DEV-ABC\r', null, {}]) {
    await assert.rejects(f.call('refurbisher', 'registerDevice', id, HASH), /synthetic DEV-/);
  }
  assert.equal(f.state.size, 0);
});

test('all commitment operations reject malformed SHA-256 without changing state', async () => {
  const f = fixture();
  await f.ready();
  const before = f.snapshot();
  for (const bad of ['', 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), ` ${HASH}`, `${HASH}\n`, `${HASH}\r`, null, {}]) {
    await assert.rejects(f.call('refurbisher', 'registerDevice', 'DEV-OTHER-001', bad), /SHA-256/);
    await assert.rejects(f.call('diagnostics', 'addDiagnostic', ID, bad), /SHA-256/);
    await assert.rejects(f.call('repairer', 'appendRepair', ID, bad), /SHA-256/);
  }
  assert.deepEqual(f.snapshot(), before);
});

test('uppercase commitments normalize to lowercase and refurbisher can add diagnostics', async () => {
  const f = fixture();
  await f.call('refurbisher', 'registerDevice', ID, HASH.toUpperCase());
  await f.call('refurbisher', 'addDiagnostic', ID, HASH.toUpperCase());
  assert.ok((await f.read()).events.every(e => e.digest === HASH));
});

test('missing-device updates and reads reject without creating records', async () => {
  const f = fixture();
  for (const [role, fn, arg] of [
    ['diagnostics', 'addDiagnostic', HASH], ['repairer', 'appendRepair', HASH],
    ['reviewer', 'flagDispute', 'REVIEW_REQUEST'], ['reader', 'verifyHistory']
  ]) {
    await assert.rejects(f.call(role, fn, ID, arg), /Unknown passport/);
  }
  assert.equal(f.writes.length, 0);
});

test('dispute reason validation and repeated flags preserve all earlier events', async () => {
  const f = fixture();
  await f.ready();
  const before = f.snapshot();
  await assert.rejects(f.call('reviewer', 'flagDispute', ID, 'JUST_BECAUSE'), /Unknown reason/);
  assert.deepEqual(f.snapshot(), before);
  for (const reason of ['UNVERIFIED_INPUT', 'LABEL_MISMATCH', 'REVIEW_REQUEST']) {
    await f.call('reviewer', 'flagDispute', ID, reason);
  }
  await f.call('repairer', 'appendRepair', ID, HASH);
  const history = await f.read();
  assert.equal(history.events.length, 5);
  assert.equal(history.disputed, true);
  assert.ok(history.events.slice(1, 4).every(e => e.digest === null));
});

test('history stays numerically ordered past index ten and read does not mutate state', async () => {
  const f = fixture();
  await f.ready();
  for (let i = 0; i < 12; i++) await f.call('diagnostics', 'addDiagnostic', ID, digest(`synthetic ${i}`));
  const before = f.snapshot();
  const count = f.writes.length;
  for (const role of ROLES) {
    const history = await f.call(role, 'verifyHistory', ID);
    assert.deepEqual(history.events.map(e => e.index), Array.from({ length: 13 }, (_, i) => i));
    history.events[0].digest = 'mutated response';
  }
  assert.equal(f.writes.length, count);
  assert.deepEqual(f.snapshot(), before);
});

test('existing next event slot is never overwritten, even with inconsistent metadata', async () => {
  const f = fixture();
  await f.ready();
  const ctx = f.context('diagnostics');
  const key = ctx.stub.createCompositeKey('event', [ID, '1']);
  f.state.set(key, Buffer.from('existing event bytes'));
  const before = f.snapshot();
  await assert.rejects(f.call('diagnostics', 'addDiagnostic', ID, HASH), /Event already exists/);
  assert.deepEqual(f.snapshot(), before);
});

test('history rejects missing events and corrupted sequence links', async () => {
  const f = fixture();
  await f.ready();
  const key = f.context('reader').stub.createCompositeKey('event', [ID, '0']);
  const original = JSON.parse(f.state.get(key));
  f.state.delete(key);
  await assert.rejects(f.read(), /Incomplete/);
  f.state.set(key, Buffer.from(JSON.stringify({ ...original, supersedes: 9 })));
  await assert.rejects(f.read(), /Invalid passport event order/);
});

test('separate passports have independent histories', async () => {
  const f = fixture();
  await f.ready();
  await f.call('refurbisher', 'registerDevice', 'DEV-OTHER-001', HASH);
  await f.call('repairer', 'appendRepair', ID, HASH);
  assert.equal((await f.read()).events.length, 2);
  assert.equal((await f.call('reader', 'verifyHistory', 'DEV-OTHER-001')).events.length, 1);
});
