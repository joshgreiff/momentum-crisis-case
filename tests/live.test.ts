import {describe,expect,it} from 'vitest';
import {AgentAnalysisSchema,DecisionDetailsSchema,ROLES} from '../lib/schemas';

// Opt-in: `npm run test:live`. Uses real Supabase + OpenAI from .env.local and writes one clearly labeled test event.
describe.skipIf(!process.env.RUN_LIVE)('live pipeline (Supabase + OpenAI)',()=>{
 it('analyzes a manual crisis update end to end',async()=>{
  process.loadEnvFile('.env.local');
  const {defaultDeps,ingestUpdate,manualProviderId,claimAndRun}=await import('../lib/agents');
  const {db}=await import('../lib/db');
  const deps=defaultDeps();
  const subject=`[TEST] Live pipeline check ${new Date().toISOString()}`;
  const body='Test update for verifying the analysis pipeline. Dispatch reports that two L4 autonomous follower trucks in one convoy outside Etna, Ohio braked suddenly and then accelerated this morning. The human lead driver stopped the convoy safely. No injuries reported. Cause unknown.';
  const {id,duplicate}=await ingestUpdate({providerId:manualProviderId(subject,body),source:'manual',subject,sender:'Automated live test',body,isDemo:true},deps.store);
  expect(duplicate).toBe(false);
  const result=await claimAndRun(id,deps);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe('analyzed');

  const client=db();
  const ev=await client.from('events').select('*').eq('id',id).single();
  expect(ev.error).toBeNull();
  expect(ev.data).toMatchObject({status:'analyzed',source:'manual',attempts:1,is_demo:true});
  const an=await client.from('agent_analyses').select('*').eq('event_id',id);
  expect(an.error).toBeNull();
  expect(an.data!.map(a=>a.role).sort()).toEqual([...ROLES].sort());
  for(const a of an.data!)expect(AgentAnalysisSchema.safeParse(a.analysis).success).toBe(true);
  const cited=new Set(an.data!.flatMap(a=>(a.analysis.case_connections as {source:string}[]).map(c=>c.source)));
  const {loadKnowledge}=await import('../lib/knowledge');
  const files=(await loadKnowledge()).sources.map(s=>s.name);
  expect([...cited].some(s=>files.includes(s))).toBe(true);
  const dc=await client.from('decisions').select('*').eq('event_id',id);
  expect(dc.error).toBeNull();
  expect(dc.data).toHaveLength(1);
  expect(dc.data![0].status).toBe('pending');
  expect(DecisionDetailsSchema.safeParse(dc.data![0].details).success).toBe(true);
  console.info(`Live test event ${id}: decision "${dc.data![0].title}"`);
 },300_000);
});
