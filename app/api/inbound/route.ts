import {NextRequest,NextResponse} from 'next/server';import {Resend} from 'resend';import {ingestUpdate} from '../../../lib/agents';import {supabaseStore} from '../../../lib/store';import {safeErrorMessage} from '../../../lib/llm';
export const runtime='nodejs';
// Stores verified inbound emails as instructor updates. Analysis starts from the dashboard (see /api/events/[id]/process).
export async function POST(req:NextRequest){
 const raw=await req.text();const secret=process.env.RESEND_WEBHOOK_SECRET;
 if(!secret)return NextResponse.json({error:'Webhook not configured'},{status:503});
 const resend=new Resend(process.env.RESEND_API_KEY);
 let event:any;try{event=resend.webhooks.verify({payload:raw,headers:{id:req.headers.get('svix-id')||'',timestamp:req.headers.get('svix-timestamp')||'',signature:req.headers.get('svix-signature')||''},webhookSecret:secret})}catch{return NextResponse.json({error:'Invalid signature'},{status:401})}
 if(event.type!=='email.received')return NextResponse.json({ok:true});
 const emailId=event.data?.email_id;if(!emailId)return NextResponse.json({error:'Missing email ID'},{status:400});
 const email=await resend.emails.receiving.get(emailId);if(email.error||!email.data)return NextResponse.json({error:'Email fetch failed'},{status:502});
 const item=email.data as any;const body=String(item.text||item.html?.replace(/<[^>]+>/g,' ')||'').slice(0,40000);
 try{
  const {duplicate}=await ingestUpdate({providerId:emailId,source:'email',subject:item.subject||'Untitled update',sender:item.from||'',body,isDemo:false},supabaseStore());
  return NextResponse.json({ok:true,duplicate});
 }catch(e){console.error(`[inbound] failed to store email ${emailId}: ${safeErrorMessage(e)}`);return NextResponse.json({error:'Database insert failed'},{status:500})}
}
