import type {ReactNode} from 'react';

export const STEP_LABELS=['Update','Facts','Six executives','CEO recommendation','Team review'] as const;
export type StepState='done'|'active'|'pending'|'failed'|'review';

const tone={
 slate:'bg-slate-100 text-slate-600',
 blue:'bg-blue-50 text-blue-700',
 green:'bg-emerald-50 text-emerald-700',
 amber:'bg-amber-50 text-amber-800',
 red:'bg-red-50 text-red-700',
};
export type Tone=keyof typeof tone;

export function Chip({children,color='slate'}:{children:ReactNode;color?:Tone}){
 return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${tone[color]}`}>{children}</span>;
}

export const levelTone=(l:'low'|'medium'|'high'):Tone=>l==='high'?'red':l==='medium'?'amber':'slate';

/** A titled block of the event view. Kept visually quiet: one border, no nested cards. */
export function Block({id,label,title,aside,children}:{id?:string;label:string;title?:ReactNode;aside?:ReactNode;children:ReactNode}){
 return <section id={id} aria-label={label} className="scroll-mt-4 rounded-lg border border-slate-200 bg-white px-6 py-5">
  <div className="flex items-start justify-between gap-3">
   <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>{title&&<div className="mt-1">{title}</div>}</div>
   {aside}
  </div>
  <div className="mt-4">{children}</div>
 </section>;
}

export function Bullets({title,items,empty}:{title:string;items:ReactNode[];empty?:string}){
 if(!items.length&&!empty)return null;
 return <div>
  <h4 className="text-xs font-semibold text-slate-500">{title}</h4>
  {items.length?<ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-800">{items.map((x,i)=><li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400"/><span>{x}</span></li>)}</ul>:<p className="mt-2 text-sm text-slate-400">{empty}</p>}
 </div>;
}

export function More({label,children}:{label:string;children:ReactNode}){
 return <details className="group mt-4 border-t border-slate-100 pt-3">
  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><span className="inline-block transition group-open:rotate-90">›</span>{label}</summary>
  <div className="mt-4">{children}</div>
 </details>;
}

export function ProcessSteps({states}:{states:StepState[]}){
 const dot={done:'bg-emerald-500',active:'bg-blue-500 animate-pulse',pending:'bg-slate-300',failed:'bg-red-500',review:'bg-amber-500'};
 return <ol aria-label="Workflow progress" className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
  {STEP_LABELS.map((label,i)=>{const s=states[i]??'pending';return <li key={label} data-state={s} className="flex items-center gap-1">
   {i>0&&<span className="mx-1 h-px w-4 bg-slate-300"/>}
   <span className={`h-2 w-2 rounded-full ${dot[s]}`}/>
   <span className={s==='pending'?'text-slate-400':'text-slate-700'}>{label}</span>
  </li>})}
 </ol>;
}
