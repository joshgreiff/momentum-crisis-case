import {readFile} from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import Markdown,{type Components} from 'react-markdown';
import {TEAM} from '../../lib/team';
export const dynamic='force-dynamic';

const DOCS={
 outline:{file:'outline.md',label:'Outline'},
 cheat:{file:'cheat-sheets.md',label:'Cheat sheets'},
 log:{file:'decision-log.md',label:'Decision log'},
} as const;
type DocKey=keyof typeof DOCS;

const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const text=(children:React.ReactNode):string=>Array.isArray(children)?children.map(text).join(''):typeof children==='string'||typeof children==='number'?String(children):children&&typeof children==='object'&&'props' in children?text((children as {props:{children?:React.ReactNode}}).props.children):'';

const components:Components={
 h1:({children})=><h1 className="text-2xl font-semibold text-slate-900">{children}</h1>,
 h2:({children})=><h2 id={slug(text(children))} className="mt-10 scroll-mt-6 border-t border-slate-200 pt-6 text-xl font-semibold text-slate-900">{children}</h2>,
 h3:({children})=><h3 className="mt-6 text-base font-semibold text-slate-900">{children}</h3>,
 p:({children})=><p className="mt-3 text-[15px] leading-relaxed text-slate-800">{children}</p>,
 ul:({children})=><ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-800">{children}</ul>,
 ol:({children})=><ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-800">{children}</ol>,
 strong:({children})=><strong className="font-semibold text-slate-900">{children}</strong>,
 em:({children})=><em className="text-slate-700">{children}</em>,
 hr:()=>null,
 code:({children})=><code className="rounded bg-slate-100 px-1 text-sm">{children}</code>,
};

export default async function Presentation({searchParams}:{searchParams:Promise<{doc?:string}>}){
 const {doc}=await searchParams;
 const key:DocKey=doc==='log'||doc==='outline'?doc:'cheat';
 const md=await readFile(path.join(process.cwd(),'presentation',DOCS[key].file),'utf8').catch(()=>null);
 const sections=md?[...md.matchAll(/^## (.+)$/gm)].map(m=>m[1].trim()):[];

 return <div className="min-h-screen">
  <header className="border-b border-slate-800 bg-slate-900 text-white">
   <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
    <Link href="/" className="flex items-baseline gap-3">
     <span className="text-[11px] font-semibold tracking-[0.3em] text-slate-400">MOMENTUM</span>
     <span className="font-semibold">Crisis Command Center</span>
     <span className="hidden text-xs text-slate-400 lg:inline">{TEAM.label}</span>
    </Link>
    <Link href="/" className="text-sm text-slate-300 hover:text-white">← Back to updates</Link>
   </div>
  </header>

  <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[240px_1fr]">
   <nav aria-label="Presentation" className="lg:sticky lg:top-6 lg:self-start">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Board presentation · Fri 11/6</p>
    <div className="mt-3 flex gap-1 rounded-md bg-slate-100 p-1 text-sm">
     {(Object.keys(DOCS) as DocKey[]).map(k=><Link key={k} href={`/presentation?doc=${k}`} aria-current={k===key?'page':undefined} className={`flex-1 rounded px-2 py-1 text-center ${k===key?'bg-white font-medium text-slate-900 shadow-sm':'text-slate-600 hover:text-slate-900'}`}>{DOCS[k].label}</Link>)}
    </div>
    {sections.length>0&&<ol className="mt-4 space-y-1 border-l border-slate-200 text-sm">{sections.map(s=><li key={s}><a href={`#${slug(s)}`} className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-slate-600 hover:border-slate-400 hover:text-slate-900">{s}</a></li>)}</ol>}
   </nav>

   <main className="min-w-0 max-w-3xl">
    {md?<Markdown components={components}>{md}</Markdown>
    :<p className="text-sm text-slate-500">This document isn&apos;t available.</p>}
   </main>
  </div>
 </div>;
}
