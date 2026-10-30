'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';

export async function startProcessing(id:string):Promise<string|null>{
 const res=await fetch(`/api/events/${id}/process`,{method:'POST'});
 if(res.ok||res.status===409)return null;
 const body=await res.json().catch(()=>({}));
 return body.error??(res.status===500?'Analysis failed. See the update for details.':`Analysis request failed (${res.status}).`);
}

/**
 * Starts analysis for updates waiting in the database (new, emailed, or interrupted). The request stays
 * open until the analysis finishes; claim_event guarantees only one run even if several teammates have the page open.
 */
export function ProcessTrigger({eventIds}:{eventIds:string[]}){
 const router=useRouter();
 const started=useRef(new Set<string>());
 const [error,setError]=useState<string|null>(null);
 const key=eventIds.join(',');
 useEffect(()=>{
  for(const id of eventIds){
   if(started.current.has(id))continue;
   started.current.add(id);
   setTimeout(()=>router.refresh(),1500);
   startProcessing(id).then(err=>{if(err)setError(err);router.refresh()}).catch(()=>setError('Lost connection while analyzing. It will resume automatically, or use Retry.'));
  }
 },[key,router]);
 return error?<p role="alert" className="fixed bottom-4 right-4 z-10 max-w-sm rounded-md border border-red-200 bg-white p-3 text-sm text-red-800 shadow">{error} <button className="ml-2 text-xs underline" onClick={()=>setError(null)}>Dismiss</button></p>:null;
}
