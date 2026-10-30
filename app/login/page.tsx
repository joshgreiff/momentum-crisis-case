import {authConfig} from '../../lib/auth';
import {TEAM} from '../../lib/team';
import {LoginForm} from './login-form';
export const dynamic='force-dynamic';

export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){
 const {next}=await searchParams;
 const cfg=authConfig();
 return <main className="flex min-h-screen items-center justify-center px-6">
  <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8">
   <p className="text-[11px] font-semibold tracking-[0.3em] text-slate-400">MOMENTUM</p>
   <h1 className="mt-1 text-xl font-semibold text-slate-900">Crisis Command Center</h1>
   <p className="mt-1 text-sm text-slate-500">{TEAM.label} · {TEAM.course}</p>
   {cfg.mode==='passcode'?<LoginForm next={next??'/'}/>
   :cfg.mode==='local-only'?<p className="mt-6 text-sm text-slate-600">No passcode is configured. In local development, open <a className="underline" href="http://localhost:3000">http://localhost:3000</a> directly.</p>
   :<p role="alert" className="mt-6 text-sm text-red-700">Sign-in is not configured on this deployment. {cfg.reason}</p>}
  </div>
 </main>;
}
