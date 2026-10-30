'use client';
import {useEffect,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import type {QuestionAnswer} from '../../lib/schemas';

export type QuestionItem={id:string;role:string;label:string;question:string;answer:QuestionAnswer|null;created_at:string};
type RoleOption={role:string;label:string};

const ROLE_KEY='mcc_question_role';

export function Questions({eventId,items,roles}:{eventId:string;items:QuestionItem[];roles:RoleOption[]}){
 const router=useRouter();
 const [role,setRole]=useState(roles[0]?.role??'');
 const [question,setQuestion]=useState('');
 const [error,setError]=useState('');
 const [asking,setAsking]=useState(false);
 const [,startRefresh]=useTransition();
 useEffect(()=>{const saved=localStorage.getItem(ROLE_KEY);if(saved&&roles.some(r=>r.role===saved))setRole(saved)},[roles]);

 async function ask(e:React.FormEvent){
  e.preventDefault();
  if(asking)return;
  setAsking(true);setError('');
  try{
   const res=await fetch(`/api/events/${eventId}/questions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role,question})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok){setError(data.error??'Could not answer the question. Try again.');return}
   setQuestion('');
   startRefresh(()=>router.refresh());
  }catch{setError('Network error. Try again.')}
  finally{setAsking(false)}
 }

 return <div>
  <form onSubmit={ask} className="space-y-2">
   <div className="flex flex-wrap items-center gap-2 text-sm">
    <label htmlFor={`q-role-${eventId}`} className="text-slate-600">Answer as</label>
    <select id={`q-role-${eventId}`} value={role} disabled={asking} onChange={e=>{setRole(e.target.value);localStorage.setItem(ROLE_KEY,e.target.value)}} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
     {roles.map(r=><option key={r.role} value={r.role}>{r.label}</option>)}
    </select>
   </div>
   <label htmlFor={`q-text-${eventId}`} className="sr-only">Question</label>
   <textarea id={`q-text-${eventId}`} value={question} onChange={e=>setQuestion(e.target.value)} disabled={asking} rows={3} maxLength={2000} required minLength={5}
    placeholder="e.g. What is our liability exposure from the Pittsburgh school bus crash? What should I tell drivers tonight?"
    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-slate-900 focus:outline-none"/>
   <div className="flex flex-wrap items-center gap-3">
    <button type="submit" disabled={asking||question.trim().length<5} className="rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">{asking?'Thinking… (about 15 seconds)':'Ask'}</button>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
   </div>
  </form>

  {items.length>0&&<ol className="mt-5 space-y-4 border-t border-slate-100 pt-4">{items.map(q=><li key={q.id}>
   <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">{q.label}</span> · {new Date(q.created_at).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</p>
   <p className="mt-0.5 text-sm font-medium text-slate-900">{q.question}</p>
   {q.answer?<div className="mt-2 rounded-md bg-slate-50 p-3">
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{q.answer.answer}</p>
    {(q.answer.unknowns.length>0||q.answer.sources.length>0)&&<details className="mt-2 text-xs text-slate-600">
     <summary className="cursor-pointer font-medium text-slate-500 hover:text-slate-800">Sources and unknowns</summary>
     {q.answer.sources.length>0&&<ul className="mt-2 space-y-1">{q.answer.sources.map((s,i)=><li key={i}><span className="font-medium">{s.source}:</span> {s.point}</li>)}</ul>}
     {q.answer.unknowns.length>0&&<ul className="mt-2 space-y-1">{q.answer.unknowns.map((u,i)=><li key={i}><span className="font-medium text-amber-700">Unknown:</span> {u}</li>)}</ul>}
    </details>}
   </div>:<p className="mt-2 text-sm text-slate-500">Answer unavailable.</p>}
  </li>)}</ol>}
 </div>;
}
