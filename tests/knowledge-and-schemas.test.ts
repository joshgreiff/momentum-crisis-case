import {describe,expect,it} from 'vitest';
import {zodTextFormat} from 'openai/helpers/zod';
import {loadKnowledge} from '../lib/knowledge';
import {AgentAnalysisSchema,DecisionSchema,ExtractionSchema} from '../lib/schemas';
import {isLocalConsoleAllowed} from '../lib/local-only';
import {safeErrorMessage} from '../lib/llm';

describe('knowledge library',()=>{
 it('loads the case, all lecture transcripts, and the convoy docx text from knowledge/',async()=>{
  const k=await loadKnowledge();
  const names=k.sources.map(s=>s.name);
  expect(names.filter(n=>/transcript\.txt$/.test(n))).toHaveLength(6);
  expect(names.some(n=>n.endsWith('.md')&&n.startsWith('Momentum case'))).toBe(true);
  const docx=k.sources.find(s=>s.name.endsWith('.docx'))!;
  expect(docx.kind).toBe('Exhibit document');
  expect(docx.text).toContain('Fleet size: 134,382 trucks');
  expect(k.prompt).toContain('MOMENTUM CASE – PART A');
  expect(k.prompt).toContain('75% of fleet and inventory');
  expect(k.prompt).not.toContain('[Music]');
  expect(await loadKnowledge()).toBe(k);
 });
});

describe('structured output schemas',()=>{
 it.each([['extraction',ExtractionSchema],['analysis',AgentAnalysisSchema],['decision',DecisionSchema]] as const)('%s converts to an OpenAI strict JSON schema',(_,schema)=>{
  const format=zodTextFormat(schema,'x');
  expect(format.strict).toBe(true);
  expect(format.schema).toMatchObject({type:'object',additionalProperties:false});
 });
 it('rejects analyses missing required sections',()=>{
  expect(AgentAnalysisSchema.safeParse({headline:'x'}).success).toBe(false);
 });
});

describe('local console guard',()=>{
 it.each([
  ['development','localhost:3000',null,true],
  ['development','127.0.0.1:3000',null,true],
  ['development','[::1]:3000',null,true],
  ['production','localhost:3000',null,false],
  ['development','192.168.1.20:3000',null,false],
  ['development','abc.ngrok.app',null,false],
  ['development','localhost:3000','abc.ngrok.app',false],
  ['development',null,null,false],
 ] as const)('env=%s host=%s forwarded=%s -> %s',(env,host,fwd,expected)=>{
  expect(isLocalConsoleAllowed(env,host,fwd)).toBe(expected);
 });
});

describe('safeErrorMessage',()=>{
 it('redacts API keys and JWTs',()=>{
  const msg=safeErrorMessage(new Error('bad key sk-proj-abc123def456ghi and eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoieCJ9.c2lnbmF0dXJl'));
  expect(msg).not.toMatch(/abc123def456/);
  expect(msg).not.toMatch(/eyJhbGci/);
 });
});
