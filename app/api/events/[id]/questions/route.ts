import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {defaultDeps} from '../../../../../lib/agents';
import {SESSION_COOKIE,isAuthorized} from '../../../../../lib/auth';
import {db,type DecisionRow} from '../../../../../lib/db';
import {limits} from '../../../../../lib/limits';
import {safeErrorMessage} from '../../../../../lib/llm';
import {answerQuestion,countQuestionsSince} from '../../../../../lib/questions';
import {ROLES} from '../../../../../lib/schemas';

export const runtime='nodejs';
export const maxDuration=120;

const Body=z.object({
 role:z.enum(ROLES),
 question:z.string().trim().min(5,'Ask a full question').max(2000,'Keep questions under 2,000 characters'),
});

/** Answers one team question as the chosen AI executive and saves it. The answer is advisory only. */
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!await isAuthorized({token:req.cookies.get(SESSION_COOKIE)?.value,host:req.headers.get('host'),forwardedHost:req.headers.get('x-forwarded-host')}))
  return NextResponse.json({error:'Team passcode required'},{status:401});
 const id=z.string().uuid().safeParse((await params).id);
 if(!id.success)return NextResponse.json({error:'Invalid update ID'},{status:400});
 const body=Body.safeParse(await req.json().catch(()=>null));
 if(!body.success)return NextResponse.json({error:body.error.issues[0]?.message??'Invalid question'},{status:400});
 try{
  const client=db(),deps=defaultDeps();
  const {questionsPerHour}=limits();
  if(await countQuestionsSince(client,new Date(Date.now()-3_600_000).toISOString())>=questionsPerHour)
   return NextResponse.json({error:`Limit reached: ${questionsPerHour} questions per hour. Try again later.`},{status:429});
  const event=await deps.store.getEvent(id.data);
  if(!event)return NextResponse.json({error:'Update not found'},{status:404});
  const [analyses,decision,history]=await Promise.all([
   deps.store.getAnalyses(event.id),
   client.from('decisions').select('*').eq('event_id',event.id).maybeSingle<DecisionRow>(),
   deps.store.getHistory(event,8),
  ]);
  if(decision.error)throw new Error(`load decision: ${decision.error.code} ${decision.error.message}`);
  const answer=await answerQuestion({event,role:body.data.role,question:body.data.question,analyses,decision:decision.data,history},deps);
  const saved=await client.from('questions').insert({event_id:event.id,role:body.data.role,question:body.data.question,answer}).select('id').single();
  if(saved.error)throw new Error(`save question: ${saved.error.code} ${saved.error.message}`);
  return NextResponse.json({id:saved.data.id});
 }catch(e){
  const message=safeErrorMessage(e);
  console.error(`[questions] event ${id.data}: ${message}`);
  const missingTable=/PGRST205|42P01|questions/.test(message)&&/does not exist|Could not find/.test(message);
  return NextResponse.json({error:missingTable?'Database needs migration 005_questions.sql.':'Could not answer the question. Try again.'},{status:500});
 }
}
