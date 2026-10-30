'use client';
import {useState,useTransition} from 'react';
import {recordTeamDecision} from '../actions';

type Status='approved'|'rejected'|'pending';

export function DecisionButtons({id,decided}:{id:string;decided:boolean}){
 const [pending,start]=useTransition();
 const [error,setError]=useState('');
 const record=(status:Status)=>start(async()=>{setError('');const r=await recordTeamDecision(id,status);if(r.error)setError(r.error)});
 const btn='rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50';
 return <div className="flex flex-col items-end gap-1">
  <div className="flex gap-2">
   {decided
    ?<button type="button" disabled={pending} onClick={()=>record('pending')} className={`${btn} border-slate-300 text-slate-700 hover:bg-slate-50`}>Change decision</button>
    :<>
     <button type="button" disabled={pending} onClick={()=>record('approved')} className={`${btn} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`}>Approve</button>
     <button type="button" disabled={pending} onClick={()=>record('rejected')} className={`${btn} border-red-300 text-red-700 hover:bg-red-50`}>Reject</button>
    </>}
  </div>
  {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
 </div>;
}
