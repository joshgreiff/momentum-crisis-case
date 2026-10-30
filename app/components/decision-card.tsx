import {DecisionDetailsDisplaySchema,type DecisionDetailsDisplay} from '../../lib/schemas';
import type {DecisionRow} from '../../lib/db';
import {Block,Bullets,Chip,More} from './ui';
import {TeamDecisionEditor} from './team-decision-editor';

export const hasTeamDecision=(d:DecisionRow|undefined)=>!!d?.team_response?.trim();

export function decisionDetails(decision:DecisionRow|undefined):DecisionDetailsDisplay|null{
 const p=DecisionDetailsDisplaySchema.safeParse(decision?.details);
 return p.success?p.data:null;
}

export function RecommendedResponse({decision,pendingNote}:{decision:DecisionRow|undefined;pendingNote:string}){
 if(!decision)return <Block id="ceo-recommendation" label="Recommended response"><p className="text-sm text-slate-500">{pendingNote}</p></Block>;
 const d=decisionDetails(decision);
 const top=d?.immediate_actions.slice(0,3)??[];
 return <Block id="ceo-recommendation" label="Recommended response · CEO consolidation"
  aside={hasTeamDecision(decision)
   ?<span className="whitespace-nowrap rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">AI-proposed · team decision recorded</span>
   :<span className="whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">AI-proposed · awaiting team review</span>}
  title={<h2 className="text-xl font-semibold leading-snug text-slate-900">{decision.title}</h2>}>
  <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">{d?.recommendation_summary||decision.proposal}</p>
  {!!top.length&&<div className="mt-5">
   <h3 className="text-xs font-semibold text-slate-500">Top proposed priorities</h3>
   <ol className="mt-2 grid gap-3 md:grid-cols-3">{top.map((a,i)=><li key={i} className="rounded-md bg-slate-50 p-3">
    <p className="text-xs font-medium text-slate-500">{i+1} · {a.owner} · {a.timeframe}</p>
    <p className="mt-1 text-sm leading-snug text-slate-900">{a.action}</p>
   </li>)}</ol>
  </div>}
  <More label="Full recommendation: rationale, alternatives, disagreements, drafts">
   <div className="space-y-6">
    {d?.recommendation_summary&&<div><h4 className="text-xs font-semibold text-slate-500">Recommended course of action</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{decision.proposal}</p></div>}
    {decision.rationale&&<div><h4 className="text-xs font-semibold text-slate-500">Rationale</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{decision.rationale}</p></div>}
    {d&&<>
     {d.immediate_actions.length>0&&<div>
      <h4 className="text-xs font-semibold text-slate-500">All proposed actions ({d.immediate_actions.length})</h4>
      <table className="mt-2 w-full text-left text-sm"><tbody>{d.immediate_actions.map((a,i)=><tr key={i} className="border-b border-slate-100 align-top last:border-0">
       <td className="w-36 py-2 pr-3 font-medium text-slate-700">{a.owner}</td><td className="py-2 pr-3 text-slate-800">{a.action}</td><td className="w-28 py-2 text-slate-500">{a.timeframe}</td></tr>)}</tbody></table>
     </div>}
     <div className="grid gap-6 md:grid-cols-2">
      <Bullets title="Alternatives considered" items={d.alternatives_considered.map(o=><><span className="font-medium">{o.option}</span><span className="block text-slate-500">{o.tradeoff}</span></>)} empty="Not captured for this recommendation"/>
      <Bullets title="Tradeoffs" items={d.tradeoffs} empty="None stated"/>
      <Bullets title="Executive disagreements" items={d.dissenting_views.map(v=><><span className="font-medium">{v.role}:</span> {v.concern}</>)} empty="None recorded"/>
      <Bullets title="Key risks" items={d.key_risks} empty="None stated"/>
      <Bullets title="Draft communications (not sent)" items={d.draft_communications.map(c=><><span className="font-medium">{c.audience}:</span> {c.key_message}</>)} empty="None drafted"/>
      <Bullets title="Information still needed" items={d.information_needed}/>
     </div>
     <p className="text-xs text-slate-500">Model confidence: {d.confidence}</p>
    </>}
   </div>
  </More>
 </Block>;
}

export function TeamDecision({decision}:{decision:DecisionRow|undefined}){
 const decided=hasTeamDecision(decision);
 const d=decisionDetails(decision);
 return <Block label="Team decision" aside={decided&&decision?.decided_at?<span className="text-xs text-slate-500">Recorded {new Date(decision.decided_at).toLocaleString()}</span>:undefined}>
  {!decision?<p className="text-sm text-slate-500">The team records its decision once the CEO recommendation is ready.</p>:<>
   {!decided&&<p className="mb-3 text-sm text-slate-500">Discuss as a team, then write what you decided. It is saved here and given to the AI as context for later updates. Nothing is sent or executed.</p>}
   <TeamDecisionEditor key={decision.id} id={decision.id} saved={decision.team_response?.trim()??''} suggestion={d?.recommendation_summary||decision.proposal}/>
  </>}
 </Block>;
}
