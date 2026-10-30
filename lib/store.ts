import type {PostgrestError,SupabaseClient} from '@supabase/supabase-js';
import {db,type AgentAnalysisRow,type DecisionRow,type EventRow} from './db';
import type {AgentAnalysis,Decision,Extraction,Role} from './schemas';

export type NewEvent={providerId:string;source:EventRow['source'];subject:string;sender:string|null;body:string;isDemo:boolean};
export type History={events:EventRow[];decisions:DecisionRow[]};

export interface Store{
 insertEvent(e:NewEvent):Promise<{id:string;duplicate:boolean}>;
 getEvent(id:string):Promise<EventRow|null>;
 countEventsSince(iso:string):Promise<number>;
 claimEvent(id:string):Promise<EventRow|null>;
 getHistory(before:EventRow,limit:number):Promise<History>;
 saveExtraction(id:string,x:Extraction):Promise<void>;
 getAnalyses(eventId:string):Promise<AgentAnalysisRow[]>;
 saveAnalysis(eventId:string,role:Role,a:AgentAnalysis):Promise<void>;
 hasDecision(eventId:string):Promise<boolean>;
 saveDecision(eventId:string,d:Decision):Promise<void>;
 markAnalyzed(id:string):Promise<void>;
 markFailed(id:string,message:string):Promise<void>;
}

export class DbError extends Error{
 constructor(op:string,public readonly pgError:PostgrestError){
  const missingSchema=['PGRST202','PGRST204','42703','42883'].includes(pgError.code??'');
  super(`Database ${op} failed: ${pgError.code??'unknown'} ${pgError.message}${pgError.hint?` (hint: ${pgError.hint})`:''}${missingSchema?' Have supabase/migrations/002_crisis_workflow.sql and 003_practice_flag.sql been applied?':''}`);
  this.name='DbError';
 }
}

/** Throws on any PostgREST error. `data` is only null without an error for writes that select nothing. */
function check<T>(op:string,r:{data:T|null;error:PostgrestError|null}):T{
 if(r.error)throw new DbError(op,r.error);
 return r.data as T;
}

export function supabaseStore(client:SupabaseClient=db()):Store{
 return {
  async insertEvent(e){
   const r=await client.from('events').insert({provider_email_id:e.providerId,source:e.source,is_demo:e.isDemo,subject:e.subject,sender:e.sender,body:e.body,status:'received'}).select('id').single();
   if(r.error?.code==='23505'){
    const existing=check('lookup duplicate event',await client.from('events').select('id').eq('provider_email_id',e.providerId).single<{id:string}>());
    return {id:existing.id,duplicate:true};
   }
   return {id:check('insert event',r).id as string,duplicate:false};
  },
  async getEvent(id){
   return check('load event',await client.from('events').select('*').eq('id',id).maybeSingle<EventRow>());
  },
  async countEventsSince(iso){
   const r=await client.from('events').select('id',{count:'exact',head:true}).gte('received_at',iso);
   check('count recent events',r);
   return r.count??0;
  },
  async claimEvent(id){
   const rows=check('claim event',await client.rpc('claim_event',{p_event_id:id})) as EventRow[]|null;
   return rows?.[0]??null;
  },
  async getHistory(before,limit){
   const events=check('load prior events',await client.from('events').select('*').lt('received_at',before.received_at).neq('id',before.id).eq('is_demo',false).order('received_at',{ascending:false}).limit(limit).returns<EventRow[]>())??[];
   if(!events.length)return {events,decisions:[]};
   const decisions=check('load prior decisions',await client.from('decisions').select('*').in('event_id',events.map(e=>e.id)).order('created_at',{ascending:false}).returns<DecisionRow[]>())??[];
   return {events,decisions};
  },
  async saveExtraction(id,x){
   check('save extraction',await client.from('events').update({facts:x.confirmed_facts,assumptions:x.assumptions,urgency:x.urgency}).eq('id',id));
  },
  async getAnalyses(eventId){
   return check('load analyses',await client.from('agent_analyses').select('*').eq('event_id',eventId).returns<AgentAnalysisRow[]>())??[];
  },
  async saveAnalysis(eventId,role,a){
   check(`save ${role} analysis`,await client.from('agent_analyses').upsert({event_id:eventId,role,analysis:a},{onConflict:'event_id,role'}));
  },
  async hasDecision(eventId){
   const r=check('check decision',await client.from('decisions').select('id').eq('event_id',eventId).maybeSingle());
   return !!r;
  },
  async saveDecision(eventId,d){
   const {title,proposal,rationale,...details}=d;
   const r=await client.from('decisions').insert({event_id:eventId,title,proposal,rationale,details});
   if(r.error?.code==='23505')return;
   check('save decision',r);
  },
  async markAnalyzed(id){
   check('mark event analyzed',await client.from('events').update({status:'analyzed',error:null}).eq('id',id));
  },
  async markFailed(id,message){
   check('mark event failed',await client.from('events').update({status:'failed',error:message}).eq('id',id));
  },
 };
}
