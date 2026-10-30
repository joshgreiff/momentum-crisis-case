import Link from 'next/link';
import {db,type EventRow,type DecisionRow,type AgentAnalysisRow} from '../lib/db';
import {AgentAnalysisDisplaySchema,ROLES} from '../lib/schemas';
import {EXECUTIVES} from '../lib/roles';
import {teamAccess} from './access';
import {signOut} from './login/actions';
import {ASSIGNMENTS,TEAM} from '../lib/team';
import {limits} from '../lib/limits';
import {ProcessTrigger} from './components/process-trigger';
import {CrisisForm} from './components/crisis-form';
import {RetryButton} from './components/retry-button';
import {AutoRefresh} from './components/auto-refresh';
import {ExecutiveTabs,type ExecutiveItem} from './components/executive-tabs';
import {RecommendedResponse,TeamDecision,decisionDetails,hasTeamDecision} from './components/decision-card';
import {Block,Bullets,Chip,More,ProcessSteps,type StepState,type Tone} from './components/ui';
export const dynamic='force-dynamic';

type QueryResult={error:{code?:string;message:string;details?:string;hint?:string}|null;status:number};
function logQueryErrors(results:[string,QueryResult][]){const failed=results.filter(([,r])=>r.error);for(const [table,r] of failed)console.error(`[dashboard] query on "${table}" failed`,{status:r.status,code:r.error?.code,message:r.error?.message,details:r.error?.details,hint:r.error?.hint});return failed.map(([table])=>table)}

const STALE_PROCESSING_MS=10*60_000,STALE_RECEIVED_MS=2*60_000;
type RunState='running'|'stalled'|'failed'|'done';
function eventState(e:EventRow,now:number):RunState{
 const age=now-new Date(e.processing_started_at??e.received_at).getTime();
 if(e.status==='processing')return age>STALE_PROCESSING_MS?'stalled':'running';
 if(e.status==='received')return age>STALE_RECEIVED_MS?'stalled':'running';
 return e.status==='failed'?'failed':'done';
}
const stateDot:Record<RunState,string>={running:'bg-blue-500 animate-pulse',stalled:'bg-amber-500',failed:'bg-red-500',done:'bg-emerald-500'};
const stateText:Record<RunState,string>={running:'Analyzing',stalled:'Stalled',failed:'Failed',done:'Analyzed'};
const strings=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[];
const fmt=(iso:string)=>new Date(iso).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const WORKFLOW=[['New crisis update','Paste a facilitator update (or receive it by email).'],['Fact extraction','Confirmed facts are separated from assumptions.'],['Six executive analyses','CEO, Globex, COO, CFO, CMO and CHRO assess it independently.'],['CEO recommendation','One consolidated, AI-proposed response.'],['Team review','Your executive team decides. Nothing is automatic.']];

export default async function Home({searchParams}:{searchParams:Promise<{event?:string;view?:string}>}){
 const params=await searchParams;
 let events:EventRow[]=[],decisions:DecisionRow[]=[],analyses:AgentAnalysisRow[]=[];let error='';
 try{const d=db();const [e,dc,a]=await Promise.all([d.from('events').select('*').order('received_at',{ascending:false}).limit(30).returns<EventRow[]>(),d.from('decisions').select('*').order('created_at',{ascending:false}).limit(30).returns<DecisionRow[]>(),d.from('agent_analyses').select('*').order('created_at',{ascending:false}).limit(200).returns<AgentAnalysisRow[]>()]);events=e.data??[];decisions=dc.data??[];analyses=a.data??[];const failed=logQueryErrors([['events',e],['decisions',dc],['agent_analyses',a]]);if(failed.length)error=`Database query failed (${failed.join(', ')}). See server logs for details.`}catch(e){console.error('[dashboard] Supabase initialization failed:',e instanceof Error?e.message:e);error='Configure environment and database to activate the dashboard'}
 const access=await teamAccess();
 const consoleEnabled=access.allowed;
 const now=Date.now();
 const anyRunning=events.some(e=>eventState(e,now)==='running');
 const showForm=params.view==='new'||(!events.length&&!error);
 const selected=showForm?undefined:events.find(e=>e.id===params.event)??events[0];
 const pending=decisions.filter(d=>!hasTeamDecision(d)).length;
 const chronological=[...events].reverse();
 const instructorCount=events.filter(e=>!e.is_demo).length;
 const updateNumber=new Map(chronological.filter(e=>!e.is_demo).map((e,i)=>[e.id,i+1]));
 const {maxAttempts}=limits();
 const toProcess=consoleEnabled?events.filter(e=>e.attempts<maxAttempts&&(e.status==='received'||(e.status==='processing'&&eventState(e,now)==='stalled'))).map(e=>e.id):[];

 return <div className="min-h-screen">
  <AutoRefresh active={anyRunning}/>
  <ProcessTrigger eventIds={toProcess}/>
  <header className="border-b border-slate-800 bg-slate-900 text-white">
   <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
    <Link href="/" className="flex items-baseline gap-3">
     <span className="text-[11px] font-semibold tracking-[0.3em] text-slate-400">MOMENTUM</span>
     <span className="font-semibold">Crisis Command Center</span>
     <span className="hidden text-xs text-slate-400 lg:inline">{TEAM.label}</span>
    </Link>
    <div className="flex items-center gap-5 text-xs text-slate-300">
     <span aria-label="Dashboard counts"><b className="text-white">{instructorCount}</b> instructor updates · <b className="text-white">{events.length-instructorCount}</b> practice · <b className="text-white">{analyses.length}</b> analyses · <b className="text-white">{pending}</b> awaiting review · <b className="text-white">{decisions.length-pending}</b> team decisions</span>
     {consoleEnabled&&<Link href="/?view=new" className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-slate-200">+ New crisis update</Link>}
     {access.mode==='passcode'&&<form action={signOut}><button type="submit" className="text-xs text-slate-400 hover:text-white">Sign out</button></form>}
    </div>
   </div>
  </header>

  <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[240px_1fr]">
   <nav aria-label="History" className="lg:sticky lg:top-6 lg:self-start">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">History</p>
    {chronological.length?<ol className="mt-3 border-l border-slate-200">{chronological.map(e=>{const s=eventState(e,now),active=e.id===selected?.id,d=decisions.find(x=>x.event_id===e.id);return <li key={e.id} className="relative -ml-px">
     <Link href={`/?event=${e.id}`} aria-current={active?'page':undefined} className={`block border-l-2 py-2.5 pl-4 pr-2 ${active?'border-slate-900 bg-white':'border-transparent hover:bg-white/60'}`}>
      <p className="flex items-center gap-2 text-[11px] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${stateDot[s]}`} title={stateText[s]}/>{e.is_demo?<span className="rounded border border-dashed border-slate-400 px-1 text-[10px] uppercase tracking-wide">Practice</span>:<span className="font-semibold text-slate-700">Update {updateNumber.get(e.id)}</span>} · {fmt(e.received_at)}</p>
      <p className={`mt-0.5 line-clamp-2 text-sm ${active?'font-medium text-slate-900':e.is_demo?'text-slate-500':'text-slate-700'}`}>{e.subject}</p>
      {d?<p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{hasTeamDecision(d)?'Team decision recorded':'Proposal awaiting review'}</p>:s!=='done'&&<p className="mt-1 text-[11px] text-slate-500">{stateText[s]}</p>}
     </Link></li>})}</ol>:<p className="mt-3 text-sm text-slate-500">No updates yet.</p>}
   </nav>

   <main className="min-w-0 space-y-5">
    {error&&<p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {showForm?<NewUpdate consoleEnabled={consoleEnabled}/>
    :selected?<EventView event={selected} analyses={analyses.filter(a=>a.event_id===selected.id)} decision={decisions.find(d=>d.event_id===selected.id)} state={eventState(selected,now)} consoleEnabled={consoleEnabled}/>
    :<p className="text-sm text-slate-500">No crisis update selected.</p>}
   </main>
  </div>
 </div>;
}

function NewUpdate({consoleEnabled}:{consoleEnabled:boolean}){
 return <>
  <div>
   <h1 className="text-2xl font-semibold text-slate-900">New crisis update</h1>
   <p className="mt-1 text-sm text-slate-500">Turn a facilitator update into a proposed executive response in about a minute.</p>
  </div>
  <ol className="grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-5">{WORKFLOW.map(([t,d],i)=><li key={t}><p className="text-xs font-semibold text-slate-900">{i+1}. {t}</p><p className="mt-0.5 text-xs leading-snug text-slate-500">{d}</p></li>)}</ol>
  <Block label="Crisis update">
   {consoleEnabled?<CrisisForm/>:<p className="text-sm text-slate-600">Manual submission is available only when running locally with <code className="rounded bg-slate-100 px-1">npm run dev</code> at <code className="rounded bg-slate-100 px-1">http://localhost:3000</code>.</p>}
  </Block>
 </>;
}

function EventView({event:x,analyses,decision,state,consoleEnabled}:{event:EventRow;analyses:AgentAnalysisRow[];decision:DecisionRow|undefined;state:RunState;consoleEnabled:boolean}){
 const running=state==='running',broken=state==='failed'||state==='stalled';
 const facts=strings(x.facts),assumptions=strings(x.assumptions);
 const d=decisionDetails(decision);
 const items:ExecutiveItem[]=ROLES.map(role=>{
  const row=analyses.find(a=>a.role===role),parsed=AgentAnalysisDisplaySchema.safeParse(row?.analysis);
  const legacy=(row?.analysis as {text?:unknown}|undefined)?.text;
  return {role,...EXECUTIVES[role],student:ASSIGNMENTS[role].student,studentTitle:ASSIGNMENTS[role].title,analysis:parsed.success?parsed.data:null,legacyText:!parsed.success&&typeof legacy==='string'?legacy:null};
 });
 const done=items.filter(i=>i.analysis||i.legacyText).length;
 const extracted=facts.length>0||done>0||x.status==='analyzed';
 const steps:StepState[]=[
  'done',
  extracted?'done':broken?'failed':'active',
  done===ROLES.length?'done':broken?(extracted?'failed':'pending'):extracted?'active':'pending',
  decision?'done':broken&&done===ROLES.length?'failed':running&&done===ROLES.length?'active':'pending',
  decision?(hasTeamDecision(decision)?'done':'review'):'pending',
 ];
 const keyFacts=facts.slice(0,3),keyUnknowns=assumptions.slice(0,Math.max(1,5-keyFacts.length)).slice(0,2);
 const urgencyTone:Tone=x.urgency==='high'||x.urgency==='critical'?'red':x.urgency==='medium'?'amber':'slate';
 const pendingNote=running?(done===ROLES.length?'The CEO agent is consolidating the six perspectives…':`Waiting for executive analyses (${done} of ${ROLES.length})…`):broken?'Not available. Analysis did not finish.':'No recommendation for this update.';

 return <>
  <div>
   <p className="text-xs text-slate-500">{x.is_demo?<span className="mr-1 rounded border border-dashed border-slate-400 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-600">Practice · not part of the simulation record</span>:<span className="mr-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Instructor update</span>}{fmt(x.received_at)} · {x.sender||'Unknown sender'} · {x.source==='manual'?'Dashboard':'Email'}{x.attempts>1?` · attempt ${x.attempts}`:''}</p>
   <h1 className="mt-1 text-2xl font-semibold leading-tight text-slate-900">{x.subject}</h1>
   <div className="mt-3 flex flex-wrap items-center gap-4">
    <ProcessSteps states={steps}/>
    {x.urgency!=='unknown'&&<Chip color={urgencyTone}>urgency {x.urgency}</Chip>}
   </div>
   {running&&<p className="mt-4 text-sm text-blue-700">Analysis in progress · updates automatically</p>}
   {broken&&<div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p className="font-semibold">{state==='failed'?'Analysis failed':'Analysis appears stalled'}</p>{x.error&&<p className="mt-1 whitespace-pre-wrap">{x.error}</p>}{consoleEnabled?<RetryButton eventId={x.id}/>:<p className="mt-1 text-slate-600">Retry is available from the local dashboard.</p>}</div>}
  </div>

  <Block label="Situation brief">
   {d?.situation_brief?<p className="max-w-3xl text-[15px] leading-relaxed text-slate-800">{d.situation_brief}</p>
   :!extracted&&<p className="text-sm text-slate-500">{running?'Extracting facts from the update…':'No facts extracted.'}</p>}
   {(keyFacts.length>0||keyUnknowns.length>0)&&<ul className={`${d?.situation_brief?'mt-4':''} space-y-1.5 text-sm text-slate-800`}>
    {keyFacts.map((f,i)=><li key={`f${i}`} className="flex gap-2.5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900"/>{f}</li>)}
    {keyUnknowns.map((a,i)=><li key={`a${i}`} className="flex gap-2.5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full border border-amber-500"/><span><span className="font-medium text-amber-700">Unconfirmed: </span>{a}</span></li>)}
   </ul>}
   <More label={`All ${facts.length} confirmed facts, ${assumptions.length} assumptions, and the original update`}>
    <div className="grid gap-6 md:grid-cols-2">
     <Bullets title="Confirmed facts" items={facts} empty="None recorded"/>
     <Bullets title="Assumptions (unconfirmed)" items={assumptions} empty="None"/>
    </div>
    <h4 className="mt-6 text-xs font-semibold text-slate-500">Original update</h4>
    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{x.body}</p>
   </More>
  </Block>

  <RecommendedResponse decision={decision} pendingNote={pendingNote}/>

  <Block label="Executive perspectives" aside={<span className="text-xs text-slate-500">{done} of {ROLES.length} complete</span>}>
   <ExecutiveTabs items={items} running={running}/>
  </Block>

  <TeamDecision decision={decision}/>
 </>;
}
