'use server';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {ingestUpdate,manualProviderId} from '../lib/agents';
import {submissionLimitError} from '../lib/limits';
import {safeErrorMessage} from '../lib/llm';
import {db} from '../lib/db';
import {supabaseStore} from '../lib/store';
import {teamAccess} from './access';

export type ActionState={status:'idle'|'queued'|'duplicate'|'error';message:string;eventId?:string};

const SubmissionSchema=z.object({
 subject:z.string().trim().min(3,'Subject must be at least 3 characters').max(200,'Subject is too long'),
 sender:z.string().trim().max(200,'Sender is too long'),
 body:z.string().trim().min(20,'Paste the full crisis update (at least 20 characters)').max(40_000,'Update is too long (40,000 characters max)'),
 kind:z.enum(['instructor','practice'],{errorMap:()=>({message:'Choose whether this is an instructor update or practice'})}),
});

/** Stores the update only. The dashboard then starts the analysis via /api/events/[id]/process. */
export async function submitCrisisUpdate(_prev:ActionState,form:FormData):Promise<ActionState>{
 if(!(await teamAccess()).allowed)return {status:'error',message:'Team sign-in required.'};
 const parsed=SubmissionSchema.safeParse({subject:form.get('subject')??'',sender:form.get('sender')??'',body:form.get('body')??'',kind:form.get('kind')??''});
 if(!parsed.success)return {status:'error',message:parsed.error.issues.map(i=>i.message).join('. ')};
 const {subject,sender,body,kind}=parsed.data;
 try{
  const store=supabaseStore();
  const limited=await submissionLimitError(store);
  if(limited)return {status:'error',message:limited};
  const {id,duplicate}=await ingestUpdate({providerId:manualProviderId(subject,body),source:'manual',subject,sender:sender||'Team submission',body,isDemo:kind==='practice'},store);
  if(duplicate)return {status:'duplicate',message:'This exact update was already submitted. Showing the existing analysis instead.',eventId:id};
  revalidatePath('/');
  return {status:'queued',message:'Update saved. Starting analysis…',eventId:id};
 }catch(e){
  console.error(`[actions] submit failed: ${safeErrorMessage(e)}`);
  return {status:'error',message:'Could not save the update. Check the server logs for details.'};
 }
}

const TeamDecisionSchema=z.object({id:z.string().uuid(),status:z.enum(['approved','rejected','pending'])});

/** Records the team's human decision on a proposal. It only updates the status; nothing is sent or executed. */
export async function recordTeamDecision(id:string,status:'approved'|'rejected'|'pending'):Promise<{error?:string}>{
 if(!(await teamAccess()).allowed)return {error:'Team sign-in required.'};
 const parsed=TeamDecisionSchema.safeParse({id,status});
 if(!parsed.success)return {error:'Invalid decision.'};
 const r=await db().from('decisions').update({status:parsed.data.status,decided_at:parsed.data.status==='pending'?null:new Date().toISOString()}).eq('id',parsed.data.id).select('id');
 if(r.error){
  console.error(`[actions] record decision failed: ${r.error.code} ${r.error.message}`);
  return {error:'Could not record the decision. Try again.'};
 }
 if(!r.data?.length)return {error:'Proposal not found.'};
 revalidatePath('/');
 return {};
}
