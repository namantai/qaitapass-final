'use strict';

const { Contract } = require('fabric-contract-api');

// Application roles are CA-signed ECert attributes, constrained to test MSPs.
const ROLE_MSPS = Object.freeze({
  refurbisher: ['Org1MSP'],
  diagnostics: ['Org1MSP'],
  repairer: ['Org2MSP'],
  reviewer: ['Org2MSP'],
  reader: ['Org1MSP', 'Org2MSP']
});
const REASONS = new Set(['UNVERIFIED_INPUT', 'LABEL_MISMATCH', 'REVIEW_REQUEST']);

// Helpers deliberately live outside the Contract: they are not transactions.
function authorize(ctx, roles) {
  const msp = ctx.clientIdentity.getMSPID();
  const role = ctx.clientIdentity.getAttributeValue('qaitapass.role');
  if (!roles.includes(role) || !ROLE_MSPS[role]?.includes(msp)) {
    throw new Error('Not authorized for this QaitaPass operation');
  }
  return { issuer: msp, issuerId: ctx.clientIdentity.getID(), role };
}

function validateId(deviceId) {
  if (typeof deviceId !== 'string' || deviceId !== deviceId.trim() ||
      !/^DEV-[A-Z0-9-]{3,24}$/.test(deviceId)) {
    throw new Error('Use a synthetic DEV- identifier');
  }
}

function validateDigest(digest) {
  if (typeof digest !== 'string' || digest.length !== 64 || !/^[0-9a-f]{64}$/i.test(digest)) {
    throw new Error('A SHA-256 hex document digest is required');
  }
  return digest.toLowerCase();
}

const passportKey = (ctx, id) => ctx.stub.createCompositeKey('passport', [id]);
const eventKey = (ctx, id, index) => ctx.stub.createCompositeKey('event', [id, String(index)]);
const encode = value => Buffer.from(JSON.stringify(value));

async function loadPassport(ctx, id) {
  validateId(id);
  const data = await ctx.stub.getState(passportKey(ctx, id));
  if (!data.length) throw new Error('Unknown passport');
  const passport = JSON.parse(data.toString());
  if (!Number.isSafeInteger(passport.eventCount) || passport.eventCount < 1) {
    throw new Error('Invalid passport event count');
  }
  return passport;
}

async function appendEvent(ctx, passport, type, digest, status, actor) {
  const index = passport.eventCount;
  if (!Number.isSafeInteger(index + 1)) throw new Error('Event limit reached');
  const key = eventKey(ctx, passport.deviceId, index);
  // Read-before-write prevents overwrites and participates in Fabric MVCC.
  if ((await ctx.stub.getState(key)).length) throw new Error('Event already exists');
  const event = {
    index, type, digest, ...actor,
    supersedes: index === 0 ? null : index - 1,
    status, txId: ctx.stub.getTxID()
  };
  await ctx.stub.putState(key, encode(event));
  await ctx.stub.putState(passportKey(ctx, passport.deviceId), encode({
    ...passport, eventCount: index + 1,
    disputed: passport.disputed || type === 'DISPUTE'
  }));
  return event;
}

class QaitaPassContract extends Contract {
  constructor() {
    super('QaitaPass');
  }

  async registerDevice(ctx, deviceId, digest) {
    const actor = authorize(ctx, ['refurbisher']);
    validateId(deviceId);
    const normalized = validateDigest(digest);
    if ((await ctx.stub.getState(passportKey(ctx, deviceId))).length) {
      throw new Error('Duplicate device passport');
    }
    // Preserve the simulation's initial diagnostic commitment at index zero.
    return appendEvent(ctx, { deviceId, eventCount: 0, disputed: false },
      'DIAGNOSTIC', normalized, 'ACTIVE', actor);
  }

  async addDiagnostic(ctx, deviceId, digest) {
    const actor = authorize(ctx, ['refurbisher', 'diagnostics']);
    const normalized = validateDigest(digest);
    return appendEvent(ctx, await loadPassport(ctx, deviceId), 'DIAGNOSTIC', normalized, 'ACTIVE', actor);
  }

  async appendRepair(ctx, deviceId, digest) {
    const actor = authorize(ctx, ['repairer']);
    const normalized = validateDigest(digest);
    return appendEvent(ctx, await loadPassport(ctx, deviceId), 'REPAIR', normalized, 'ACTIVE', actor);
  }

  async flagDispute(ctx, deviceId, reasonCode) {
    const actor = authorize(ctx, ['reviewer']);
    if (!REASONS.has(reasonCode)) throw new Error('Unknown reason code');
    return appendEvent(ctx, await loadPassport(ctx, deviceId), 'DISPUTE', null, reasonCode, actor);
  }

  async verifyHistory(ctx, deviceId) {
    authorize(ctx, Object.keys(ROLE_MSPS));
    const passport = await loadPassport(ctx, deviceId);
    const events = [];
    // Explicit sequence reads avoid reliance on lexical key order or optional
    // peer history databases. This query never writes ledger state.
    for (let index = 0; index < passport.eventCount; index++) {
      const data = await ctx.stub.getState(eventKey(ctx, deviceId, index));
      if (!data.length) throw new Error('Incomplete passport history');
      const event = JSON.parse(data.toString());
      if (event.index !== index || event.supersedes !== (index === 0 ? null : index - 1)) {
        throw new Error('Invalid passport event order');
      }
      events.push(event);
    }
    return { deviceId, chronological: true, disputed: passport.disputed, events };
  }
}

module.exports = QaitaPassContract;
