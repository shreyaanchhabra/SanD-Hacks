import {test,expect} from '@playwright/test';
import path from 'node:path';
import {writeFileSync} from 'node:fs';
import {createService} from '../../src/service.js';
import {createApi} from '../../src/api.js';
async function setup(page, planner?, revealClosed = true, speech?, follow = false, failAutoOnce = false, sources?) {
 const service=createService({...(planner?{planner}:{}),...(speech?{speech}:{}),...(sources?{sources}:{})});const api=createApi({token:'test',service});const storage={};const calls=[];let automaticFailures=0;
 await page.exposeFunction('extensionRpc',async message=>{
  calls.push(message);
  let result;
  if(message.type==='follow-status')result={enabled:follow};
  else if(message.type==='api'){
   if(failAutoOnce&&message.automatic&&message.path.endsWith('/events')&&automaticFailures++===0)return{ok:false,error:'Temporary network failure'};
   const response=await api(new Request('http://127.0.0.1:4313'+message.path,{method:message.body?'POST':'GET',headers:{Authorization:'Bearer test','Content-Type':'application/json'},...(message.body?{body:JSON.stringify(message.body)}:{})}));
   result=await response.json();if(result.runId){storage.state=result;storage.task=message.body?.task||storage.task||result.task;storage.autoFollow=follow;}if(!response.ok)return{ok:false,error:result.error};
  }else if(message.type==='load')result=storage;
  else if(message.type==='save'){storage.state=message.state;storage.task=message.task;storage.autoFollow=message.autoFollow;storage.keepStill=message.keepStill;result={};}
  else if(message.type==='reset'){delete storage.state;result={};}
  else if(message.type==='capture')result={data:'data:image/png;base64,'+(await page.screenshot()).toString('base64')};
  return{ok:true,result};
 });
 await page.addInitScript(reveal=>{
  if(reveal){const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(options){return attach.call(this,{...options,mode:'open'});};}
  globalThis.chrome={storage:{local:{get:async()=>({}),set:async()=>{}}},runtime:{getURL:p=>location.origin+'/'+p,onMessage:{addListener(){}},sendMessage:message=>globalThis.extensionRpc(message)}};
 },revealClosed);
 await page.goto('http://127.0.0.1:4320');
 const injectGuide=async()=>{await page.addStyleTag({path:path.resolve('../combined-extension/tools.css')});
 for(const file of ['fingerprint.js','page-map.js','tools.js','guide.js'])await page.addScriptTag({path:path.resolve('../combined-extension',file)});
 };await injectGuide();
 if(revealClosed)await expect(page.locator('#accesspatch-guide').getByText('Demo mode:',{exact:false})).toBeVisible();
 return {calls,storage,injectGuide};
}
async function expandMore(page){const more=page.locator('#accesspatch-guide .more');if(!await more.evaluate(el=>el.open))await more.locator('summary').click();}
test('one panel connects the mascot bubble, page mapper, Mastra and reversible highlight',async({page})=>{
 const {calls}=await setup(page);const guide=page.locator('#accesspatch-guide');
 await guide.getByLabel('Your task').fill('Help with my energy bill');

 await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.locator('.bubble')).toContainText('Select “Energy bill assistance”.');
 await expect(guide.locator('exode-mascot')).toHaveCount(1);
 await expect(page.locator('#accesspatch-companion-root')).toBeHidden();
 if(process.env.CAPTURE_EVIDENCE) await page.screenshot({path:'/tmp/accesspatch-unified-guide.png'});
 const body=calls.find(c=>c.path==='/api/tasks').body;
 expect(JSON.stringify(body)).not.toMatch(/PRIVATE_CANARY|Page tools|Share context/);
 await guide.getByRole('button',{name:'Show me',exact:true}).click();await expect(page.locator('#energy')).toHaveCSS('outline-style','solid');
 await expandMore(page);await guide.getByRole('button',{name:'Explain more',exact:true}).click();await expect(guide.locator('.explain')).toBeVisible();
 await expandMore(page);await guide.getByRole('button',{name:'Pause',exact:true}).click();await expect(guide.locator('.bubble')).toContainText('paused');
 await expect(page.locator('#energy')).toHaveCSS('outline-style','dotted');
 expect(calls.filter(c=>c.type==='capture')).toHaveLength(0);
});
test('screenshot cancel sends nothing; only the previewed crop reaches planning once',async({page})=>{
 const images=[];
 const {calls,storage}=await setup(page,async input=>{images.push(input.screenshot);return{kind:'guidance',instruction:'Read the heading in your crop.',explanation:'Visual guidance for the selected region.',visualObservation:'The crop shows an energy assistance heading.',targetId:input.screenshot?null:input.snapshot.elements[0].id,sourceIds:[],expectedOutcome:'user-confirmation'};});
 const guide=page.locator('#accesspatch-guide');await guide.getByLabel('Your task').fill('Explain this form');
 await expandMore(page);await guide.getByRole('button',{name:'Help with what I’m seeing',exact:true}).click();
 await expect(guide.getByRole('dialog')).toBeVisible();
 await guide.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(calls.filter(c=>c.path==='/api/tasks')).toHaveLength(0);
 await expandMore(page);await guide.getByRole('button',{name:'Help with what I’m seeing',exact:true}).click();
 await guide.getByLabel('Left',{exact:true}).fill('0');await guide.getByLabel('Top',{exact:true}).fill('0');
 await guide.getByLabel('Width',{exact:true}).fill('250');await guide.getByLabel('Height',{exact:true}).fill('40');
 await expect(guide.getByRole('button',{name:'Share crop & ask guide'})).toBeDisabled();
 await guide.getByRole('button',{name:'Preview crop',exact:true}).click();
 const preview=guide.getByAltText('Exact crop that will be shared');await expect(preview).toBeVisible();
 await expect.poll(()=>preview.evaluate(img=>img.naturalWidth)).toBe(250);
 if(process.env.CAPTURE_EVIDENCE){const data=await preview.getAttribute('src');writeFileSync('/tmp/accesspatch-approved-crop.jpg',Buffer.from(data.split(',')[1],'base64'));}
 await guide.getByRole('button',{name:'Share crop & ask guide'}).click();
 await expect(guide.locator('.bubble')).toContainText('Read the heading in your crop.');
 await expect(guide.getByLabel('Screenshot analysis')).toContainText('Image analyzed');
 await expect(guide.getByLabel('Screenshot analysis')).toContainText('energy assistance heading');
 expect(images).toHaveLength(1);expect(images[0].consent).toBe(true);
 expect(JSON.stringify(storage)).not.toContain(images[0].data);
 await expect(guide.getByRole('button',{name:'Show me',exact:true})).toBeDisabled();
});
test('delayed guide replies are withheld after a structural page change',async({page})=>{
 let release;const waiting=new Promise(resolve=>{release=resolve;});
 const {calls}=await setup(page,async input=>{await waiting;return{kind:'guidance',instruction:'STALE_GUIDANCE',explanation:'Old label',targetId:input.snapshot.elements[0].id,sourceIds:[],expectedOutcome:'navigation'};});
 const guide=page.locator('#accesspatch-guide');await guide.getByLabel('Your task').fill('energy bill');
 await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect.poll(()=>calls.some(c=>c.path==='/api/tasks')).toBe(true);
 await page.locator('#energy').evaluate(el=>{el.textContent='Changed link';});release();
 await expect(guide.locator('.bubble')).toContainText('page changed');
 await expect(guide.locator('.bubble')).not.toContainText('STALE_GUIDANCE');
 await expect(guide.getByRole('button',{name:'Show me',exact:true})).toBeDisabled();
});
test('a cropped screenshot becomes invalid after scrolling before approval',async({page})=>{
 const {calls}=await setup(page);const guide=page.locator('#accesspatch-guide');
 await guide.getByLabel('Your task').fill('Explain this form');
 await expandMore(page);await guide.getByRole('button',{name:'Help with what I’m seeing',exact:true}).click();
 await guide.getByRole('button',{name:'Preview crop',exact:true}).click();
 await page.evaluate(()=>{document.body.style.minHeight='3000px';window.scrollTo(0,100);});
 await guide.getByRole('button',{name:'Share crop & ask guide'}).click();
 await expect(guide.locator('.status')).toContainText('page moved or changed');
 expect(calls.filter(c=>c.path==='/api/tasks')).toHaveLength(0);
});

test('host pages cannot inspect guide internals or synthesize screenshot approval',async({page})=>{
 const {calls}=await setup(page,undefined,false);
 expect(await page.locator('#accesspatch-guide').evaluate(el=>el.shadowRoot)).toBe(null);
 await page.locator('#accesspatch-guide').evaluate(el=>{el.dispatchEvent(new MouseEvent('click',{bubbles:true,composed:true}));});
 expect(calls.filter(c=>c.type==='capture')).toHaveLength(0);
});
test('synthetic button clicks cannot capture or send screenshots even with a leaked root',async({page})=>{
 const {calls}=await setup(page);const guide=page.locator('#accesspatch-guide');
 await guide.getByLabel('Your task').fill('Help with this form');
 await expandMore(page);await guide.getByRole('button',{name:'Help with what I’m seeing',exact:true}).evaluate(el=>el.click());
 expect(calls.filter(c=>c.type==='capture')).toHaveLength(0);
 await expandMore(page);await guide.getByRole('button',{name:'Help with what I’m seeing',exact:true}).click();
 await guide.getByRole('button',{name:'Preview crop',exact:true}).click();
 await guide.getByRole('button',{name:'Share crop & ask guide'}).evaluate(el=>el.click());
 expect(calls.filter(c=>c.path==='/api/tasks')).toHaveLength(0);
 await expect(guide.getByRole('dialog')).toBeVisible();
});

test('visual replies are withheld when a form answer changes during planning',async({page})=>{
 let release;const wait=new Promise(resolve=>{release=resolve;});
 const {calls}=await setup(page,async()=>{await wait;return{kind:'guidance',instruction:'STALE_VISUAL_REPLY',explanation:'Visual details',targetId:null,sourceIds:[],expectedOutcome:'user-confirmation'};});
 const guide=page.locator('#accesspatch-guide');await guide.getByLabel('Your task').fill('Explain this form');
 await expandMore(page);await guide.getByRole('button',{name:'Help with what I’m seeing',exact:true}).click();
 await guide.getByRole('button',{name:'Preview crop',exact:true}).click();
 await guide.getByRole('button',{name:'Share crop & ask guide'}).click();
 await expect.poll(()=>calls.some(c=>c.path==='/api/tasks')).toBe(true);
 await page.locator('#household').fill('changed answer');release();
 await expect(guide.locator('.bubble')).toContainText('page changed');
 await expect(guide.locator('.bubble')).not.toContainText('STALE_VISUAL_REPLY');
});
test('late speech responses cannot overlap and pause cancels pending playback',async({page})=>{
 const pending=[];
 await setup(page,undefined,true,{mode:'test',speak:()=>new Promise(resolve=>pending.push(resolve))});
 const guide=page.locator('#accesspatch-guide');await guide.getByLabel('Your task').fill('energy bill');
 await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.locator('.bubble')).toContainText('Select');
 await page.evaluate(()=>{globalThis.playCount=0;globalThis.Audio=class{constructor(){}pause(){}play(){globalThis.playCount++;return Promise.resolve();}};});
 await expandMore(page);await guide.getByRole('button',{name:'Read aloud',exact:true}).click();
 await expandMore(page);await guide.getByRole('button',{name:'Read aloud',exact:true}).click();
 await expect.poll(()=>pending.length).toBe(2);
 pending[1]({status:'ready',audioBase64:'SUQzAQ=='});await expect.poll(()=>page.evaluate(()=>globalThis.playCount)).toBe(1);
 pending[0]({status:'ready',audioBase64:'SUQzAQ=='});
 await expandMore(page);await guide.getByRole('button',{name:'Read aloud',exact:true}).click();
 await expect.poll(()=>pending.length).toBe(3);
 await expandMore(page);await guide.getByRole('button',{name:'Pause',exact:true}).click();
 pending[2]({status:'ready',audioBase64:'SUQzAQ=='});
 await expect(guide.locator('.bubble')).toContainText('paused');
 expect(await page.evaluate(()=>globalThis.playCount)).toBe(1);
});
test('one tools menu and a separate left mascot travel beside a target without covering it',async({page})=>{
 await setup(page);const guide=page.locator('#accesspatch-guide');
 expect(await page.evaluate(()=>document.getElementById('accesspatch-companion-root'))).toBe(null);
 await expect(guide.getByRole('button',{name:'Page tools',exact:true})).toHaveCount(0);
 await guide.getByRole('button',{name:'Tools & settings',exact:true}).click();
 await guide.getByText('Reading preferences',{exact:true}).click();
 await expect(guide.getByRole('button',{name:'Easy Read',exact:true})).toBeVisible();
 await guide.getByRole('button',{name:'Tools & settings',exact:true}).click();
 const home=await guide.locator('.companion').boundingBox();expect(home.x).toBeLessThan(50);
 await guide.getByLabel('Your task').fill('energy bill');
 await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.locator('.bubble')).toContainText('Select');
 await guide.getByRole('button',{name:'Show me',exact:true}).click();
 await expect(guide.locator('.companion')).toHaveAttribute('data-location','target');
 const target=await page.locator('#energy').boundingBox();
 await expect.poll(async()=>{const box=await guide.locator('.companion').boundingBox();return box.x>=target.x+target.width||box.x+box.width<=target.x||box.y>=target.y+target.height||box.y+box.height<=target.y;}).toBe(true);
 await expect(guide.locator('exode-mascot')).toHaveAttribute('follow','true');
 await expect(guide.locator('exode-mascot')).toHaveAttribute('gaze-x',/\d/);
 await expect.poll(()=>guide.locator('.companion').evaluate(el=>Math.abs(el.getBoundingClientRect().left-parseFloat(el.style.left))<1&&Math.abs(el.getBoundingClientRect().top-parseFloat(el.style.top))<1)).toBe(true);
 if(process.env.CAPTURE_EVIDENCE) await page.screenshot({path:'/tmp/accesspatch-mascot-at-target.png'});
 expect(await page.evaluate(()=>globalThis.clicked)).toBeUndefined();
 await page.locator('#energy').evaluate(el=>el.remove());
 await expect(guide.locator('.companion')).toHaveAttribute('data-location','home');
});
test('reduced motion keeps the mascot stationary and disables pointer animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await setup(page);const guide=page.locator('#accesspatch-guide');
 await guide.getByLabel('Your task').fill('energy bill');
 await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.locator('.bubble')).toContainText('Select');
 await guide.getByRole('button',{name:'Show me',exact:true}).click();
 await expect(guide.locator('.companion')).toHaveAttribute('data-location','home');
 await expect(guide.locator('exode-mascot')).toHaveAttribute('follow','false');
 await expect(page.locator('#energy')).toHaveCSS('outline-style','solid');
});
test('mascot continuation reviews before sharing and stuck questions reach planning',async({page})=>{
 const seen=[];
 const {calls}=await setup(page,async input=>{seen.push(input);return{kind:'guidance',instruction:'Select Energy bill assistance.',explanation:'Test explanation',targetId:input.snapshot.elements[0].id,sourceIds:[],expectedOutcome:'navigation'};});
 const guide=page.locator('#accesspatch-guide');await guide.getByLabel('Your task').fill('energy bill');
 await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.locator('.bubble')).toContainText('Select');
 await guide.getByRole('button',{name:'Continue',exact:true}).click();
 await expect.poll(()=>calls.filter(c=>c.path?.endsWith('/events')).length).toBe(1);
 await expect(guide.getByRole('button',{name:'Continue',exact:true})).toBeVisible();
 await expect.poll(()=>seen.length).toBe(2);
 await expandMore(page);await guide.getByRole('button',{name:'I’m stuck',exact:true}).click();
 await guide.getByLabel('Your answer',{exact:true}).fill('What does assistance mean here?');
 await guide.getByRole('button',{name:'Continue',exact:true}).click();
 await expect.poll(()=>seen.length).toBe(3);
 expect(seen[2].history.join(' ')).toContain('What does assistance mean here?');
});
test('a manual still setting prevents travel and tools are in one keyboard-operable menu',async({page})=>{
 await setup(page);const guide=page.locator('#accesspatch-guide');
 await guide.getByRole('button',{name:'Tools & settings',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(guide.getByRole('region',{name:'Page tools and settings'})).toBeVisible();
 await guide.getByLabel('Keep mascot still', {exact:true}).check();
 await expect(guide.locator('exode-mascot')).toHaveAttribute('still','');
 await expect(guide.locator('exode-mascot')).toHaveAttribute('follow','false');
 await guide.getByRole('button',{name:'Tools & settings',exact:true}).click();
 await guide.getByRole('button',{name:'Talk to your companion',exact:true}).click();
 await expect(guide.getByLabel('Conversation with your guide',{exact:true})).toBeHidden();
 await guide.getByRole('button',{name:'Talk to your companion',exact:true}).click();
 await expect(guide.getByLabel('Your task',{exact:true})).toBeFocused();
});

test('reduced-motion mascot still renders after its animation asset loads late',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 let release;const waiting=new Promise(resolve=>{release=resolve;});
 await page.route('**/files/ip-2016.bexode',async route=>{await waiting;await route.continue();});
 await setup(page);const guide=page.locator('#accesspatch-guide');
 await expect(guide.locator('exode-mascot')).toHaveAttribute('still','');release();
 await expect.poll(()=>guide.locator('exode-mascot canvas').evaluate(canvas=>{if(!canvas.width||!canvas.height)return false;const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)return true;return false;})).toBe(true);
});
test('narrow screens keep a bottom-left target operable when the bubble cannot fit',async({page})=>{
 await page.setViewportSize({width:390,height:700});await setup(page);const guide=page.locator('#accesspatch-guide');
 await page.locator('#energy').evaluate(el=>{el.style.position='fixed';el.style.left='10px';el.style.bottom='20px';});
 await guide.getByLabel('Your task').fill('energy bill');
 await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.locator('.bubble')).toContainText('Select');
 await guide.getByRole('button',{name:'Show me',exact:true}).click();
 await expect(page.locator('#energy')).toHaveCSS('outline-style','solid');
 await page.locator('#energy').click({trial:true}); // Hit testing must reach the real target, without activating it.
 await guide.getByRole('button',{name:'Tools & settings',exact:true}).click();
 await guide.getByRole('button',{name:'Show companion',exact:true}).click();
 await expect(guide.getByLabel('Conversation with your guide',{exact:true})).toBeVisible();
});
test('stationary mode moves the bubble aside when the highlighted target is underneath it',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await setup(page);const guide=page.locator('#accesspatch-guide');
 await page.locator('#energy').evaluate(el=>{el.style.position='fixed';el.style.left='20px';el.style.bottom='30px';});
 await guide.getByLabel('Your task').fill('energy bill');
 await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.locator('.bubble')).toContainText('Select');await guide.getByRole('button',{name:'Show me',exact:true}).click();
 await page.locator('#energy').click({trial:true});
 await expect(guide.locator('.companion')).toHaveAttribute('data-location','home');
});

test('linked-page navigation automatically continues the original task without another start click',async({page})=>{
 const {calls,storage,injectGuide}=await setup(page,undefined,true,undefined,true);
 const guide=page.locator('#accesspatch-guide');await guide.getByLabel('Your task').fill('Help with my energy bill');
 await guide.getByRole('button',{name:'Start guiding',exact:true}).click();await expect(guide.locator('.bubble')).toContainText('Select');
 const runId=storage.state.runId;
 await page.locator('#energy').click();await page.waitForURL('**/form?**');await injectGuide();
 await expect(guide.locator('.bubble')).toContainText('Read the instructions beside “Household”.');
 expect(storage.state.runId).toBe(runId);expect(calls.filter(c=>c.path==='/api/tasks')).toHaveLength(1);
 expect(calls.find(c=>c.body?.type==='navigation-observed')).toBeTruthy();
});
test('same-page route changes continue automatically but pause prevents another model call',async({page})=>{
 const {calls}=await setup(page,undefined,true,undefined,true);const guide=page.locator('#accesspatch-guide');
 await guide.getByLabel('Your task').fill('energy bill');await guide.getByRole('button',{name:'Start guiding',exact:true}).click();await expect(guide.locator('.bubble')).toContainText('Select');
 await page.evaluate(()=>{document.getElementById('energy').remove();history.pushState({},'', '/form');});
 await expect(guide.locator('.bubble')).toContainText('Read the instructions beside “Household”.');
 await expandMore(page);await guide.getByRole('button',{name:'Pause',exact:true}).click();const count=calls.filter(c=>c.body?.type==='navigation-observed'||c.body?.type==='page-updated').length;
 await page.locator('h1').evaluate(el=>el.textContent='Changed while paused');
 await expect(guide.locator('.bubble')).toContainText('paused');
 expect(calls.filter(c=>c.body?.type==='navigation-observed'||c.body?.type==='page-updated')).toHaveLength(count);
});

test('cross-origin linked pages retain the task and deliver the next instruction automatically',async({page})=>{
 const {storage,injectGuide}=await setup(page,undefined,true,undefined,true);const guide=page.locator('#accesspatch-guide');
 await page.locator('#energy').evaluate(el=>el.href='http://localhost:4320/form');
 await guide.getByLabel('Your task').fill('energy bill');await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.locator('.bubble')).toContainText('Select');const runId=storage.state.runId;
 await page.locator('#energy').click();await page.waitForURL('http://localhost:4320/form');await injectGuide();
 await expect(guide.locator('.bubble')).toContainText('Household');expect(storage.state.runId).toBe(runId);
});

test('automatic continuation retries a temporary failure without forgetting the goal',async({page})=>{
 const {calls}=await setup(page,undefined,true,undefined,true,true);const guide=page.locator('#accesspatch-guide');
 await guide.getByLabel('Your task').fill('energy bill');await guide.getByRole('button',{name:'Start guiding',exact:true}).click();await expect(guide.locator('.bubble')).toContainText('Select');
 await page.evaluate(()=>{document.getElementById('energy').remove();history.pushState({},'', '/form');});
 await expect(guide.locator('.bubble')).toContainText('Household',{timeout:12000});
 expect(calls.filter(c=>c.automatic&&c.path?.endsWith('/events')).length).toBe(2);
});

test('page compass shows concise distinct destinations instead of repeating section text',async({page})=>{
 const {calls}=await setup(page);const guide=page.locator('#accesspatch-guide');
 await page.evaluate(()=>{const main=document.createElement('main');main.innerHTML='<section><h2>Money and credit</h2><a href="/money"><h3>Money and credit</h3><p>Find government grants, loans, and taxes information.</p></a></section><section><h2>Taxes</h2><a href="/taxes"><h3>Taxes</h3><p>Learn about filing federal income tax. Find out how to pay and check your refund.</p></a></section><nav><a href="/taxes">Taxes</a></nav>';document.body.append(main);});
 await guide.getByRole('button',{name:'Tools & settings',exact:true}).click();
 await guide.getByLabel('Find a place on this page',{exact:true}).fill('taxes');await guide.getByRole('button',{name:'Find on page',exact:true}).click();
 const titles=await guide.locator('.apc-title').allTextContents();expect(titles.filter(t=>t==='Taxes')).toHaveLength(1);expect(titles.every(t=>t.length<97)).toBe(true);
 expect(titles.some(t=>t.includes('Learn about filing'))).toBe(false);await expect(guide.getByRole('button',{name:'Show Taxes',exact:true})).toHaveCount(1);
 const before=await page.url();await guide.getByRole('button',{name:'Show Taxes',exact:true}).click();expect(page.url()).toBe(before);
 expect(calls.filter(c=>c.path&&c.path!=='/api/health')).toHaveLength(0);
 if(process.env.CAPTURE_EVIDENCE)await page.screenshot({path:'/tmp/accesspatch-page-compass.png'});
});
test('form shortcuts locate required and invalid fields locally without model calls',async({page})=>{
 const {calls}=await setup(page);const guide=page.locator('#accesspatch-guide');
 await page.locator('#household').evaluate(el=>{el.required=true;el.setAttribute('aria-invalid','true');});
 await guide.getByRole('button',{name:'Tools & settings',exact:true}).click();await guide.getByRole('button',{name:'Find required fields',exact:true}).click();
 await expect(guide.getByRole('button',{name:'Show Household',exact:true})).toBeVisible();
 await guide.getByRole('button',{name:'Find visible errors',exact:true}).click();await expect(guide.getByRole('button',{name:'Show Household',exact:true})).toBeVisible();
 expect(calls.filter(c=>c.path&&c.path!=='/api/health')).toHaveLength(0);
});
test('observed evidence and expected progress are distinct from the suggested instruction',async({page})=>{
 await setup(page,async input=>({kind:'guidance',instruction:'Read Household.',explanation:'This field groups household information.',targetId:input.snapshot.elements[0].id,sourceIds:[],expectedOutcome:'user-confirmation',observations:[{text:'The page contains a Household field.',basis:'page',elementId:null}],changeSummary:null,completionEvidence:{type:'user-confirmation',description:'The person confirms reading the label.',elementId:null}}));
 const guide=page.locator('#accesspatch-guide');await guide.getByLabel('Your task').fill('Explain this form');await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.locator('.bubble')).toContainText('Read Household.');await guide.getByText('Why this step?',{exact:true}).click();
 await expect(guide.getByLabel('Observed page facts')).toContainText('contains a Household field');await expect(guide.locator('.reasoning')).toContainText('What to look for:');
});
test('same-name fields remain distinct across form groups in local search',async({page})=>{
 await setup(page);const guide=page.locator('#accesspatch-guide');
 await page.evaluate(()=>{const form=document.createElement('form');form.innerHTML='<fieldset><legend>Applicant</legend><label for="adult-name">First name</label><input id="adult-name"></fieldset><fieldset><legend>Child</legend><label for="child-name">First name</label><input id="child-name"></fieldset>';document.body.append(form);});
 await guide.getByRole('button',{name:'Tools & settings',exact:true}).click();await guide.getByLabel('Find a place on this page').fill('first name');await guide.getByRole('button',{name:'Find on page',exact:true}).click();
 await expect(guide.getByRole('button',{name:'Show First name in Applicant',exact:true})).toBeVisible();await expect(guide.getByRole('button',{name:'Show First name in Child',exact:true})).toBeVisible();
});

test('mascot renders a cited preparation checklist with source evidence',async({page})=>{
 await setup(page,async input=>({kind:'guidance',instruction:'Read the Household label.',explanation:'Preparation help from the supplied demo source.',targetId:input.snapshot.elements[0].id,sourceIds:[input.sources[0].id],checklist:[{text:'Read the listed preparation requirements.',sourceId:input.sources[0].id}],expectedOutcome:'user-confirmation'}));
 const guide=page.locator('#accesspatch-guide');await guide.getByLabel('Your task').fill('What documents are required for energy assistance?');await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await guide.getByText('Preparation checklist',{exact:true}).click();await expect(guide.getByLabel('Preparation checklist')).toContainText('Read the listed preparation requirements.');
 await guide.getByText('Sources & instructions',{exact:true}).click();await expect(guide.getByLabel('Sources & instructions')).toContainText('Retrieved');await expect(guide.getByLabel('Sources & instructions').locator('a')).toHaveAttribute('href',/https:/);
});

test('external retrieval failure is visible beside the mascot while page guidance remains usable',async({page})=>{
 const sources={mode:'configured',retrieveContext:async()=>{throw Error('private provider details');},outcomeFor:()=>({status:'provider-failure',message:'Bright Data restricts access to this public site. Page guidance still works.'})};
 await setup(page,async input=>({kind:'guidance',instruction:'Read Household.',explanation:'Use the original page instructions.',targetId:input.snapshot.elements[0].id,sourceIds:[],expectedOutcome:'user-confirmation'}),true,undefined,false,false,sources);
 const guide=page.locator('#accesspatch-guide');await guide.getByLabel('Your task').fill('What documents are required?');await guide.getByRole('button',{name:'Start guiding',exact:true}).click();
 await expect(guide.getByLabel('Public instructions status')).toContainText('restricts access');await expect(guide.locator('.bubble')).toContainText('Read Household.');await expect(guide.getByRole('button',{name:'Show me',exact:true})).toBeEnabled();await expect(guide.getByLabel('Preparation checklist')).toBeHidden();await expect(guide).not.toContainText('private provider details');
});
