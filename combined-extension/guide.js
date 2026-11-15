(() => {
 const automaticBoot=!!globalThis.__apAutomaticInjection;globalThis.__apAutomaticInjection=false;
 if(globalThis.__apGuide){if(!automaticBoot)globalThis.__apToggleConversation?.();return;}
 const host = document.createElement('div'); host.id = 'accesspatch-guide'; host.dataset.apcUi = 'true';
 Object.assign(host.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'2147483647' });
 const shadow = host.attachShadow({mode:'closed'}); globalThis.__apGuide = host;
 const style = document.createElement('style'); style.textContent = `
 :host{all:initial;color-scheme:light}*{box-sizing:border-box}[hidden]{display:none!important}
 .companion{position:absolute;z-index:1;left:20px;bottom:22px;width:min(500px,calc(100vw - 32px));font:18px/1.5 system-ui,sans-serif;color:#173957;display:flex;align-items:flex-end;gap:10px;pointer-events:none;transition:left .55s cubic-bezier(.2,.7,.2,1),top .55s cubic-bezier(.2,.7,.2,1)}
 .conversation{background:#fff;border:1px solid #b7cadd;border-radius:20px 20px 20px 5px;box-shadow:0 12px 36px #16375124;padding:18px;width:306px;min-width:0;pointer-events:auto;max-height:calc(100vh - 40px);overflow:auto}
 .mascot{width:180px;height:200px;flex:none;display:flex;align-items:flex-end;pointer-events:none}.mascot exode-mascot{width:180px;height:180px;pointer-events:none}
 .mascot-button{all:unset;display:block;pointer-events:auto;cursor:pointer;border-radius:24px}.mascot-button:focus-visible{outline:3px solid #bf7100;outline-offset:4px}
 .menu-bar{position:absolute;z-index:3;right:18px;top:18px;pointer-events:auto;font:16px/1.5 system-ui;color:#173957}.menu-bar>button{box-shadow:0 4px 18px #17395720;background:white}
 .menu{position:absolute;top:54px;right:0;margin-top:0;width:min(340px,calc(100vw - 36px));max-height:calc(100vh - 90px);overflow:auto;padding:20px;border:1px solid #b7cadd;border-radius:14px;background:#fff;box-shadow:0 10px 32px #16375124}
 h1{font:25px/1.2 Georgia,serif;margin:0 0 12px}h2{font:22px/1.3 Georgia,serif;margin:0 0 12px}p{margin:8px 0}label{display:block;font-weight:650;margin-top:10px}textarea,input{box-sizing:border-box;width:100%;font:inherit;padding:9px;border:1px solid #829cb8;border-radius:7px;background:white;color:#173957}textarea{resize:vertical}
 button{font:600 15px/1.4 system-ui;min-height:44px;padding:9px 12px;margin:4px 4px 4px 0;border:1px solid #a5bbd2;border-radius:9px;color:#173957;background:#f1f6fc;cursor:pointer}button.primary{background:#2354bd;color:white;border-color:#2354bd}button:disabled{opacity:.5;cursor:default}:focus-visible{outline:3px solid #bf7100;outline-offset:3px}.actions{display:flex;flex-wrap:wrap;gap:3px}.subtle,.status,.menu-notice{font-size:13px;color:#4c647c}.status{min-height:20px}.menu-notice{max-width:230px;background:white;padding:8px;border-radius:8px}.visual-result{font-size:14px;padding:10px;border-radius:8px;background:#edf6f1;margin-top:10px}.visual-badge{font-weight:700;color:#245a46}.more{border-top:1px solid #e2e9f0;margin-top:8px;padding-top:2px}.bubble{font-size:20px;line-height:1.5;font-weight:500;margin-bottom:12px}.explain{font-size:16px;border-top:1px solid #d5e0eb;padding-top:10px}pre{font:12px/1.5 monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;background:#f3f6fa;padding:10px}summary{cursor:pointer;font-weight:600;font-size:14px;margin:10px 0}.journey-input{margin-top:10px}.journey-input>button.primary{width:100%}.quiet-actions{display:flex;gap:4px;flex-wrap:wrap}.quiet-actions button{font-size:13px;background:white;border-color:transparent;text-decoration:underline}.tool-content .apc-panel{display:block}.tool-content input{font-size:16px}.tool-content .apc-results{padding-left:20px}.tool-content .apc-status{font-size:14px}.tool-content .apc-panel-header{display:none}.mode{display:flex;gap:8px;align-items:center;font-size:15px}.mode input{width:auto;min-width:20px;height:20px}
 .review{position:absolute;z-index:5;inset:20px;max-width:900px;max-height:calc(100vh - 40px);margin:auto;overflow:auto;pointer-events:auto;background:white;color:#173957;border:2px solid #2354bd;border-radius:12px;padding:24px;font:18px/1.5 system-ui;box-shadow:0 0 0 100vmax #102b4dbb}.review canvas{display:block;max-width:100%;height:auto;border:1px solid #a5bbd2;touch-action:none;cursor:crosshair}.crop-fields{display:flex;gap:12px;flex-wrap:wrap}.crop-fields label{font-size:14px}.crop-fields input{width:85px}.review h2{font:28px Georgia,serif}.small{font-size:13px}.review img{max-width:100%;max-height:200px;object-fit:contain}a{color:#174fae}.return{font-size:13px}
 @media(prefers-reduced-motion:reduce){.companion{transition:none!important}}@media(max-width:520px){.companion{left:10px;bottom:12px;width:calc(100vw - 24px);gap:4px}.mascot{width:88px;height:100px}.mascot exode-mascot{width:88px;height:88px}.conversation{width:calc(100% - 92px);padding:14px}.menu-bar{top:10px;right:10px}.review{inset:8px;padding:16px}}
 `;
 shadow.append(style);
 const make=(tag,text,parent,attrs={})=>{const el=document.createElement(tag);if(text)el.textContent=text;Object.assign(el,attrs);if(parent)parent.append(el);return el;};
 const menuBar=make('div',null,shadow,{className:'menu-bar'});
 const tools=make('button','Tools & settings',menuBar);tools.setAttribute('aria-expanded','false');
 const menuNotice=make('p','',menuBar,{className:'menu-notice',hidden:true});menuNotice.setAttribute('role','status');
 const menu=make('section',null,menuBar,{className:'menu',hidden:true});menu.setAttribute('aria-label','Page tools and settings');make('h2','Make this page yours',menu);
 const toolContent=make('div',null,menu,{className:'tool-content'});const mountedTools=globalThis.__apMountTools(toolContent);
 for(const button of mountedTools.querySelectorAll('button'))if(button.textContent==='Restore page')button.addEventListener('click',()=>{map({type:'restore'});returnHome();stopAudio();});
 const motionLabel=make('label',null,menu,{className:'mode'});const motion=make('input',null,motionLabel,{type:'checkbox'});motionLabel.append(document.createTextNode('Keep mascot still'));
 const analyticsLabel=make('label',null,menu,{className:'mode'});const analyticsConsent=make('input',null,analyticsLabel,{type:'checkbox'});analyticsLabel.append(document.createTextNode('Share anonymous help events (off by default)'));
 make('p','Only coarse help signals are sent. No page text, URLs, or form values are included.',menu,{className:'subtle'});
 const saveTask=make('button','Save this task',menu,{hidden:true});make('p','Saving stores your goal and milestone in Tiger Data until you delete it. Page details stay in this browser’s local checkpoint.',menu,{className:'subtle'});
 const savedDetails=make('details',null,menu);make('summary','Saved tasks',savedDetails);const savedList=make('div',null,savedDetails,{className:'actions'});const savedStatus=make('p','',savedDetails,{className:'subtle'});
 const footer=make('div',null,menu,{className:'actions'});const restore=make('button','Remove highlight',footer),reopen=make('button','Show companion',footer),reset=make('button','New task',footer),settings=make('button','Connection',footer),close=make('button','Hide companion',footer);
 const companion=make('section',null,shadow,{className:'companion'});companion.dataset.location='home';companion.setAttribute('aria-label','AccessPatch companion');
 const mascot=make('div',null,companion,{className:'mascot'});const mascotButton=make('button',null,mascot,{className:'mascot-button'});mascotButton.setAttribute('aria-label','Talk to your companion');mascotButton.title='Talk to your companion';
 const character=make('exode-mascot',null,mascotButton);character.setAttribute('src',chrome.runtime.getURL('files/ip-2016.bexode'));character.setAttribute('follow','true');character.setAttribute('aria-label','AccessPatch mascot');
 const panel=make('div',null,companion,{className:'conversation'});panel.setAttribute('aria-label','Conversation with your guide');
 const bubble=make('div','What would you like to do on this page?',panel,{className:'bubble'});bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
 const status=make('p','Connecting to your local guide…',panel,{className:'status'});status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const retry=make('button','Retry guidance',panel,{hidden:true});
 const actions=make('div',null,panel,{className:'actions'});
 const more=make('details',null,panel,{className:'more'});make('summary','More',more);const extra=make('div',null,more,{className:'actions'});
 const highlight=make('button','Show me',actions,{className:'primary'}),explain=make('button','Explain more',extra),repeat=make('button','Read aloud',extra),pause=make('button','Pause',extra);
 const explanation=make('p','',panel,{className:'explain',hidden:true});const sourceList=make('ul',null,panel);
 const journeyInput=make('div',null,panel,{className:'journey-input'});
 const taskLabel=make('label','What would you like to do?',journeyInput);const task=make('textarea',null,taskLabel,{rows:2,maxLength:2000,placeholder:'For example, find help with my energy bill'});
 const answerLabel=make('label','Your answer',journeyInput,{hidden:true});const answer=make('textarea',null,answerLabel,{rows:2,maxLength:2000});
 const inspect=make('button','Review this page',journeyInput,{hidden:true});
 const contextDetails=make('details',null,journeyInput);make('summary','Review what gets shared',contextDetails);const preview=make('pre','Review the page to see what will be shared.',contextDetails);make('p','Your approved context goes to Gemini. Keep private answers out.',contextDetails,{className:'subtle'});
 const send=make('button','Start guiding',journeyInput,{className:'primary'});const sharingNotice=make('p','Start shares page labels with Gemini. Entered values are excluded.',journeyInput,{className:'subtle'});
 const quiet=make('div',null,more,{className:'quiet-actions'});const stuck=make('button','I’m stuck',quiet),screenshot=make('button','Help with what I’m seeing',quiet),home=make('button','Back to the left',quiet,{hidden:true});
 const visualResult=make('section',null,panel,{className:'visual-result',hidden:true});visualResult.setAttribute('aria-label','Screenshot analysis');const visualBadge=make('p','',visualResult,{className:'visual-badge'});const visualFinding=make('p','',visualResult);
 const journeyDetails=make('details',null,panel);make('summary','Your task',journeyDetails);const taskSummary=make('p','',journeyDetails);const journeyList=make('ol',null,journeyDetails);
 const followLabel=make('label',null,more,{className:'mode'});const followToggle=make('input',null,followLabel,{type:'checkbox'});followLabel.append(document.createTextNode('Follow this task across pages'));
 const enableFollow=make('button','Enable automatic guidance',menu);
 const shortcutHint=make('p','⌘/Ctrl + Shift + K to open or close the conversation',menu,{className:'subtle'});
 const script=document.createElement('script');script.src=chrome.runtime.getURL('exode-mascot.js');script.onload=()=>script.remove();(document.head||document.documentElement).append(script);
 document.documentElement.append(host);
 let needsReview=false,followTask=false,followAllowed=false,autoTimer,lastAutoKey,autoRetryKey,autoRetryAt=0,autoAttempts=0,autoInFlight=false;let requestStartedAt=0;let imageFeedback;
 let state, reviewed, busy=false, epoch=0, speechEpoch=0, audio, imageDialog, visualStamp;
 const rpc=async message=>{const response=await chrome.runtime.sendMessage(message);if(!response?.ok)throw new Error(response?.error||'The guide could not connect.');return response.result;};
 const api=(path,body,automatic=false,method)=>rpc({type:'api',path,autoFollow:followTask,automatic,...(method?{method}:{}),...(body===undefined?{}:{body})});
 const map=message=>{const result=globalThis.__apMapper(message);if(!result?.ok)throw new Error(result?.error||'This page could not be read.');return result.snapshot ?? result.bounds;};
 const snap=()=>map({type:'snapshot'});
 let inputVersion=0;document.addEventListener('input',event=>{if(event.target!==host)inputVersion++;},true);document.addEventListener('change',event=>{if(event.target!==host)inputVersion++;},true);
 const stamp=()=>JSON.stringify([location.href,scrollX,scrollY,innerWidth,innerHeight,inputVersion]);
 const same=(a,b)=>a&&b&&a.pageId===b.pageId&&a.revision===b.revision;
 const current=()=>state&&same(state,reviewed)&&(!visualStamp||visualStamp===stamp());
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let targetRef, helpMode=false,lastLostTargetRun;
 const still=()=>motion.checked||reducedMotion.matches;
 function setExpression(mode){
  character.setAttribute('mood',mode==='thinking'?'35':mode==='ready'?'78':'55');
  character.setAttribute('ears',mode==='thinking'?'35':'65');
 }
 function returnHome(){
  companion.style.removeProperty('width');mascotButton.style.visibility='';menuNotice.hidden=true;
  targetRef=undefined;companion.dataset.location='home';companion.style.removeProperty('left');companion.style.removeProperty('top');companion.style.removeProperty('bottom');
  character.removeAttribute('gaze-x');character.removeAttribute('gaze-y');home.hidden=true;
 }
 function syncMotion(){
  const calm=still();character.setAttribute('follow',calm?'false':'true');character.setAttribute('personality',calm?'none':'curious');character.setAttribute('moments',calm?'off':'on');character.toggleAttribute('still',calm);
  companion.style.transition=calm?'none':'';if(calm)returnHome();
 }
 function overlaps(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
 function moveConversationAside(rect){
  if(!overlaps(companion.getBoundingClientRect(),rect))return;
  panel.hidden=true;mascotButton.setAttribute('aria-expanded','false');companion.style.width=mascot.offsetWidth+'px';
  if(still()&&overlaps(mascotButton.getBoundingClientRect(),rect))mascotButton.style.visibility='hidden';
  menuNotice.textContent='Control outlined. Use Tools & settings to reopen your companion.';menuNotice.hidden=false;tools.focus();
 }
 function placeBesideTarget(allowCollapse=true){
  if(!targetRef||still())return;
  try{
   const rect=map({type:'target',...targetRef});
   if(rect.bottom<=0||rect.top>=innerHeight||rect.right<=0||rect.left>=innerWidth){if(lastLostTargetRun!==state?.runId){lastLostTargetRun=state?.runId;analytics('lost_target');}returnHome();return;}
   home.hidden=false;
   const size=companion.getBoundingClientRect(),gap=18,margin=12;
   const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
   const options=[
    {x:rect.right+gap,y:clamp(rect.top,margin,innerHeight-size.height-margin)},
    {x:rect.left-size.width-gap,y:clamp(rect.top,margin,innerHeight-size.height-margin)},
    {x:clamp(rect.left,margin,innerWidth-size.width-margin),y:rect.bottom+gap},
    {x:clamp(rect.left,margin,innerWidth-size.width-margin),y:rect.top-size.height-gap},
   ];
   const spot=options.find(p=>p.x>=margin&&p.y>=margin&&p.x+size.width<=innerWidth-margin&&p.y+size.height<=innerHeight-margin);
   if(!spot){
    if(allowCollapse&&!panel.hidden){moveConversationAside(rect);if(panel.hidden){placeBesideTarget(false);return;}}
    if(lastLostTargetRun!==state?.runId){lastLostTargetRun=state?.runId;analytics('lost_target');}returnHome();moveConversationAside(rect);status.textContent='The control is outlined. Open your companion from Tools & settings when ready.';return;
   }
   // Pin the current home position before changing bottom anchoring, so the transition starts at home.
   if(companion.dataset.location!=='target'){
    companion.style.left=size.left+'px';companion.style.top=size.top+'px';companion.style.bottom='auto';void companion.offsetWidth;
   }
   companion.style.left=spot.x+'px';companion.style.top=spot.y+'px';companion.style.bottom='auto';companion.dataset.location='target';home.hidden=false;
   character.setAttribute('gaze-x',String(rect.left+rect.width/2));character.setAttribute('gaze-y',String(rect.top+rect.height/2));
  }catch{returnHome();}
 }
 motion.addEventListener('change',()=>{syncMotion();save().catch(()=>{});});reducedMotion.addEventListener('change',syncMotion);syncMotion();
 window.addEventListener('scroll',()=>placeBesideTarget(),{passive:true});window.addEventListener('resize',()=>placeBesideTarget(),{passive:true});
 function stopAudio(){speechEpoch++;if(audio){audio.pause();audio.src='';audio=undefined;}}
 function render(){
  const valid=current()&&state.status!=='paused'; const result=valid?state.result:undefined;
  task.readOnly=!!state||busy;answer.disabled=busy;actions.hidden=!state;sharingNotice.hidden=!!state;journeyDetails.hidden=!state;taskSummary.textContent=state?.task||task.value;journeyList.replaceChildren();for(const milestone of state?.journey||[])make('li',milestone,journeyList);
  if(state?.stage)taskSummary.textContent=(state.task||task.value)+' — '+state.stage;
  const evidence=imageFeedback ?? (valid&&state?.analysis?.input==='image+text'?{badge:state.analysis.imageStatus==='analyzed'?'✓ Image analyzed by '+state.analysis.provider:state.analysis.imageStatus==='failed'?'Image analysis failed':'Image sent — visual findings not confirmed',finding:state.analysis.observation||'No visual findings returned. Try a clearer crop.'}:undefined);
  visualResult.hidden=!evidence;if(evidence){visualBadge.textContent=evidence.badge;visualFinding.textContent=evidence.finding;}
  const guided=valid&&result?.kind==='guidance'&&!needsReview;taskLabel.hidden=!!state;
  inspect.hidden=true;contextDetails.hidden=!!guided||(!state&&!needsReview);
  send.textContent=state?'I’ve done this — review next step':'Share context & get guidance';
  bubble.textContent=busy?'Let me find your next step…':state?.status==='paused'?'Your guide is paused.':result?(result.instruction||result.question||result.reason):state?'The page changed. Review it for updated guidance.':'What would you like to do on this page?';
  answerLabel.hidden=result?.kind!=='clarification'&&!helpMode;
  if(!still())setExpression(busy?'thinking':result?'ready':'idle');
  explanation.textContent=result?.explanation||'';if(!result)explanation.hidden=true;
  sourceList.replaceChildren();for(const source of result?state.sources||[]:[]){if(!/^https?:\/\//.test(source.url))continue;const li=make('li',null,sourceList);make('a',source.synthetic?'Demo source':'Official context',li,{href:source.url,target:'_blank',rel:'noopener noreferrer'});}
  for(const button of [inspect,send,highlight,explain,repeat,pause,screenshot,reset,stuck,saveTask])button.disabled=busy;
  send.disabled=busy||state?.status==='paused';
  send.textContent=!state?'Start guiding':state.status==='clarifying'?'Send answer':'Continue';
  highlight.disabled=busy||!valid||result.kind!=='guidance'||!result.targetId;
  explain.disabled=busy||!valid||!result.explanation;
  repeat.disabled=busy||!valid;
  pause.disabled=!state;pause.textContent=state?.status==='paused'?'Resume':'Pause';
  saveTask.hidden=!state||!globalThis.__apTigerConnected;
  saveTask.textContent=state?.savedForLater?'Delete saved task':'Save this task';
 }
 async function save(){await rpc({type:'save',state,task:task.value,visualStamp,keepStill:motion.checked,autoFollow:followTask});}
 async function analytics(type,provider){if(!analyticsConsent.checked)return;const journeyText=(task.value||state?.task||'').toLowerCase(),stepText=[state?.stage,state?.result?.instruction,state?.result?.question].filter(Boolean).join(' ').toLowerCase();const journeyCategory=/health|medical|clinic/.test(journeyText)?'healthcare':/school|college|education|student/.test(journeyText)?'education':/benefit|bill|assistance|application|apply/.test(journeyText)?'benefits':/account|sign.?up|register/.test(journeyText)?'account-setup':'other';const stepCategory=/eligib/.test(stepText)?'eligibility':/document|upload|attach/.test(stepText)?'documents':/identity|name|birth|ssn/.test(stepText)?'identity':/email|phone|contact|address/.test(stepText)?'contact':/review|confirm|check/.test(stepText)?'review':/submit|send|finish/.test(stepText)?'submission':/button|link|menu|select|navigate/.test(stepText)?'navigation':'unknown';try{await api('/api/analytics/events',{consent:true,eventId:crypto.randomUUID(),type,journeyCategory,stepCategory,...(provider?{provider}:{})});}catch{}}
 function on(button,fn){button.addEventListener('click',async event=>{if(!event.isTrusted)return;try{await fn();}catch(error){status.textContent=error.message;}finally{render();}});}
 function review(){returnHome();stopAudio();reviewed=snap();preview.textContent=JSON.stringify(reviewed,null,2);status.textContent=`${reviewed.elements.length} labeled controls captured locally. Review the context before sharing.`;explanation.hidden=true;render();}
 async function requestGuidance(image,imageStamp,observedType){
  if(!task.value.trim())throw new Error('Describe what you need help with first.');
  if(!reviewed){reviewed=snap();preview.textContent=JSON.stringify(reviewed,null,2);}
  if(!same(reviewed,snap())){reviewed=undefined;throw new Error('The page changed. Review it again.');}
  if(state?.status==='paused')throw new Error('Resume the guide before asking for help.');
  imageFeedback=undefined;const snapshot=reviewed, generation=++epoch;returnHome();stopAudio();busy=true;requestStartedAt=Date.now();explanation.hidden=true;render();status.textContent=image?'Sending approved crop to Gemini…':'Reading this page…';if(image){imageFeedback={badge:'Analyzing your approved crop…',finding:'Waiting for Gemini’s visual findings.'};render();}
  try{
   let next;
   if(!state)next=await api('/api/tasks',{task:task.value.trim(),snapshot,...(image?{screenshot:image}:{})});
   else{
    const type=observedType||(state.status==='clarifying'?'clarification-answered':(image||helpMode)?'help-requested':snapshot.pageId!==state.pageId?'navigation-observed':'user-confirmed');
    const event={eventId:crypto.randomUUID(),stepId:state.stepId,pageId:state.pageId,revision:state.revision,type,snapshot,...(image?{screenshot:image}:{})};
    if(type==='help-requested'&&helpMode&&answer.value.trim())event.answer=answer.value.trim();
    if(type==='clarification-answered'){event.answer=answer.value.trim();if(!event.answer)throw new Error('Answer the clarification question first.');}
    next=await api(`/api/tasks/${state.runId}/events`,event,!!observedType);
   }
   if(generation!==epoch)return;
   state=next;more.open=false;imageFeedback=undefined;helpMode=false;needsReview=false;visualStamp=imageStamp;answer.value='';await save();
   if(!same(state,snap())||(visualStamp&&visualStamp!==stamp())){reviewed=undefined;returnHome();map({type:'restore'});status.textContent='The page changed while I was thinking. Review it again.';}
   else status.textContent='Your next step is ready. Take your time.';
  }catch(error){if(image){imageFeedback={badge:'Image analysis failed',finding:error.message};}analytics('provider_failure',globalThis.__apProvider||'mastra');throw error;}finally{if(generation===epoch){busy=false;render();}}
 }
 on(inspect,review);
 on(enableFollow,()=>rpc({type:'open-settings'}));
 analyticsConsent.addEventListener('change',async()=>{await chrome.storage.local.set({analyticsConsent:analyticsConsent.checked});if(!analyticsConsent.checked&&globalThis.__apTigerConnected)try{await api('/api/analytics/events',undefined,false,'DELETE');}catch{status.textContent='Analytics is off. Could not remove previously saved events while Tiger Data is unavailable.';}});
 on(saveTask,async()=>{
  if(!state)return;
  if(state.savedForLater){await api(`/api/saved-journeys/${state.runId}`,undefined,false,'DELETE');state=undefined;task.value='';await rpc({type:'reset'});status.textContent='Saved task deleted. Ready for a new task.';return;}
  await api(`/api/tasks/${state.runId}/save`,{consent:true});state.savedForLater=true;await save();status.textContent='Saved. You can return to it from Saved tasks.';
 });
 savedDetails.addEventListener('toggle',async()=>{if(!savedDetails.open)return;savedList.replaceChildren();try{const journeys=await api('/api/saved-journeys');savedStatus.textContent=journeys.length?`${journeys.length} saved task${journeys.length===1?'':'s'}.`: 'No saved tasks yet.';for(const journey of journeys){const item=make('button',journey.goal,savedList);item.title=`${journey.milestone} · saved ${new Date(journey.updatedAt).toLocaleDateString()}`;item.addEventListener('click',async()=>{try{state=await api(`/api/tasks/${journey.id}`);state.savedForLater=true;task.value=state.task||journey.goal;reviewed=undefined;await save();status.textContent='Saved task restored. Review the current page before continuing.';savedDetails.open=false;render();}catch(error){savedStatus.textContent=`Could not resume this task: ${error.message}`;}});}}catch(error){savedStatus.textContent=`Could not load saved tasks: ${error.message}`;}});
 followToggle.addEventListener('change',async()=>{followTask=followToggle.checked&&followAllowed;await save();});on(send,()=>{reviewed=snap();return requestGuidance();});
 on(highlight,()=>{
  menu.hidden=true;tools.setAttribute('aria-expanded','false');
  const ref={pageId:state.pageId,revision:state.revision,targetId:state.result.targetId};
  map({type:'highlight',...ref,reveal:true});
  if(!still()){targetRef=ref;placeBesideTarget();}else{moveConversationAside(map({type:'target',...ref}));}
  status.textContent=companion.dataset.location==='target'?'Here it is. Select the outlined control when you’re ready.':'The control is outlined. Select it yourself when ready.';
 });
 on(home,()=>{returnHome();panel.hidden=false;mascotButton.setAttribute('aria-expanded','true');});
 on(reopen,()=>{returnHome();panel.hidden=false;mascotButton.setAttribute('aria-expanded','true');menu.hidden=true;tools.setAttribute('aria-expanded','false');if(!state)task.focus();else send.focus();});
 on(mascotButton,()=>toggleConversation());
 mascotButton.setAttribute('aria-expanded','true');
 on(stuck,()=>{analytics('im_stuck');if(!state){task.focus();status.textContent='Tell me what you’d like help doing.';return;}helpMode=true;needsReview=true;returnHome();review();answerLabel.hidden=false;answer.focus();status.textContent='Tell me what is confusing, or choose visual help. Review the context before sharing.';});
 on(explain,()=>{analytics('explain_more');explanation.hidden=!explanation.hidden;});
 on(pause,async()=>{epoch++;busy=false;imageFeedback=undefined;stopAudio();returnHome();map({type:'restore'});state=await api(`/api/tasks/${state.runId}/${state.status==='paused'?'resume':'pause'}`,{});await save();status.textContent=state.status==='paused'?'Paused. The original page remains usable.':'Resumed. Review the current page before continuing.';});
 on(restore,()=>{returnHome();map({type:'restore'});stopAudio();});
 on(tools,()=>{menu.hidden=!menu.hidden;tools.setAttribute('aria-expanded',String(!menu.hidden));});
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.hidden=true;tools.setAttribute('aria-expanded','false');tools.focus();}});on(settings,()=>rpc({type:'open-settings'}));
 on(reset,async()=>{returnHome();helpMode=false;epoch++;busy=false;stopAudio();map({type:'restore'});state=undefined;needsReview=false;reviewed=undefined;visualStamp=undefined;task.value='';answer.value='';await rpc({type:'reset'});preview.textContent='Review a page to get started.';status.textContent='Ready for a new task.';});
 on(close,()=>{returnHome();epoch++;busy=false;stopAudio();map({type:'restore'});clearImageDialog();host.hidden=true;});
 on(repeat,async()=>{
  const stepId=state.stepId,generation=epoch;stopAudio();const speechRequest=speechEpoch;status.textContent='Preparing speech…';
  const response=await api(`/api/tasks/${state.runId}/speech`,{stepId});
  if(speechRequest!==speechEpoch||generation!==epoch||state.stepId!==stepId||state.status==='paused'||!current()||!same(state,snap())||host.hidden)return;
  if(!response.audioBase64){status.textContent='Speech is not connected. Your written guidance remains available.';return;}
  audio=new Audio(`data:audio/mpeg;base64,${response.audioBase64}`);await audio.play();status.textContent='Reading your current instruction. Pause stops playback.';
 });
 function clearImageDialog(){imageDialog?.remove();imageDialog=undefined;panel.inert=false;}
 async function captureHelp(){
  if(!task.value.trim())throw new Error('Enter your goal first.');
  review();
  const snapshot=reviewed,capturedAt=stamp();stopAudio();
  host.style.visibility='hidden';const toolRoot=document.getElementById('accesspatch-companion-root');const toolsHidden=toolRoot?.hidden;if(toolRoot)toolRoot.hidden=true;
  let data;
  try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));data=(await rpc({type:'capture'})).data;}
  finally{host.style.visibility='';if(toolRoot)toolRoot.hidden=toolsHidden;}
  if(capturedAt!==stamp()||!same(snapshot,snap()))throw new Error('The page moved or changed. Capture it again.');
  const source=new Image();source.src=data;await source.decode();data=undefined;
  if(host.hidden)return;
  const dialog=make('section',null,shadow,{className:'review'});imageDialog=dialog;panel.inert=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Review screenshot before sharing');
  make('h2','Choose what your guide can see',dialog);
  make('p','This is a local preview of the visible tab. Crop out names, filled answers, account details, and anything private. Only the approved crop goes to your local backend and Google Gemini. It is used for this request only.',dialog);
  const canvas=make('canvas',null,dialog);canvas.setAttribute('aria-label','Drag to select a crop, or use the crop fields below');const scale=Math.min(1,1280/source.width);canvas.width=Math.round(source.width*scale);canvas.height=Math.round(source.height*scale);const ctx=canvas.getContext('2d');
  let crop={x:0,y:0,w:canvas.width,h:canvas.height},start;
  const fields=make('div',null,dialog,{className:'crop-fields'});const inputs={};
  for(const [name,label]of [['x','Left'],['y','Top'],['w','Width'],['h','Height']]){const l=make('label',label,fields);inputs[name]=make('input',null,l,{type:'number',min:name==='w'||name==='h'?'1':'0',value:String(crop[name])});inputs[name].addEventListener('input',()=>{crop[name]=Number(inputs[name].value)||0;draw();});}
  const cropped=make('img',null,dialog,{alt:'Exact crop that will be shared',hidden:true});
  const note=make('p','Drag a rectangle, or enter a crop using the fields above. Then preview your crop.',dialog,{className:'small'});
  const previewButton=make('button','Preview crop',dialog);const approve=make('button','Share crop & ask guide',dialog,{className:'primary',disabled:true});const cancel=make('button','Cancel',dialog);
  let approvedData;
  function bounded(){const x=Math.max(0,Math.min(canvas.width-1,Math.round(crop.x)));const y=Math.max(0,Math.min(canvas.height-1,Math.round(crop.y)));return{x,y,w:Math.max(1,Math.min(canvas.width-x,Math.round(crop.w))),h:Math.max(1,Math.min(canvas.height-y,Math.round(crop.h)))};}
  function draw(){ctx.drawImage(source,0,0,canvas.width,canvas.height);const c=bounded();ctx.strokeStyle='#2454bd';ctx.lineWidth=3;ctx.strokeRect(c.x,c.y,c.w,c.h);approve.disabled=true;approvedData=undefined;cropped.hidden=true;}
  const point=event=>{const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};};
  canvas.addEventListener('pointerdown',event=>{start=point(event);canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!start)return;const end=point(event);crop={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.abs(end.x-start.x),h:Math.abs(end.y-start.y)};for(const k in inputs)inputs[k].value=String(Math.round(crop[k]));draw();});
  canvas.addEventListener('pointerup',()=>{start=undefined;});
  previewButton.addEventListener('click',event=>{if(!event.isTrusted)return;const c=bounded();const out=document.createElement('canvas');out.width=c.w;out.height=c.h;out.getContext('2d').drawImage(source,c.x/scale,c.y/scale,c.w/scale,c.h/scale,0,0,c.w,c.h);const url=out.toDataURL('image/jpeg',.8);approvedData=url.split(',')[1];if(approvedData.length>1333332){approvedData=undefined;note.textContent='That crop is too large. Choose a smaller area.';return;}cropped.src=url;cropped.hidden=false;approve.disabled=false;note.textContent='Review the exact crop above. Sharing sends only this crop and your reviewed page context.';});
  const cleanup=()=>{approvedData=undefined;source.src='';cropped.src='';clearImageDialog();screenshot.focus();};
  cancel.addEventListener('click',event=>{if(event.isTrusted)cleanup();});
  dialog.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();cleanup();}
   if(event.key==='Tab'){const all=Array.from(dialog.querySelectorAll('button:not(:disabled),input'));const first=all[0],last=all[all.length-1];if(event.shiftKey&&shadow.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&shadow.activeElement===last){event.preventDefault();first.focus();}}
  });
  approve.addEventListener('click',async event=>{
   if(!event.isTrusted)return;
   try{
    if(!approvedData)return;
    if(capturedAt!==stamp()||!same(snapshot,snap()))throw new Error('The page moved or changed. Capture it again.');
    const image={mimeType:'image/jpeg',data:approvedData,consent:true,pageId:snapshot.pageId,revision:snapshot.revision};cleanup();await requestGuidance(image,capturedAt);
   }catch(error){cleanup();status.textContent=error.message;render();}
  });
  draw();cancel.focus();
 }
 on(screenshot,captureHelp);
 setInterval(()=>{if(targetRef&&!busy&&!host.hidden)placeBesideTarget();if(!state||!reviewed||host.hidden||busy)return;try{if(!same(reviewed,snap())||(visualStamp&&visualStamp!==stamp())){reviewed=undefined;returnHome();stopAudio();map({type:'restore'});render();status.textContent='The page changed. Review it before continuing.';}}catch{reviewed=undefined;returnHome();stopAudio();render();}},700);
 function toggleConversation(){const wasHidden=host.hidden;host.hidden=false;panel.hidden=wasHidden?false:!panel.hidden;mascotButton.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){returnHome();if(!state)task.focus();else if(state.result.kind==='clarification')answer.focus();else send.focus();}}
 globalThis.__apToggleConversation=toggleConversation;
 function trackLink(event){
  if(!event.isTrusted||!followTask)return;
  const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.closest('#accesspatch-guide'))return;
  if(anchor.target==='_blank'||event.metaKey||event.ctrlKey||event.type==='auxclick'){
   try{const url=new URL(anchor.href);if(/^https?:$/.test(url.protocol))rpc({type:'link-intent',destination:url.origin+url.pathname}).catch(()=>{});}catch{}
  }
 }
 document.addEventListener('click',trackLink,true);document.addEventListener('auxclick',trackLink,true);

 async function refreshFollow(){try{const info=await rpc({type:'follow-status'});followAllowed=!!info?.enabled;followToggle.disabled=!followAllowed;enableFollow.hidden=followAllowed;if(!followAllowed){followTask=false;followToggle.checked=false;}}catch{}}
 window.addEventListener('focus',refreshFollow);
 async function syncNavigation(){
  if(!followTask||!followAllowed||busy||autoInFlight||!state||state.status==='paused'||imageDialog)return;
  const snapshot=snap();if(same(snapshot,state)){if(!reviewed){reviewed=snapshot;render();}return;}
  const key=state.runId+':'+snapshot.pageId+':'+snapshot.revision;if(lastAutoKey===key)return;
  if(autoRetryKey!==key){autoRetryKey=key;autoAttempts=0;autoRetryAt=0;}if(autoAttempts>=3||Date.now()<autoRetryAt)return;autoInFlight=true;stopAudio();returnHome();panel.hidden=false;host.hidden=false;mascotButton.setAttribute('aria-expanded','true');
  try{
   state=await api(`/api/tasks/${state.runId}`,undefined,true);if(state.status==='paused')return;
   if(same(snapshot,state)){reviewed=snapshot;lastAutoKey=key;retry.hidden=true;render();return;}
   reviewed=snapshot;const type=snapshot.pageId===state.pageId?'page-updated':'navigation-observed';
   await requestGuidance(undefined,undefined,type);lastAutoKey=key;autoAttempts=0;retry.hidden=true;
  }catch(error){autoAttempts++;autoRetryAt=Date.now()+Math.min(10000,1000*2**autoAttempts);retry.hidden=false;status.textContent='Could not continue automatically: '+error.message;render();}finally{autoInFlight=false;}
 }
 on(retry,()=>{lastAutoKey=undefined;autoAttempts=0;autoRetryAt=0;return syncNavigation();});
 chrome.runtime.onMessage.addListener(message=>{if(message.type==='navigation-ready'){clearTimeout(autoTimer);autoTimer=setTimeout(()=>syncNavigation(),500);}});
 setInterval(()=>{
  if(busy&&requestStartedAt){const elapsed=Math.round((Date.now()-requestStartedAt)/1000);status.textContent=(visualResult.hidden?'Planning your next step':'Gemini is analyzing your crop')+' · '+elapsed+'s';}
  if(followTask&&!busy&&state&&state.status!=='paused')syncNavigation();
 },1600);
 (async()=>{
  const saved=await rpc({type:'load'});state=saved.state;visualStamp=saved.visualStamp;motion.checked=!!saved.keepStill;syncMotion();task.value=saved.task||state?.task||'';
  const localPreferences=await chrome.storage.local.get('analyticsConsent');analyticsConsent.checked=!!localPreferences.analyticsConsent;
  const follow=await rpc({type:'follow-status'});followAllowed=!!follow?.enabled;followTask=followAllowed&&(saved.autoFollow??true);followToggle.checked=followTask;followToggle.disabled=!followAllowed;enableFollow.hidden=followAllowed;
  render();const health=await api('/api/health');globalThis.__apTigerConnected=String(health.modes['Tiger Data']||'').startsWith('connected');globalThis.__apProvider=health.modes.Gemini==='gemini-live'?'gemini':'mastra';render();status.textContent=health.modes.Gemini==='gemini-live'?'Ready · Gemini connected':'Demo mode: sample energy-assistance journey only.';
  if(state){state=await api(`/api/tasks/${state.runId}`);if(same(state,snap()))reviewed=snap();render();await syncNavigation();}
 })().catch(async error=>{if(/Task not found|Task expired/.test(error.message)){state=undefined;reviewed=undefined;await rpc({type:'reset'}).catch(()=>{});status.textContent='The previous task is unavailable. Start a new task from this page.';}else status.textContent=error.message;render();});
 render();
})();
