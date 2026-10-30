// Browser walkthrough of the demo flow against a running `npm run dev` (uses installed Google Chrome).
// Usage: node scripts/e2e-demo.mjs [--submit]   (--submit runs one real analysis, ~8 OpenAI calls)
// Set E2E_PASSCODE when the target uses a team passcode (e.g. BASE_URL=https://your-app.vercel.app).
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright-core';

const BASE=process.env.BASE_URL??'http://localhost:3000';
const submit=process.argv.includes('--submit');
const out='.tmp/screens';mkdirSync(out,{recursive:true});
const problems=[];
const STUDENTS=['Josh Greiff','Mateo Del Toro','Aman Chugh','Griffin Lewis','Mikey Campbell','Emily Tang'];
const PASSCODE=process.env.E2E_PASSCODE;

const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')problems.push(`console.${m.type()}: ${m.text()}`)});
page.on('pageerror',e=>problems.push(`pageerror: ${e.message}`));
page.on('response',r=>{if(r.status()>=400&&r.status()!==409&&!(r.status()===401&&r.url().includes('/api/')))problems.push(`HTTP ${r.status()} ${r.url()}`)});
const step=msg=>console.log(`- ${msg}`);
async function checkEventView(){
 for(const s of ['Situation brief','Top proposed priorities','AI-proposed ·','Executive perspectives','Team decision'])
  if(!await page.getByText(s,{exact:false}).count())problems.push(`missing default content: ${s}`);
 await page.getByText('Full recommendation:').click();
 for(const s of ['Rationale','Alternatives considered','Tradeoffs','Executive disagreements','Key risks','Draft communications (not sent)'])
  if(!await page.getByRole('heading',{name:s,exact:true}).count())problems.push(`missing detail section: ${s}`);
 await page.getByText(/^›?All \d+ confirmed facts/).click();
 if(!await page.getByText('Original update').count())problems.push('original update not reachable');
 if(!await page.getByRole('button',{name:/^(Approve|Change decision)$/}).count())problems.push('team decision controls missing');
 step('event view: summary blocks present; full recommendation, facts and original update expand; team decision controls present');
}
const shot=async name=>{await page.screenshot({path:`${out}/${name}.png`,fullPage:true});step(`screenshot ${out}/${name}.png`)};

try{
 if(PASSCODE){
  const api=await page.request.post(`${BASE}/api/events/00000000-0000-4000-8000-000000000000/process`);
  step(`unauthenticated process API -> HTTP ${api.status()}`);
  if(api.status()!==401)problems.push(`process API without passcode returned ${api.status()}`);
  await page.goto(BASE,{waitUntil:'networkidle'});
  if(!page.url().includes('/login'))problems.push('dashboard reachable without passcode');
  await page.fill('input[name=passcode]','definitely-wrong');
  await page.getByRole('button',{name:'Enter command center'}).click();
  const err=page.locator('form p[role=alert]');await err.waitFor();
  step(`wrong passcode rejected: "${await err.innerText()}"`);
  await page.fill('input[name=passcode]',PASSCODE);
  await page.getByRole('button',{name:'Enter command center'}).click();
  await page.waitForURL(u=>!u.pathname.startsWith('/login'));
  step('signed in with team passcode');
 }
 await page.goto(BASE,{waitUntil:'networkidle'});
 step(`loaded: ${await page.locator('h1').innerText()}`);
 await shot('01-dashboard');

 if(await page.getByRole('tab').count()){
  await shot('01b-event-default');
  for(const role of STUDENTS){
   await page.getByRole('tab',{name:new RegExp(`^${role}`)}).click();
   const heading=await page.getByRole('tabpanel').locator('p').first().innerText();
   if(!heading.startsWith(role))problems.push(`card ${role} opened "${heading}"`);
   for(const s of ['Proposed recommendations','Risks','Confirmed facts','Stakeholder impacts','Case references'])
    if(!await page.getByRole('tabpanel').getByRole('heading',{name:s,exact:true}).count())problems.push(`${role} detail missing ${s}`);
  }
  step('all six executive cards (by student name) open their full analysis');
  await page.getByRole('tab',{name:/^Griffin Lewis/}).click();
  await shot('02-existing-event-cfo-open');
  await page.getByRole('tab',{name:/^Griffin Lewis/}).click();
  if(await page.getByRole('tabpanel').count())problems.push('clicking an open card did not close it');
  await checkEventView();
 }

 await page.getByRole('link',{name:'+ New crisis update'}).click();
 await page.waitForURL(/view=new/);
 await page.fill('input[name=subject]','Short');
 await page.fill('textarea[name=body]','too short');
 await page.getByRole('button',{name:'Analyze Crisis'}).click();
 await page.waitForTimeout(500);
 const msg=await page.locator('textarea[name=body]').evaluate(el=>el.validationMessage);
 const kept=await page.inputValue('textarea[name=body]');
 step(`validation blocks short update: "${msg}" (text kept: ${kept==='too short'}, still on form: ${page.url().includes('view=new')})`);
 if(!msg)problems.push('short update was not blocked by validation');
 if(kept!=='too short')problems.push('form lost text after validation error');
 await shot('03-validation-error');

 if(submit){
  await page.getByRole('button',{name:'Fill sample update'}).click();
  await page.fill('input[name=subject]',`Demo check ${new Date().toLocaleTimeString()}: convoy anomaly on I-70`);
  const t0=Date.now();
  await page.getByRole('button',{name:'Analyze Crisis'}).click();
  await page.waitForURL(/event=/,{timeout:30_000});
  step(`submitted; navigated to ${page.url()}`);
  if(!await page.getByText('Practice · not part of the simulation record').count())problems.push('sample update not labeled as practice');
  await page.getByText('Analysis in progress').waitFor({timeout:15_000});
  await shot('04-in-progress');
  const seen=new Set();
  while(Date.now()-t0<180_000){
   const chip=await page.locator('text=/\\d of 6 complete/').first().innerText().catch(()=>'');
   if(chip&&!seen.has(chip)){seen.add(chip);step(`progress: ${chip} at ${((Date.now()-t0)/1000).toFixed(0)}s`)}
   if(await page.getByText('AI-proposed · awaiting team review').count())break;
   if(await page.getByText('Analysis failed').count()){problems.push('analysis failed in browser run');break}
   await page.waitForTimeout(1000);
  }
  step(`finished after ${((Date.now()-t0)/1000).toFixed(0)}s`);
  await page.waitForTimeout(1500);
  const ready=await page.getByRole('tab').evaluateAll(ts=>ts.filter(t=>t.querySelector('[aria-label=ready]')).length);
  step(`executive tabs ready: ${ready}/6`);
  if(ready!==6)problems.push(`only ${ready}/6 tabs ready`);
  await checkEventView();
  await shot('05-completed');
  await page.getByRole('button',{name:'Approve',exact:true}).click();
  await page.getByText('AI-proposed · team approved').waitFor({timeout:15_000});
  step('Approve recorded; proposal now shows team approved');
  await page.getByRole('button',{name:'Change decision'}).click();
  await page.getByText('AI-proposed · awaiting team review').waitFor({timeout:15_000});
  step('Change decision returns it to awaiting review');
  await page.reload({waitUntil:'networkidle'});
  step(`after reload still shows event: ${page.url().includes('event=')}`);
 }
}catch(e){problems.push(`script error: ${e.message}`);await shot('99-error').catch(()=>{})}
finally{await browser.close()}

console.log(problems.length?`\nPROBLEMS (${problems.length}):\n${problems.join('\n')}`:'\nNo browser errors or broken interactions detected.');
process.exitCode=problems.length?1:0;
