import OpenAI from 'openai';
import {zodTextFormat} from 'openai/helpers/zod';
import type {z} from 'zod';

export type StructuredRequest<S extends z.ZodTypeAny>={
 schema:S;
 name:string;
 /** System messages, most stable first so OpenAI prompt caching can reuse the shared prefix across agents. */
 instructions:string[];
 input:string;
};
export interface Llm{structured<S extends z.ZodTypeAny>(req:StructuredRequest<S>):Promise<z.infer<S>>}

export function safeErrorMessage(e:unknown):string{
 const msg=e instanceof Error?e.message:String(e);
 return msg.replace(/\b(sk|re|whsec)[-_][A-Za-z0-9_\-*]{6,}/g,'$1-[redacted]').replace(/eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g,'[redacted-jwt]').slice(0,1000);
}

let client:OpenAI|null=null;

export function openAiLlm():Llm{
 const apiKey=process.env.OPENAI_API_KEY;
 if(!apiKey)throw new Error('OPENAI_API_KEY is not configured');
 // Three sequential stages × (45s + one retry) stays under the 300s serverless limit in the worst case.
 client??=new OpenAI({apiKey,timeout:45_000,maxRetries:1});
 const openai=client;
 const model=process.env.OPENAI_MODEL||'gpt-4.1-mini';
 return {
  async structured({schema,name,instructions,input}){
   const res=await openai.responses.parse({
    model,
    input:[...instructions.map(content=>({role:'system' as const,content})),{role:'user' as const,content:input}],
    text:{format:zodTextFormat(schema,name)},
   });
   if(res.output_parsed==null)throw new Error(`Model returned no structured output for ${name} (status: ${res.status})`);
   return schema.parse(res.output_parsed);
  },
 };
}
