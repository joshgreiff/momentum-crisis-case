import {cookies,headers} from 'next/headers';
import {SESSION_COOKIE,authConfig,isAuthorized} from '../lib/auth';

/** Server-side team access check for pages and server actions (middleware also enforces it). */
export async function teamAccess(){
 const [h,c]=await Promise.all([headers(),cookies()]);
 const cfg=authConfig();
 const allowed=await isAuthorized({token:c.get(SESSION_COOKIE)?.value,host:h.get('host'),forwardedHost:h.get('x-forwarded-host')},cfg);
 return {allowed,mode:cfg.mode};
}
