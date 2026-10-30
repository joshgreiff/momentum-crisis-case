'use client';
import {useActionState} from 'react';
import {login} from './actions';

export function LoginForm({next}:{next:string}){
 const [state,action,pending]=useActionState(login,{error:''});
 return <form action={action} className="mt-6 space-y-3">
  <input type="hidden" name="next" value={next}/>
  <label className="block text-sm font-medium text-slate-700">Team passcode
   <input name="passcode" type="password" required autoFocus autoComplete="current-password" disabled={pending} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"/>
  </label>
  <button type="submit" disabled={pending} className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{pending?'Checking…':'Enter command center'}</button>
  {state.error&&<p role="alert" className="text-sm text-red-700">{state.error}</p>}
 </form>;
}
