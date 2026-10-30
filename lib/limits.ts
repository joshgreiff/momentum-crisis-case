import type {Store} from './store';

const num=(v:string|undefined,d:number)=>{const n=Number(v);return Number.isFinite(n)&&n>0?Math.floor(n):d};

export function limits(env:Record<string,string|undefined>=process.env){
 return {
  perHour:num(env.MAX_UPDATES_PER_HOUR,10),
  perDay:num(env.MAX_UPDATES_PER_DAY,40),
  maxAttempts:num(env.MAX_ATTEMPTS_PER_UPDATE,3),
  questionsPerHour:num(env.MAX_QUESTIONS_PER_HOUR,30),
 };
}

/** Caps new updates (each costs about 8 model calls). Counted in the database, so it holds across serverless instances. */
export async function submissionLimitError(store:Store,now=Date.now(),env:Record<string,string|undefined>=process.env):Promise<string|null>{
 const l=limits(env);
 const lastHour=await store.countEventsSince(new Date(now-3_600_000).toISOString());
 if(lastHour>=l.perHour)return `Limit reached: ${l.perHour} updates per hour. Try again later.`;
 const lastDay=await store.countEventsSince(new Date(now-86_400_000).toISOString());
 if(lastDay>=l.perDay)return `Limit reached: ${l.perDay} updates per 24 hours.`;
 return null;
}
