/**
 * Local educational permissioned blockchain. Blocks are SHA-256-linked;
 * transaction submitters sign with temporary Ed25519 development identities.
 * This is not a Hyperledger Fabric network and does not emulate Fabric consensus.
 */
import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';
import { QaitaPassContract } from './contract.js';

const stable = value => Array.isArray(value) ? value.map(stable) : (value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value);
const canonical = x => JSON.stringify(stable(x));
const sha256 = input => createHash('sha256').update(input).digest('hex');
const roles = Object.freeze({
  REFURB: {role:'refurbisher', org:'DemoRefurb-A'},
  LAB: {role:'diagnostics', org:'DemoLab-C'},
  REPAIR: {role:'repairer', org:'DemoRepair-B'},
  REVIEW: {role:'reviewer', org:'DemoReviewer-D'}
});

export class LocalNetwork {
  constructor() {
    this.contract = new QaitaPassContract();
    this.identities = {};
    for (const [name, actor] of Object.entries(roles)) {
      const {publicKey, privateKey} = generateKeyPairSync('ed25519');
      this.identities[name] = {actor, publicKey, privateKey};
    }
    const genesis = {index: 0, previous: '0'.repeat(64), tx: {action:'GENESIS'}, validator: 'LocalAuthority'};
    this.blocks = [{...genesis, hash: sha256(canonical(genesis))}];
  }
  signedTransaction(identity, action, data) {
    const record = this.identities[identity];
    if (!record) throw new Error('Unknown development identity');
    const payload = {identity, action, data};
    const signature = sign(null, Buffer.from(canonical(payload)), record.privateKey).toString('base64');
    return {...payload, signature};
  }
  submit(identity, action, data) {
    return this.commit(this.signedTransaction(identity, action, data));
  }
  commit(tx) {
    const account = this.identities[tx.identity];
    if (!account) throw new Error('Unknown development identity');
    const {signature, ...payload} = tx;
    if (!verify(null, Buffer.from(canonical(payload)), account.publicKey, Buffer.from(signature, 'base64'))) {
      throw new Error('Invalid transaction signature');
    }
    const actor = account.actor;
    const op = {
      issuePassport: () => this.contract.issuePassport({...tx.data, actor}),
      addDiagnostic: () => this.contract.addDiagnostic({...tx.data, actor}),
      appendRepair: () => this.contract.appendRepair({...tx.data, actor}),
      flagDispute: () => this.contract.flagDispute({...tx.data, actor})
    }[tx.action];
    if (!op) throw new Error('Unknown state-changing operation');
    const result = op(); // reject before creating a new block
    const head = this.blocks.at(-1);
    const block = {index: head.index + 1, previous: head.hash, tx: payload,
      signature, validator: 'LocalAuthority'};
    this.blocks.push({...block, hash: sha256(canonical(block))});
    return {height: this.blocks.length - 1, ...result};
  }
  checkChain() {
    return this.blocks.every((block,i) => {
      const {hash, ...original} = block;
      return sha256(canonical(original)) === hash && (i === 0 || original.previous === this.blocks[i-1].hash);
    });
  }
  read(deviceId) { return this.contract.verifyHistory({deviceId}); }
  chainStatus() {return {blocks: this.blocks.length, valid: this.checkChain(), mechanism:'single-authority local development ledger'};}
}
export const demoDigest = text => sha256(text);
