import {describe,expect,it,vi} from 'vitest';
import {claimAndRun,ingestUpdate,manualProviderId,type PipelineDeps} from '../lib/agents';
import {ROLES} from '../lib/schemas';
import {submissionLimitError} from '../lib/limits';
import {fakeLlm,memoryStore} from './fakes';

const knowledge=async()=>({sources:[],prompt:'=== SOURCE: "case.md" (Case document) ===\nMomentum case text\n=== END SOURCE ==='});
const update={source:'manual' as const,sender:'Instructor',subject:'Update 2: trucks halted',body:'Several L4 trucks stopped on I-70 near Columbus this morning.',isDemo:false};

function setup(opts:Parameters<typeof fakeLlm>[0]={}){
 const mem=memoryStore(),ai=fakeLlm(opts);
 const deps:PipelineDeps={store:mem.store,llm:ai.llm,knowledge};
 return {mem,ai,deps};
}

describe('crisis pipeline',()=>{
 it('stores without analyzing, then runs six independent analyses concurrently and one CEO decision',async()=>{
  const {mem,ai,deps}=setup({delayMs:20});
  const {id,duplicate}=await ingestUpdate({...update,providerId:manualProviderId(update.subject,update.body)},mem.store);
  expect(duplicate).toBe(false);
  expect(mem.events.get(id)!.status).toBe('received');
  expect(ai.calls).toHaveLength(0);

  expect(await claimAndRun(id,deps)).toEqual({status:'analyzed'});
  expect(ai.calls.map(c=>c.name)).toEqual(['crisis_extraction',...ROLES.map(()=>'executive_analysis'),'ceo_decision']);
  expect(ai.maxInFlight()).toBe(ROLES.length);
  expect(mem.analyses.map(a=>a.role).sort()).toEqual([...ROLES].sort());
  expect(mem.decisions).toHaveLength(1);
  expect(mem.decisions[0]).toMatchObject({status:'pending',details:{confidence:'medium',situation_brief:expect.any(String)}});
  expect(mem.events.get(id)).toMatchObject({status:'analyzed',facts:['Trucks stopped on I-70'],urgency:'high'});

  const agentCalls=ai.calls.filter(c=>c.name==='executive_analysis');
  for(const c of agentCalls){
   expect(c.instructions[0]).toContain('Momentum case text');
   expect(c.instructions[0]).toContain('Never claim or imply that an action has been taken');
   expect(c.input).toContain('<crisis_update');
   expect(c.input).not.toContain('<executive_analyses>');
  }
  expect(new Set(agentCalls.map(c=>c.instructions[0])).size).toBe(1);
  expect(ai.calls.at(-1)!.input).toContain('<executive_analyses>');
 });

 it('records a failure, keeps successful analyses, and retries only the failed role',async()=>{
  const errors=vi.spyOn(console,'error').mockImplementation(()=>{});
  const failing=setup({failRoles:new Set(['CFO'])});
  const {id}=await ingestUpdate({...update,providerId:'p1'},failing.mem.store);
  const first=await claimAndRun(id,failing.deps);

  expect(first.status).toBe('failed');
  expect(first.error).toContain('CFO');
  expect(first.error).not.toContain('abcdefghijklmnop');
  const ev=failing.mem.events.get(id)!;
  expect(ev.status).toBe('failed');
  expect(failing.mem.analyses).toHaveLength(5);
  expect(failing.mem.decisions).toHaveLength(0);

  const retryAi=fakeLlm();
  expect(await claimAndRun(id,{...failing.deps,llm:retryAi.llm})).toEqual({status:'analyzed'});
  expect(retryAi.calls.map(c=>c.name)).toEqual(['executive_analysis','ceo_decision']);
  expect(retryAi.calls[0].instructions[1]).toContain('(role: CFO)');
  expect(failing.mem.analyses).toHaveLength(6);
  expect(failing.mem.decisions).toHaveLength(1);
  expect(ev.attempts).toBe(2);
  errors.mockRestore();
 });

 it('prevents duplicate submissions and duplicate processing',async()=>{
  const {mem,ai,deps}=setup({delayMs:30});
  const first=await ingestUpdate({...update,providerId:manualProviderId(update.subject,update.body)},mem.store);
  const again=await ingestUpdate({...update,subject:'  UPDATE 2:  trucks halted ',providerId:manualProviderId('  UPDATE 2:  trucks halted ',update.body)},mem.store);
  expect(again).toEqual({id:first.id,duplicate:true});

  // Two teammates' dashboards trigger processing at the same moment: only one run happens.
  const results=await Promise.all([claimAndRun(first.id,deps),claimAndRun(first.id,deps)]);
  expect(results.map(r=>r.status).sort()).toEqual(['analyzed','skipped']);
  expect(await claimAndRun(first.id,deps)).toEqual({status:'skipped'});
  expect(ai.calls.filter(c=>c.name==='ceo_decision')).toHaveLength(1);
 });

 it('gives later updates prior instructor updates and decisions, but never practice updates',async()=>{
  const {mem,ai,deps}=setup();
  const a=await ingestUpdate({...update,providerId:'a'},mem.store);
  await claimAndRun(a.id,deps);
  const demo=await ingestUpdate({...update,subject:'Practice: fake recall',body:'This is a practice scenario about a product recall.',providerId:'demo',isDemo:true},mem.store);
  await claimAndRun(demo.id,deps);
  mem.decisions.find(d=>d.event_id===a.id)!.team_response='Keep convoys paused; CMO drafts a holding statement.';
  const b=await ingestUpdate({...update,subject:'Update 3: media inquiries',body:'Reporters are calling about the halted trucks on I-70.',providerId:'b'},mem.store);
  await claimAndRun(b.id,deps);

  const later=ai.calls.filter(c=>c.input.includes('Update 3')&&c.name==='executive_analysis')[0];
  expect(later.input).toContain('Update 2: trucks halted');
  expect(later.input).toContain('AI-proposed response: Pause autonomous convoys');
  expect(later.input).toContain('Team decision (what the team actually chose): Keep convoys paused; CMO drafts a holding statement.');
  expect(later.input).not.toContain('Practice: fake recall');
 });

 it('limits new updates per hour and per day',async()=>{
  const {mem}=setup();
  const now=Date.UTC(2026,9,30,13,0);
  for(let i=0;i<3;i++)await ingestUpdate({...update,providerId:`x${i}`},mem.store);
  expect(await submissionLimitError(mem.store,now,{MAX_UPDATES_PER_HOUR:'5'})).toBeNull();
  expect(await submissionLimitError(mem.store,now,{MAX_UPDATES_PER_HOUR:'3'})).toContain('3 updates per hour');
  expect(await submissionLimitError(mem.store,now,{MAX_UPDATES_PER_HOUR:'10',MAX_UPDATES_PER_DAY:'2'})).toContain('2 updates per 24 hours');
 });
});
