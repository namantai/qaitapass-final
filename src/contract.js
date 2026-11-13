/**
 * The QaitaPass smart-contract business rules.
 * This classroom contract is executed by the local permissioned development ledger.
 * No personal information, real device serials or funds are recorded.
 */
const ALLOWED_TYPES = new Set(['DIAGNOSTIC', 'REPAIR', 'DISPUTE']);

export class QaitaPassContract {
  constructor() {
    this.passports = new Map();
  }
  require(condition, message) {
    if (!condition) throw new Error(message);
  }
  requireDigest(digest) {
    this.require(typeof digest === 'string' && /^[0-9a-f]{64}$/i.test(digest),
      'A SHA-256 hex document digest is required');
  }
  issuePassport({ deviceId, digest, actor }) {
    this.require(actor.role === 'refurbisher', 'Only a refurbisher can issue a passport');
    this.require(/^DEV-[A-Z0-9-]{3,24}$/.test(deviceId), 'Use a synthetic DEV- identifier');
    this.require(!this.passports.has(deviceId), 'Duplicate device passport');
    this.requireDigest(digest);
    const event = {
      index: 0, type: 'DIAGNOSTIC', digest: digest.toLowerCase(),
      issuer: actor.org, supersedes: null, status: 'ACTIVE'
    };
    this.passports.set(deviceId, {deviceId, events: [event], disputed: false});
    return structuredClone(event);
  }
  addDiagnostic({ deviceId, digest, actor }) {
    this.require(['refurbisher', 'diagnostics'].includes(actor.role), 'Role cannot add diagnostics');
    return this.addEvent(deviceId, 'DIAGNOSTIC', digest, actor);
  }
  appendRepair({ deviceId, digest, actor }) {
    this.require(actor.role === 'repairer', 'Only an approved repairer can add repair events');
    return this.addEvent(deviceId, 'REPAIR', digest, actor);
  }
  addEvent(deviceId, type, digest, actor) {
    this.require(ALLOWED_TYPES.has(type), 'Invalid event type');
    const passport = this.passports.get(deviceId);
    this.require(Boolean(passport), 'Unknown passport');
    this.requireDigest(digest);
    const prior = passport.events.at(-1);
    const event = {
      index: passport.events.length, type, digest: digest.toLowerCase(),
      issuer: actor.org, supersedes: prior.index, status: 'ACTIVE'
    };
    passport.events.push(event);
    return structuredClone(event);
  }
  flagDispute({ deviceId, actor, reasonCode }) {
    this.require(actor.role === 'reviewer', 'Only a reviewer can flag a dispute');
    this.require(['UNVERIFIED_INPUT', 'LABEL_MISMATCH', 'REVIEW_REQUEST'].includes(reasonCode), 'Unknown reason code');
    const passport = this.passports.get(deviceId);
    this.require(Boolean(passport), 'Unknown passport');
    passport.disputed = true;
    const ev = {
      index: passport.events.length, type: 'DISPUTE', digest: null,
      issuer: actor.org, supersedes: passport.events.at(-1).index, status: reasonCode
    };
    passport.events.push(ev);
    return structuredClone(ev);
  }
  verifyHistory({ deviceId }) {
    const passport = this.passports.get(deviceId);
    this.require(Boolean(passport), 'Unknown passport');
    const chronological = passport.events.every((ev, i) => ev.index === i && (i === 0 ? ev.supersedes === null : ev.supersedes === i - 1));
    return { deviceId, chronological, disputed: passport.disputed, events: structuredClone(passport.events) };
  }
}
