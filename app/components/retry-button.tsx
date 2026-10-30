'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {startProcessing} from './process-trigger';

export function RetryButton({eventId}:{eventId:string}){
 const router=useRouter();
 const [pending,setPending]=useState(false);
 const [error,setError]=useState<string|null>(null);
 async function retry(){
  setPending(true);setError(null);
  const t=setTimeout(()=>router.refresh(),1500);
  try{setError(await startProcessing(eventId))}catch{setError('Lost connection. Refresh to check progress.')}
  finally{clearTimeout(t);setPending(false);router.refresh()}
 }
 return <div className="mt-3 flex flex-wrap items-center gap-3">
  <button type="button" onClick={retry} disabled={pending} className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">{pending?'Retrying…':'Retry analysis'}</button>
  <span className="text-xs text-slate-500">Re-runs only the steps that did not finish.</span>
  {error&&<span className="text-sm text-red-700">{error}</span>}
 </div>;
}
