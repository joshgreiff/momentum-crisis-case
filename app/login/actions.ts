'use server';
import {cookies,headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {SESSION_COOKIE,SESSION_TTL_SECONDS,authConfig,createSessionToken,passcodeMatches} from '../../lib/auth';

const WINDOW_MS=15*60_000,MAX_FAILURES=10;
// Best-effort, per server instance. The main defense is a long passcode plus the delay below.
const failures=new Map<string,number[]>();

function safeNext(v:FormDataEntryValue|null){
 const s=typeof v==='string'?v:'/';
 return s.startsWith('/')&&!s.startsWith('//')&&!s.startsWith('/login')?s:'/';
}

export async function login(_prev:{error:string},form:FormData):Promise<{error:string}>{
 const cfg=authConfig();
 if(cfg.mode!=='passcode')return {error:cfg.mode==='misconfigured'?'Sign-in is not configured on this deployment.':'No passcode is configured; open the dashboard from localhost.'};
 const ip=(await headers()).get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const now=Date.now(),recent=(failures.get(ip)??[]).filter(t=>now-t<WINDOW_MS);
 if(recent.length>=MAX_FAILURES)return {error:'Too many incorrect attempts. Wait 15 minutes and try again.'};
 if(!await passcodeMatches(String(form.get('passcode')??''),cfg)){
  failures.set(ip,[...recent,now]);
  await new Promise(r=>setTimeout(r,800));
  return {error:'Incorrect team passcode.'};
 }
 failures.delete(ip);
 (await cookies()).set(SESSION_COOKIE,await createSessionToken(cfg),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:SESSION_TTL_SECONDS});
 redirect(safeNext(form.get('next')));
}

export async function signOut(){
 (await cookies()).delete(SESSION_COOKIE);
 redirect('/login');
}
