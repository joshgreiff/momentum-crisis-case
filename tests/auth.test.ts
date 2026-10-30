import {describe,expect,it} from 'vitest';
import {authConfig,createSessionToken,isAuthorized,passcodeMatches,verifySessionToken,SESSION_TTL_SECONDS} from '../lib/auth';

const cfg={mode:'passcode' as const,passcode:'crisis-team-6-passcode',secret:'s'.repeat(40)};

describe('authConfig',()=>{
 it('uses passcode mode only when both values are strong enough',()=>{
  expect(authConfig({TEAM_PASSCODE:'crisis-team-6',SESSION_SECRET:'x'.repeat(32),NODE_ENV:'production'}).mode).toBe('passcode');
  expect(authConfig({TEAM_PASSCODE:'short',SESSION_SECRET:'x'.repeat(32)}).mode).toBe('misconfigured');
  expect(authConfig({TEAM_PASSCODE:'crisis-team-6',SESSION_SECRET:'short'}).mode).toBe('misconfigured');
  expect(authConfig({TEAM_PASSCODE:'crisis-team-6'}).mode).toBe('misconfigured');
 });
 it('falls back to localhost-only in development and fails closed in production',()=>{
  expect(authConfig({NODE_ENV:'development'}).mode).toBe('local-only');
  expect(authConfig({NODE_ENV:'production'}).mode).toBe('misconfigured');
  expect(authConfig({SESSION_SECRET:'x'.repeat(32),NODE_ENV:'development'}).mode).toBe('local-only');
  expect(authConfig({SESSION_SECRET:'x'.repeat(32),NODE_ENV:'production'}).mode).toBe('misconfigured');
 });
});

describe('team session',()=>{
 it('accepts the right passcode only',async()=>{
  expect(await passcodeMatches('crisis-team-6-passcode',cfg)).toBe(true);
  expect(await passcodeMatches(' crisis-team-6-passcode ',cfg)).toBe(true);
  expect(await passcodeMatches('wrong',cfg)).toBe(false);
 });
 it('verifies signed, unexpired tokens and rejects tampering, expiry, and passcode rotation',async()=>{
  const now=Date.UTC(2026,9,30);
  const token=await createSessionToken(cfg,now);
  expect(await verifySessionToken(token,cfg,now)).toBe(true);
  expect(await verifySessionToken(token,cfg,now+(SESSION_TTL_SECONDS+1)*1000)).toBe(false);
  expect(await verifySessionToken(token.replace(/.$/,c=>c==='A'?'B':'A'),cfg,now)).toBe(false);
  const [v,exp,sig]=token.split('.');
  expect(await verifySessionToken(`${v}.${Number(exp)+999999}.${sig}`,cfg,now)).toBe(false);
  expect(await verifySessionToken(token,{...cfg,passcode:'a-new-team-passcode'},now)).toBe(false);
  expect(await verifySessionToken(token,{...cfg,secret:'t'.repeat(40)},now)).toBe(false);
  expect(await verifySessionToken(undefined,cfg,now)).toBe(false);
 });
 it('authorizes requests by mode',async()=>{
  const token=await createSessionToken(cfg);
  expect(await isAuthorized({token,host:'momentum.vercel.app',forwardedHost:'momentum.vercel.app'},cfg)).toBe(true);
  expect(await isAuthorized({host:'momentum.vercel.app',forwardedHost:null},cfg)).toBe(false);
  expect(await isAuthorized({host:'localhost:3000',forwardedHost:null},{mode:'local-only'})).toBe(true);
  expect(await isAuthorized({host:'momentum.vercel.app',forwardedHost:null},{mode:'local-only'})).toBe(false);
  expect(await isAuthorized({token,host:'localhost:3000',forwardedHost:null},{mode:'misconfigured',reason:'x'})).toBe(false);
 });
});
