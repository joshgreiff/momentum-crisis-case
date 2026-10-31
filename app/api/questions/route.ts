import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {defaultDeps} from '../../../lib/agents';
import {SESSION_COOKIE,isAuthorized} from '../../../lib/auth';
import {db,type DecisionRow,type EventRow} from '../../../lib/db';
import {limits} from '../../../lib/limits';
import {safeErrorMessage} from '../../../lib/llm';
import {ADVISOR_ROLE,QUESTION_CLIENT_COOKIE,answerCaseQuestion,countQuestionsSince,isClientId,type QuestionRow} from '../../../lib/questions';
import {randomUUID} from 'node:crypto';
import {ASSIGNMENTS} from '../../../lib/team';

export const runtime='nodejs';
export const maxDuration=120;

const STUDENTS=Object.values(ASSIGNMENTS).map(a=>a.student) as [string,...string[]];
const Body=z.object({
 asker:z.enum(STUDENTS).nullable().optional(),
 question:z.string().trim().min(5,'Ask a full question').max(4000,'Keep questions under 4,000 characters'),
});

/** Answers a general team question about the case, the instructor updates and what the team has sent. Advisory only. */
export async function POST(req:NextRequest){
 if(!await isAuthorized({token:req.cookies.get(SESSION_COOKIE)?.value,host:req.headers.get('host'),forwardedHost:req.headers.get('x-forwarded-host')}))
  return NextResponse.json({error:'Team passcode required'},{status:401});
 const body=Body.safeParse(await req.json().catch(()=>null));
 if(!body.success)return NextResponse.json({error:body.error.issues[0]?.message??'Invalid question'},{status:400});
 try{
  const client=db(),deps=defaultDeps();
  const {questionsPerHour}=limits();
  if(await countQuestionsSince(client,new Date(Date.now()-3_600_000).toISOString())>=questionsPerHour)
   return NextResponse.json({error:`Limit reached: ${questionsPerHour} questions per hour. Try again later.`},{status:429});
  const existing=req.cookies.get(QUESTION_CLIENT_COOKIE)?.value;
  const clientId=isClientId(existing)?existing:randomUUID();
  const [events,decisions,recent]=await Promise.all([
   client.from('events').select('*').eq('is_demo',false).order('received_at',{ascending:true}).limit(100).returns<EventRow[]>(),
   client.from('decisions').select('*').order('created_at',{ascending:true}).limit(200).returns<DecisionRow[]>(),
   client.from('questions').select('*').eq('role',ADVISOR_ROLE).eq('client_id',clientId).order('created_at',{ascending:false}).limit(6).returns<QuestionRow[]>(),
  ]);
  for(const [what,r] of [['events',events],['decisions',decisions],['questions',recent]] as const)
   if(r.error)throw new Error(`load ${what}: ${r.error.code} ${r.error.message}`);
  const asker=body.data.asker??null;
  const answer=await answerCaseQuestion({question:body.data.question,asker,events:events.data??[],decisions:decisions.data??[],recent:recent.data??[]},deps);
  const saved=await client.from('questions').insert({event_id:null,role:ADVISOR_ROLE,asker,client_id:clientId,question:body.data.question,answer}).select('id').single();
  if(saved.error)throw new Error(`save question: ${saved.error.code} ${saved.error.message}`);
  const res=NextResponse.json({id:saved.data.id});
  if(clientId!==existing)res.cookies.set(QUESTION_CLIENT_COOKIE,clientId,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*90});
  return res;
 }catch(e){
  const message=safeErrorMessage(e);
  console.error(`[questions] ${message}`);
  const needsMigration=/23502|asker|client_id|PGRST204|PGRST205|42P01|42703/.test(message);
  return NextResponse.json({error:needsMigration?'Database needs migrations 006_case_questions.sql and 007_private_questions.sql.':'Could not answer the question. Try again.'},{status:500});
 }
}
