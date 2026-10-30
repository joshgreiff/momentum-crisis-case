'use client';
import {useState,useTransition} from 'react';
import {recordTeamDecision} from '../actions';

export function TeamDecisionEditor({id,saved,suggestion}:{id:string;saved:string;suggestion:string}){
 const [editing,setEditing]=useState(!saved);
 const [text,setText]=useState(saved);
 const [error,setError]=useState('');
 const [pending,start]=useTransition();
 const save=()=>start(async()=>{setError('');const r=await recordTeamDecision(id,text);if(r.error)setError(r.error);else setEditing(!text.trim())});
 const btn='rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50';

 if(!editing)return <div>
  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{saved}</p>
  <button type="button" onClick={()=>{setText(saved);setEditing(true)}} className={`${btn} mt-3 border-slate-300 text-slate-700 hover:bg-slate-50`}>Edit decision</button>
 </div>;

 return <div>
  <label htmlFor={`team-response-${id}`} className="sr-only">Our decision</label>
  <textarea id={`team-response-${id}`} value={text} onChange={e=>setText(e.target.value)} disabled={pending} rows={6} maxLength={8000}
   placeholder="What did the team decide? What you'll do, who owns it, and what you'll communicate."
   className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-slate-900 focus:outline-none"/>
  <div className="mt-2 flex flex-wrap items-center gap-2">
   <button type="button" onClick={save} disabled={pending||(!text.trim()&&!saved)} className={`${btn} border-slate-900 bg-slate-900 text-white hover:bg-slate-700`}>{pending?'Saving…':'Save team decision'}</button>
   {!text.trim()&&suggestion&&<button type="button" onClick={()=>setText(suggestion)} className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}>Start from AI recommendation</button>}
   {saved&&<button type="button" onClick={()=>{setText(saved);setEditing(false);setError('')}} disabled={pending} className={`${btn} border-transparent text-slate-500 hover:text-slate-800`}>Cancel</button>}
   {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>
 </div>;
}
