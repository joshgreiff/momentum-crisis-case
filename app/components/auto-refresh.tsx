'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Re-renders the server dashboard while any event is still being analyzed. */
export function AutoRefresh({active,intervalMs=4000}:{active:boolean;intervalMs?:number}){
 const router=useRouter();
 useEffect(()=>{
  if(!active)return;
  const t=setInterval(()=>router.refresh(),intervalMs);
  return ()=>clearInterval(t);
 },[active,intervalMs,router]);
 return null;
}
