import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {defaultDeps,runClaimed} from '../../../../../lib/agents';
import {SESSION_COOKIE,isAuthorized} from '../../../../../lib/auth';
import {limits} from '../../../../../lib/limits';
import {safeErrorMessage} from '../../../../../lib/llm';

export const runtime='nodejs';
export const maxDuration=300;

/**
 * Claims one stored update and runs the full analysis inside this request. The response is only sent
 * when the analysis has finished, so no work depends on the function running after it responds.
 * If the function is cut off, the event stays "processing", becomes reclaimable after 10 minutes
 * (claim_event), and the dashboard resumes it, up to MAX_ATTEMPTS_PER_UPDATE.
 */
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!await isAuthorized({token:req.cookies.get(SESSION_COOKIE)?.value,host:req.headers.get('host'),forwardedHost:req.headers.get('x-forwarded-host')}))
  return NextResponse.json({error:'Team passcode required'},{status:401});
 const id=z.string().uuid().safeParse((await params).id);
 if(!id.success)return NextResponse.json({error:'Invalid event ID'},{status:400});
 try{
  const deps=defaultDeps();
  const event=await deps.store.getEvent(id.data);
  if(!event)return NextResponse.json({error:'Update not found'},{status:404});
  if(event.status==='analyzed')return NextResponse.json({status:'analyzed'});
  const {maxAttempts}=limits();
  if(event.attempts>=maxAttempts)return NextResponse.json({error:`Retry limit reached (${maxAttempts} attempts) for this update.`},{status:429});
  const claimed=await deps.store.claimEvent(id.data);
  if(!claimed)return NextResponse.json({status:'busy',message:'Already being analyzed.'},{status:409});
  const result=await runClaimed(claimed,deps);
  return NextResponse.json(result,{status:result.status==='failed'?500:200});
 }catch(e){
  const message=safeErrorMessage(e);
  console.error(`[process] event ${id.data} could not start: ${message}`);
  return NextResponse.json({error:'Analysis could not start. Check server logs.'},{status:500});
 }
}
