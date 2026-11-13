import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalNetwork, demoDigest} from '../src/network.js';
const ID='DEV-UNIT-001';
function ready() {
 const n=new LocalNetwork();
 n.submit('REFURB','issuePassport',{deviceId:ID,digest:demoDigest('intake')});
 return n;
}
test('01 authorised refurbisher issues one pseudonymous passport',()=>{
 const n=ready(); assert.equal(n.read(ID).events.length,1); assert.equal(n.blocks.length,2);
});
test('02 an unapproved role cannot issue a passport',()=>{
 const n=new LocalNetwork(); assert.throws(()=>n.submit('REPAIR','issuePassport',{deviceId:ID,digest:demoDigest('a')}),/Only a refurbisher/);
 assert.equal(n.blocks.length,1);
});
test('03 duplicate passport is rejected',()=>{
 const n=ready();assert.throws(()=>n.submit('REFURB','issuePassport',{deviceId:ID,digest:demoDigest('repeat')}),/Duplicate/);
});
test('04 authorised diagnostic append preserves the original event',()=>{
 const n=ready();n.submit('LAB','addDiagnostic',{deviceId:ID,digest:demoDigest('battery')});
 assert.equal(n.read(ID).events.length,2); assert.equal(n.read(ID).events[1].supersedes,0);
});
test('05 authorised repair is appended without deleting prior history',()=>{
 const n=ready();n.submit('REPAIR','appendRepair',{deviceId:ID,digest:demoDigest('ssd')});
 assert.equal(n.read(ID).events[0].type,'DIAGNOSTIC'); assert.equal(n.read(ID).events[1].type,'REPAIR');
});
test('06 an unapproved role cannot write a repair event',()=>{
 const n=ready();assert.throws(()=>n.submit('LAB','appendRepair',{deviceId:ID,digest:demoDigest('ssd')}),/Only an approved repairer/);
});
test('07 reviewer flags a dispute and ordinary user cannot',()=>{
 const n=ready();assert.throws(()=>n.submit('REFURB','flagDispute',{deviceId:ID,reasonCode:'REVIEW_REQUEST'}),/Only a reviewer/);
 n.submit('REVIEW','flagDispute',{deviceId:ID,reasonCode:'REVIEW_REQUEST'});
 assert.equal(n.read(ID).disputed,true);
});
test('08 invalid document digest is rejected',()=>{
 const n=new LocalNetwork();assert.throws(()=>n.submit('REFURB','issuePassport',{deviceId:ID,digest:'real-person-name'}),/SHA-256/);
});
test('09 fake transaction signature is rejected before recording a block',()=>{
 const n=new LocalNetwork();const tx=n.signedTransaction('REFURB','issuePassport',{deviceId:ID,digest:demoDigest('a')});
 tx.data.deviceId='DEV-TAMPER-002';assert.throws(()=>n.commit(tx),/Invalid transaction signature/);
 assert.equal(n.blocks.length,1);
});
test('10 chain verification detects stored-block tampering',()=>{
 const n=ready();assert.equal(n.checkChain(),true);
 n.blocks[1].tx.data.deviceId='DEV-FORGED-003';assert.equal(n.checkChain(),false);
});
test('11 missing passport fails without chain updates',()=>{
 const n=new LocalNetwork();assert.throws(()=>n.submit('REPAIR','appendRepair',{deviceId:ID,digest:demoDigest('a')}),/Unknown passport/);
 assert.equal(n.blocks.length,1);
});
test('12 invalid dispute code cannot be recorded',()=>{
 const n=ready();assert.throws(()=>n.submit('REVIEW','flagDispute',{deviceId:ID,reasonCode:'JUST_BECAUSE'}),/Unknown reason code/);
});
