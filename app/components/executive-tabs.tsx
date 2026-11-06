'use client';
import {useState} from 'react';
import type {AgentAnalysisDisplay,Role} from '../../lib/schemas';
import {Bullets,Chip,levelTone} from './ui';

export type ExecutiveItem={role:Role;area:string;name:string;title:string;student:string;studentTitle:string;analysis:AgentAnalysisDisplay|null;legacyText:string|null};

const topAction=(a:AgentAnalysisDisplay)=>(a.recommendations.find(r=>r.priority==='immediate')??a.recommendations[0])?.action;

export function ExecutiveTabs({items,running}:{items:ExecutiveItem[];running:boolean}){
 const [open,setOpen]=useState<Role|null>(null);
 const item=items.find(i=>i.role===open);
 return <div>
  <div role="tablist" aria-label="Executive perspectives" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
   {items.map(i=>{const ready=!!(i.analysis||i.legacyText),selected=i.role===open,action=i.analysis&&topAction(i.analysis);
    return <button key={i.role} role="tab" aria-selected={selected} aria-controls="executive-detail" onClick={()=>setOpen(selected?null:i.role)}
     className={`flex flex-col rounded-md border p-4 text-left transition ${selected?'border-slate-900 ring-1 ring-slate-900':'border-slate-200 hover:border-slate-400'}`}>
     <span className="flex w-full items-center justify-between gap-2">
      <span><span className="block text-sm font-semibold text-slate-900">{i.student}</span><span className="block text-xs text-slate-500">{i.studentTitle} · {i.area}</span></span>
      <span className={`h-2 w-2 shrink-0 rounded-full ${ready?'bg-emerald-500':running?'bg-blue-400 animate-pulse':'bg-slate-300'}`} aria-label={ready?'ready':'pending'}/>
     </span>
     {i.analysis?<>
      <span className="mt-2 text-sm leading-snug text-slate-700">{i.analysis.headline}</span>
      {action&&<span className="mt-3 border-t border-slate-100 pt-2 text-xs leading-snug text-slate-600"><span className="font-semibold text-slate-500">Top action · </span>{action}</span>}
     </>:<span className="mt-2 text-sm text-slate-400">{i.legacyText?'Earlier free-text analysis, open to read':running?'Analyzing…':'Not available'}</span>}
     <span className="mt-auto pt-3 text-xs font-medium text-slate-500">{selected?'Hide full analysis':'Open full analysis'}</span>
    </button>})}
  </div>
  {item&&<div id="executive-detail" role="tabpanel" aria-label={`${item.role} full analysis`} className="mt-4 rounded-md border border-slate-200 bg-slate-50/60 p-5">
   <div className="flex flex-wrap items-baseline justify-between gap-2">
    <p className="text-base font-semibold text-slate-900">{item.student} · {item.studentTitle}</p>
    <p className="text-xs text-slate-500">{item.role} perspective ({item.name} in the case)</p>
   </div>
   {item.analysis?<Detail a={item.analysis}/>:item.legacyText?<p className="mt-3 whitespace-pre-wrap text-sm">{item.legacyText}</p>:<p className="mt-3 text-sm text-slate-500">{running?'This analysis is still in progress.':'No analysis available.'}</p>}
  </div>}
 </div>;
}

function Detail({a}:{a:AgentAnalysisDisplay}){
 return <div className="mt-4 grid gap-6 md:grid-cols-2">
  <Bullets title="Recommendations" items={a.recommendations.map(r=><><Chip color="blue">{r.priority.replace('_',' ')}</Chip> {r.action}<span className="block text-slate-500">{r.rationale}</span></>)} empty="None"/>
  <Bullets title="Risks" items={a.risks.map(r=><><Chip color={levelTone(r.impact)}>impact {r.impact}</Chip> <Chip>likelihood {r.likelihood}</Chip> {r.risk}<span className="block text-slate-500">Mitigation: {r.mitigation}</span></>)} empty="None identified"/>
  <Bullets title="Confirmed facts" items={a.confirmed_facts.map(f=><>{f.fact} <span className="text-slate-400">· {f.source}</span></>)} empty="None identified"/>
  <Bullets title="Assumptions (unconfirmed)" items={a.assumptions} empty="None stated"/>
  <Bullets title="Stakeholder impacts" items={a.stakeholder_impacts.map(s=><><Chip color={levelTone(s.severity)}>{s.severity}</Chip> <span className="font-medium">{s.stakeholder}:</span> {s.impact}</>)} empty="None identified"/>
  <Bullets title="Case references" items={a.case_connections.map(c=><>{c.point} <span className="text-slate-400">· {c.source}</span></>)} empty="None recorded for this analysis"/>
  <Bullets title="Open questions" items={a.open_questions}/>
 </div>;
}
