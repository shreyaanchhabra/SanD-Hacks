importScripts('voice-background.js');
const BASE = 'http://127.0.0.1:4313';
const pending = new Map();
const generationKey=tabId=>`guide-generation-${tabId}`;
async function inject(tabId, automatic=false){
 const tab=await chrome.tabs.get(tabId);
 if(!/^https?:/.test(tab.url||''))return;
 if(automatic){
  const binding=(await chrome.storage.session.get(`guide-${tabId}`))[`guide-${tabId}`];
  if(!binding?.state||!binding.autoFollow||binding.state.status==='paused')return;
  const settings=await chrome.storage.local.get('autoFollowApproved');if(!settings.autoFollowApproved)return;
  if(!await chrome.permissions.contains({origins:[new URL(tab.url).origin+'/*']}))return;
 }
 await chrome.scripting.executeScript({target:{tabId},func:value=>{globalThis.__apAutomaticInjection=value;},args:[automatic]});
 await chrome.scripting.insertCSS({target:{tabId},files:['tools.css']});
 await chrome.scripting.executeScript({target:{tabId},files:['fingerprint.js','page-map.js','tools.js','voice-controller.js','guide.js']});
 if(automatic)await chrome.tabs.sendMessage(tabId,{type:'navigation-ready'}).catch(()=>{});
}
chrome.action.onClicked.addListener(tab=>inject(tab.id).catch(()=>chrome.runtime.openOptionsPage()));
chrome.tabs.onUpdated.addListener((tabId,change)=>{
 if(change.status==='complete'||change.url){
  clearTimeout(pending.get(tabId));pending.set(tabId,setTimeout(()=>{pending.delete(tabId);inject(tabId,true).catch(()=>{});},250));
 }
});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||message.target==='accesspatch-recorder'||message.type?.startsWith('voice-'))return;
 (async()=>{
  if(message.type==='open-settings'){await chrome.runtime.openOptionsPage();return{};}
  if(!sender.tab?.id)throw new Error('Open the guide on a website.');
  const tabId=sender.tab.id,key=`guide-${tabId}`;
  const binding=async()=> (await chrome.storage.session.get(key))[key]||{};
  if(message.type==='link-intent'){const prior=await binding();if(prior.autoFollow&&prior.state){const url=new URL(message.destination);if(/^https?:$/.test(url.protocol))await chrome.storage.session.set({[key]:{...prior,linkIntent:{destination:url.origin+url.pathname,time:Date.now()}}});}return{};}
  if(message.type==='load')return binding();
  if(message.type==='follow-status'){
   const settings=await chrome.storage.local.get('autoFollowApproved');
   return{enabled:!!settings.autoFollowApproved&&await chrome.permissions.contains({origins:['http://*/*','https://*/*']})};
  }
  if(message.type==='save'){
   const prior=await binding();
   // API responses own step state. UI preferences must never overwrite a newer response.
   await chrome.storage.session.set({[key]:{...prior,task:prior.task||String(message.task||'').slice(0,2000),visualStamp:message.visualStamp,keepStill:!!message.keepStill,...(message.autoFollow===undefined?{}:{autoFollow:!!message.autoFollow})}});return{};
  }
  if(message.type==='reset'){const gKey=generationKey(tabId);const generation=(await chrome.storage.session.get(gKey))[gKey]||0;await chrome.storage.session.set({[gKey]:generation+1});await chrome.storage.session.remove(key);return{};}
  if(message.type==='capture'){
   const [active]=await chrome.tabs.query({active:true,windowId:sender.tab.windowId});
   if(active?.id!==tabId)throw new Error('Keep this tab active while capturing.');
   const data=await chrome.tabs.captureVisibleTab(sender.tab.windowId,{format:'png'});
   const [after]=await chrome.tabs.query({active:true,windowId:sender.tab.windowId});
   if(after?.id!==tabId)throw new Error('The active tab changed. Capture again.');return{data};
  }
  if(message.type!=='api')throw new Error('Unknown request');
  const path=String(message.path||'');if(!/^\/api\/(voice\/preview|health|analytics\/events|saved-journeys(?:\/[a-f0-9-]+)?|tasks(?:\/[a-f0-9-]+(?:\/(events|pause|resume|speech|save))?)?)$/.test(path))throw new Error('Unsupported route');
  if(message.automatic){const prior=await binding(),settings=await chrome.storage.local.get('autoFollowApproved');const url=new URL(sender.tab.url||'about:blank');if(!prior.autoFollow||!settings.autoFollowApproved||!/^https?:$/.test(url.protocol)||!await chrome.permissions.contains({origins:[url.origin+'/*']}))throw new Error('Automatic guidance is disabled or site permission is missing.');}
  const {localToken}=await chrome.storage.session.get('localToken');if(!localToken)throw new Error('Add the local API token in extension settings.');
  const gKey=generationKey(tabId);let generation=(await chrome.storage.session.get(gKey))[gKey]||0;
  if(path==='/api/tasks'&&message.body){generation++;await chrome.storage.session.set({[gKey]:generation});}
  const method=message.method||(message.body===undefined?'GET':'POST');
  const response=await fetch(BASE+path,{method,headers:{Authorization:`Bearer ${localToken}`,'Content-Type':'application/json'},...(message.body===undefined?{}:{body:JSON.stringify(message.body)}),signal:AbortSignal.timeout(60000)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Guidance unavailable');
  if(result.runId&&result.stepId&&message.body!==undefined){
   const latestGeneration=(await chrome.storage.session.get(gKey))[gKey]||0;if(latestGeneration!==generation)return result;
   const prior=await binding();await chrome.storage.session.set({[key]:{...prior,state:result,task:message.body?.task||prior.task||result.task||'',autoFollow:prior.autoFollow??!!message.autoFollow}});
  }
  return result;
 })().then(result=>reply({ok:true,result})).catch(error=>reply({ok:false,error:error.message}));return true;
});
chrome.tabs.onRemoved.addListener(tabId=>{clearTimeout(pending.get(tabId));pending.delete(tabId);const gKey=generationKey(tabId);chrome.storage.session.get(gKey).then(saved=>chrome.storage.session.set({[gKey]:(saved[gKey]||0)+1}));chrome.storage.session.remove(`guide-${tabId}`);});

chrome.tabs.onCreated.addListener(tab=>{
 if(!tab.openerTabId)return;
 setTimeout(async()=>{
  const key=`guide-${tab.openerTabId}`,prior=(await chrome.storage.session.get(key))[key];
  if(!prior?.autoFollow||!prior.state||!prior.linkIntent||Date.now()-prior.linkIntent.time>5000)return;
  const current=await chrome.tabs.get(tab.id).catch(()=>null);if(!current)return;
  const url=current.url||current.pendingUrl||'';
  if(url!=='about:blank'&&url){const parsed=new URL(url);if(parsed.origin+parsed.pathname!==prior.linkIntent.destination)return;}
  await chrome.storage.session.set({[key]:{...prior,linkIntent:undefined},[`guide-${tab.id}`]:{...prior,linkIntent:undefined}});
  await inject(tab.id,true).catch(()=>{});
 },200);
});
