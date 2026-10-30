import type {AgentAnalysisRow,DecisionRow,EventRow} from '../lib/db';
import type {Llm,StructuredRequest} from '../lib/llm';
import type {AgentAnalysis,Decision,Extraction} from '../lib/schemas';
import type {Store} from '../lib/store';
import type {z} from 'zod';

export function memoryStore(){
 const events=new Map<string,EventRow>();
 const analyses:AgentAnalysisRow[]=[];
 const decisions:DecisionRow[]=[];
 let seq=0;
 const store:Store={
  async insertEvent(e){
   const existing=[...events.values()].find(x=>x.provider_email_id===e.providerId);
   if(existing)return {id:existing.id,duplicate:true};
   const id=`00000000-0000-4000-8000-${String(++seq).padStart(12,'0')}`;
   events.set(id,{id,provider_email_id:e.providerId,source:e.source,subject:e.subject,sender:e.sender,body:e.body,received_at:new Date(Date.UTC(2026,9,30,12,seq)).toISOString(),facts:[],assumptions:[],urgency:'unknown',status:'received',error:null,processing_started_at:null,attempts:0,is_demo:e.isDemo});
   return {id,duplicate:false};
  },
  async getEvent(id){const e=events.get(id);return e?{...e}:null},
  async countEventsSince(iso){return [...events.values()].filter(e=>e.received_at>=iso).length},
  async claimEvent(id){
   const e=events.get(id);
   if(!e||!(e.status==='received'||e.status==='failed'))return null;
   Object.assign(e,{status:'processing',processing_started_at:new Date().toISOString(),attempts:e.attempts+1,error:null});
   return {...e};
  },
  async getHistory(before,limit){
   const prior=[...events.values()].filter(e=>e.id!==before.id&&!e.is_demo&&e.received_at<before.received_at).sort((a,b)=>b.received_at.localeCompare(a.received_at)).slice(0,limit);
   return {events:prior,decisions:decisions.filter(d=>prior.some(e=>e.id===d.event_id))};
  },
  async saveExtraction(id,x){Object.assign(events.get(id)!,{facts:x.confirmed_facts,assumptions:x.assumptions,urgency:x.urgency})},
  async getAnalyses(eventId){return analyses.filter(a=>a.event_id===eventId)},
  async saveAnalysis(eventId,role,a){
   const existing=analyses.find(x=>x.event_id===eventId&&x.role===role);
   if(existing)existing.analysis=a;else analyses.push({id:`a${analyses.length}`,event_id:eventId,role,analysis:a,created_at:new Date().toISOString()});
  },
  async hasDecision(eventId){return decisions.some(d=>d.event_id===eventId)},
  async saveDecision(eventId,d){const {title,proposal,rationale,...details}=d;decisions.push({id:`d${decisions.length}`,event_id:eventId,title,proposal,rationale,details,status:'pending',decided_at:null,created_at:new Date().toISOString()})},
  async markAnalyzed(id){Object.assign(events.get(id)!,{status:'analyzed',error:null})},
  async markFailed(id,message){Object.assign(events.get(id)!,{status:'failed',error:message})},
 };
 return {store,events,analyses,decisions};
}

export const sampleExtraction:Extraction={confirmed_facts:['Trucks stopped on I-70'],assumptions:['Possible software fault'],urgency:'high'};
export const sampleAnalysis=(headline:string):AgentAnalysis=>({headline,confirmed_facts:[{fact:'Trucks stopped on I-70',source:'Crisis update'}],case_connections:[{source:'case.md',point:'Earlier odd braking incidents'}],assumptions:['Cause unknown'],risks:[{risk:'Collision',likelihood:'medium',impact:'high',mitigation:'Halt autonomous followers'}],stakeholder_impacts:[{stakeholder:'Drivers',impact:'Safety concern',severity:'high'}],recommendations:[{action:'Pause L4 convoys',rationale:'Safety first',priority:'immediate'}],open_questions:['Root cause?']});
export const sampleDecision:Decision={title:'Pause autonomous convoys',proposal:'Pause L4 followers pending investigation',rationale:'Safety first',situation_brief:'An L4 follower truck braked unexpectedly on I-70. No injuries. Cause unknown.',recommendation_summary:'Pause L4 followers while Globex investigates.',alternatives_considered:[{option:'Continue operations',tradeoff:'Unacceptable safety risk'}],immediate_actions:[{action:'Issue pause',owner:'COO',timeframe:'1 hour'}],tradeoffs:['Delivery delays'],key_risks:['Customer churn'],dissenting_views:[{role:'CFO',concern:'Contract penalties'}],draft_communications:[{audience:'Employees',key_message:'Safety first'}],information_needed:['Root cause'],confidence:'medium'};

type Call={name:string;instructions:string[];input:string};
/** Fake LLM: records calls, tracks concurrency, and can fail selected roles. */
export function fakeLlm(opts:{failRoles?:Set<string>;delayMs?:number}={}){
 const calls:Call[]=[];
 let inFlight=0,maxInFlight=0;
 const llm:Llm={
  async structured<S extends z.ZodTypeAny>(req:StructuredRequest<S>):Promise<z.infer<S>>{
   calls.push({name:req.name,instructions:req.instructions,input:req.input});
   inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);
   try{
    await new Promise(r=>setTimeout(r,opts.delayMs??5));
    const role=/\(role: ([^)]+)\)/.exec(req.instructions.at(-1)??'')?.[1];
    if(role&&opts.failRoles?.has(role))throw new Error(`simulated ${role} failure with key sk-proj-abcdefghijklmnop`);
    const out=req.name==='crisis_extraction'?sampleExtraction:req.name==='executive_analysis'?sampleAnalysis(`${role} view`):sampleDecision;
    return req.schema.parse(out);
   }finally{inFlight--}
  },
 };
 return {llm,calls,maxInFlight:()=>maxInFlight};
}
