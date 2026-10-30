// Shared-passcode team access. Uses only Web Crypto so it runs in both middleware (edge) and Node.
import {isLocalConsoleAllowed} from './local-only';

export const SESSION_COOKIE='mcc_team';
export const SESSION_TTL_SECONDS=8*24*60*60;

export type AuthConfig={mode:'passcode';passcode:string;secret:string}|{mode:'local-only'}|{mode:'misconfigured';reason:string};

/** Passcode mode when TEAM_PASSCODE + SESSION_SECRET are set; unauthenticated localhost-only in `next dev`; otherwise fail closed. */
export function authConfig(env:Record<string,string|undefined>=process.env):AuthConfig{
 const passcode=env.TEAM_PASSCODE?.trim(),secret=env.SESSION_SECRET?.trim();
 if(passcode||(secret&&env.NODE_ENV!=='development')){
  if(!passcode||passcode.length<8)return {mode:'misconfigured',reason:'TEAM_PASSCODE must be set and at least 8 characters.'};
  if(!secret||secret.length<32)return {mode:'misconfigured',reason:'SESSION_SECRET must be set and at least 32 characters.'};
  return {mode:'passcode',passcode,secret};
 }
 if(env.NODE_ENV==='development')return {mode:'local-only'};
 return {mode:'misconfigured',reason:'TEAM_PASSCODE and SESSION_SECRET are not configured.'};
}

const enc=new TextEncoder();
function b64url(buf:ArrayBuffer){let s='';for(const b of new Uint8Array(buf))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function digest(s:string){return b64url(await crypto.subtle.digest('SHA-256',enc.encode(s)))}
async function sign(secret:string,data:string){
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return b64url(await crypto.subtle.sign('HMAC',key,enc.encode(data)));
}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}

export async function passcodeMatches(input:string,cfg:{passcode:string}){return safeEqual(await digest(input.trim()),await digest(cfg.passcode))}

// The passcode hash is part of the signed payload, so changing TEAM_PASSCODE signs everyone out.
export async function createSessionToken(cfg:{passcode:string;secret:string},nowMs=Date.now()){
 const payload=`v1.${Math.floor(nowMs/1000)+SESSION_TTL_SECONDS}`;
 return `${payload}.${await sign(cfg.secret,`${payload}.${await digest(cfg.passcode)}`)}`;
}

export async function verifySessionToken(token:string|undefined,cfg:{passcode:string;secret:string},nowMs=Date.now()){
 const m=token?/^v1\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(token):null;
 if(!m||Number(m[1])*1000<nowMs)return false;
 return safeEqual(m[2],await sign(cfg.secret,`v1.${m[1]}.${await digest(cfg.passcode)}`));
}

export async function isAuthorized(req:{token?:string;host:string|null;forwardedHost:string|null},cfg:AuthConfig=authConfig()){
 if(cfg.mode==='passcode')return verifySessionToken(req.token,cfg);
 if(cfg.mode==='local-only')return isLocalConsoleAllowed('development',req.host,req.forwardedHost);
 return false;
}
