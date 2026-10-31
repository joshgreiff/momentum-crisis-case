'use client';
import {useEffect,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import type {QuestionAnswer} from '../../lib/schemas';

export type QuestionItem={id:string;label:string;question:string;answer:QuestionAnswer|null;created_at:string};

const ASKER_KEY='mcc_question_asker';
const EXAMPLES=['What did the latest update say, and what does it change for us?','What have we already told Amazon?','What should each of us do in the next 24 hours?','Is this draft OK? (paste it below)'];

export function Questions({items,students}:{items:QuestionItem[];students:string[]}){
 const router=useRouter();
 const [asker,setAsker]=useState('');
 const [question,setQuestion]=useState('');
 const [error,setError]=useState('');
 const [asking,setAsking]=useState(false);
 const [,startRefresh]=useTransition();
 useEffect(()=>{const saved=localStorage.getItem(ASKER_KEY);if(saved&&students.includes(saved))setAsker(saved)},[students]);

 async function ask(e:React.FormEvent){
  e.preventDefault();
  if(asking)return;
  setAsking(true);setError('');
  try{
   const res=await fetch('/api/questions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({asker:asker||null,question})});
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
    <label htmlFor="q-asker" className="text-slate-600">Asking as</label>
    <select id="q-asker" value={asker} disabled={asking} onChange={e=>{setAsker(e.target.value);localStorage.setItem(ASKER_KEY,e.target.value)}} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
     <option value="">Team member</option>
     {students.map(s=><option key={s} value={s}>{s}</option>)}
    </select>
   </div>
   <label htmlFor="q-text" className="sr-only">Question</label>
   <textarea id="q-text" value={question} onChange={e=>setQuestion(e.target.value)} disabled={asking} rows={4} maxLength={4000} required minLength={5}
    placeholder="Ask anything about the case, what's been sent so far, or what to do next. You can paste a draft for feedback."
    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-slate-900 focus:outline-none"/>
   {!question&&<div className="flex flex-wrap gap-1.5">{EXAMPLES.map(x=><button key={x} type="button" onClick={()=>setQuestion(x)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-900">{x}</button>)}</div>}
   <div className="flex flex-wrap items-center gap-3">
    <button type="submit" disabled={asking||question.trim().length<5} className="rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">{asking?'Thinking… (about 15 seconds)':'Ask'}</button>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
   </div>
  </form>

  {items.length>0&&<ol className="mt-5 space-y-4 border-t border-slate-100 pt-4">{items.map(q=><li key={q.id}>
   <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">{q.label}</span> · {new Date(q.created_at).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</p>
   <p className="mt-0.5 whitespace-pre-wrap text-sm font-medium text-slate-900">{q.question}</p>
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
