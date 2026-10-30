'use client';
import {startTransition,useActionState,useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';
import {submitCrisisUpdate,type ActionState} from '../actions';

const initial:ActionState={status:'idle',message:''};
const tone={idle:'',queued:'bg-emerald-50 text-emerald-800',duplicate:'bg-amber-50 text-amber-900',error:'bg-red-50 text-red-800'};
const SAMPLE={subject:'Update 2: Convoy anomaly on I-70 and viral video',sender:'Simulation facilitator',body:'At 7:40 AM today an L4 autonomous follower truck in a Momentum convoy on I-70 east of Columbus, Ohio began flashing its hazard lights and playing loud music, then braked hard twice before resuming speed. The human lead driver brought the convoy to a controlled stop on the shoulder. No injuries or collisions were reported. A passing motorist posted a video of the incident that has been viewed about 2 million times, and two local TV stations have asked Momentum for comment. Globex engineers have not yet identified a cause. Drivers in the Etna depot are asking whether they should refuse to lead convoys until the issue is explained.'};

export function CrisisForm(){
 const [state,action,pending]=useActionState(submitCrisisUpdate,initial);
 const formRef=useRef<HTMLFormElement>(null);
 const router=useRouter();
 useEffect(()=>{
  if(state.status==='queued')formRef.current?.reset();
  if((state.status==='queued'||state.status==='duplicate')&&state.eventId)router.push(`/?event=${state.eventId}`);
 },[state,router]);
 function fillSample(){
  const f=formRef.current;if(!f)return;
  for(const [k,v] of Object.entries(SAMPLE))(f.elements.namedItem(k) as HTMLInputElement|HTMLTextAreaElement).value=v;
  const practice=f.querySelector<HTMLInputElement>('input[name=kind][value=practice]');if(practice)practice.checked=true;
 }
 const input='mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-50';
 // Dispatch manually so React doesn't auto-reset the form (and lose pasted text) when validation fails.
 function onSubmit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);startTransition(()=>action(data))}
 return <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="text-sm font-medium text-slate-700">Subject<input name="subject" required minLength={3} maxLength={200} disabled={pending} className={input} placeholder="e.g. Update 2: Trucks stopped on I-70"/></label>
   <label className="text-sm font-medium text-slate-700">From <span className="font-normal text-slate-400">(optional)</span><input name="sender" maxLength={200} disabled={pending} className={input} placeholder="e.g. Simulation facilitator"/></label>
  </div>
  <label className="block text-sm font-medium text-slate-700">Crisis update text<textarea name="body" required minLength={20} maxLength={40000} rows={9} disabled={pending} className={input} placeholder="Paste the fictional crisis update here"/></label>
  <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" disabled={pending}>
   <legend className="mb-1 font-medium text-slate-700">Type of update</legend>
   <label className="flex items-center gap-2"><input type="radio" name="kind" value="instructor" required/>Instructor crisis update <span className="text-slate-400">(real, used as context for later analyses)</span></label>
   <label className="flex items-center gap-2"><input type="radio" name="kind" value="practice"/>Practice / demo <span className="text-slate-400">(kept separate)</span></label>
  </fieldset>
  <div className="flex flex-wrap items-center gap-3">
   <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{pending?'Saving update…':'Analyze Crisis'}</button>
   <button type="button" onClick={fillSample} disabled={pending} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500 disabled:opacity-50">Fill sample update</button>
   <p className="text-xs text-slate-500">AI output is drafted for team review. Nothing is sent or submitted to the simulation.</p>
  </div>
  {state.message&&<p role="status" className={`rounded-md p-3 text-sm ${tone[state.status]}`}>{state.message}</p>}
 </form>;
}
