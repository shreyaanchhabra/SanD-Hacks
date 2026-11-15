import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../../combined-extension/background.js',import.meta.url),'utf8');
function harness(fetcher?){
 const callbacks={},session={},local={autoFollowApproved:true},timers=[],injections=[];let permitted=true;
 const event=name=>({addListener:fn=>{callbacks[name]=fn;}});
 const store=data=>({get:async key=>Object.fromEntries((Array.isArray(key)?key:[key]).map(k=>[k,data[k]])),set:async value=>Object.assign(data,value),remove:async key=>{delete data[key];}});
 const chrome={runtime:{id:'test-extension',onMessage:event('message'),openOptionsPage:async()=>{}},action:{onClicked:event('action')},tabs:{get:async id=>({id,url:'https://second.example/form'}),query:async()=>[],onUpdated:event('updated'),onCreated:event('created'),onRemoved:event('removed'),sendMessage:async()=>{}},storage:{session:store(session),local:store(local)},permissions:{contains:async()=>permitted},scripting:{insertCSS:async x=>injections.push(x),executeScript:async x=>injections.push(x)}};
 vm.runInNewContext(code,{importScripts:()=>{},chrome,URL,AbortSignal,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},fetch:fetcher??(async()=>new Response(JSON.stringify({runId:'abc-123',stepId:'step-2',task:'Original goal',status:'waiting-for-user'}),{status:201}))});
 const flush=async()=>{while(timers.length){await timers.shift()();await new Promise(resolve=>setImmediate(resolve));}};
 const rpc=message=>new Promise(resolve=>callbacks.message(message,{id:'test-extension',tab:{id:1,windowId:1}},resolve));
 return{callbacks,session,local,injections,flush,rpc,setPermission:value=>{permitted=value;}};
}
test('automatic injection requires an active opted-in unpaused task and approved site permission',async()=>{
 const h=harness();h.callbacks.updated(1,{status:'complete'});await h.flush();assert.equal(h.injections.length,0);
 h.session['guide-1']={state:{runId:'run',status:'waiting-for-user'},autoFollow:true};h.callbacks.updated(1,{status:'complete'});await h.flush();assert.equal(h.injections.length,3);
 h.session['guide-1'].state.status='paused';h.callbacks.updated(1,{status:'complete'});await h.flush();assert.equal(h.injections.length,3);
 h.session['guide-1'].state.status='waiting-for-user';h.setPermission(false);h.callbacks.updated(1,{url:'https://second.example'});await h.flush();assert.equal(h.injections.length,3);
});
test('worker saves returned run state before replying and stale UI saves cannot overwrite it',async()=>{
 const h=harness();h.session.localToken='test-token';
 const response=await h.rpc({type:'api',path:'/api/tasks',body:{task:'Original goal'},autoFollow:true});assert.equal(response.ok,true);
 assert.equal(h.session['guide-1'].state.stepId,'step-2');
 await h.rpc({type:'save',state:{stepId:'old-step'},task:'Original goal'});assert.equal(h.session['guide-1'].state.stepId,'step-2');
});
test('revoking automatic sharing blocks already-injected pages from sending new automatic requests',async()=>{
 const h=harness();h.session.localToken='test-token';h.session['guide-1']={autoFollow:true,state:{runId:'run'}};h.local.autoFollowApproved=false;
 const result=await h.rpc({type:'api',path:'/api/tasks',automatic:true,body:{task:'goal'}});assert.equal(result.ok,false);
});
test('delayed model responses cannot re-enable follow mode or resurrect a reset task',async()=>{
 let release;const waiting=new Promise(resolve=>{release=resolve;});
 const h=harness(async()=>{await waiting;return new Response(JSON.stringify({runId:'abc-123',stepId:'step',status:'waiting-for-user'}),{status:201});});
 h.session.localToken='token';h.session['guide-1']={autoFollow:true};
 const pending=h.rpc({type:'api',path:'/api/tasks',body:{task:'goal'},autoFollow:true});await new Promise(resolve=>setImmediate(resolve));
 await h.rpc({type:'save',autoFollow:false});release();await pending;
 assert.equal(h.session['guide-1'].autoFollow,false);
 let releaseSecond;const delayed=new Promise(resolve=>{releaseSecond=resolve;});
 const other=harness(async()=>{await delayed;return new Response(JSON.stringify({runId:'abc-123',stepId:'step',status:'waiting-for-user'}),{status:201});});other.session.localToken='token';
 const request=other.rpc({type:'api',path:'/api/tasks',body:{task:'goal'},autoFollow:true});await new Promise(resolve=>setImmediate(resolve));
 await other.rpc({type:'reset'});releaseSecond();await request;assert.equal(other.session['guide-1'],undefined);
});
