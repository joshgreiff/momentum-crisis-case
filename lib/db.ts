import {createClient,type SupabaseClient} from '@supabase/supabase-js';

export type EventStatus='received'|'processing'|'analyzed'|'failed';
export type EventRow={id:string;provider_email_id:string;source:'email'|'manual';subject:string;sender:string|null;received_at:string;body:string;facts:unknown;assumptions:unknown;urgency:string;status:EventStatus;error:string|null;processing_started_at:string|null;attempts:number;is_demo:boolean};
export type AgentAnalysisRow={id:string;event_id:string;role:string;analysis:unknown;created_at:string};
export type DecisionRow={id:string;event_id:string;title:string;proposal:string;rationale:string|null;details:unknown;status:'pending'|'approved'|'rejected';decided_at:string|null;team_response?:string|null;created_at:string};

let warnedAboutPath=false;

// supabase-js appends /rest/v1 itself, so the client must receive the bare project origin.
function projectOrigin(raw:string){
 let url:URL;
 try{url=new URL(raw)}catch{throw new Error('NEXT_PUBLIC_SUPABASE_URL is not a valid URL')}
 if(url.protocol!=='https:'&&url.hostname!=='localhost'&&url.hostname!=='127.0.0.1')throw new Error('NEXT_PUBLIC_SUPABASE_URL must use https');
 if(url.pathname!=='/'&&!warnedAboutPath){warnedAboutPath=true;console.warn(`[db] NEXT_PUBLIC_SUPABASE_URL should be the project origin (${url.origin}); ignoring path "${url.pathname}"`)}
 return url.origin;
}

export function db():SupabaseClient{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const missing=[!url&&'NEXT_PUBLIC_SUPABASE_URL',!key&&'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean);
 if(!url||!key)throw new Error(`Missing Supabase environment: ${missing.join(', ')}`);
 return createClient(projectOrigin(url),key,{auth:{persistSession:false,autoRefreshToken:false}});
}
