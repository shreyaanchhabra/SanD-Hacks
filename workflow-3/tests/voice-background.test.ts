import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../../combined-extension/voice-background.js',import.meta.url),'utf8');
test('cancellation during backend health preflight prevents microphone acquisition',async()=>{
 let listener,release,healthStarted;const pending=new Promise(resolve=>release=resolve);const seen=new Promise(resolve=>healthStarted=resolve);const sent=[];
 const event={addListener:()=>{}};
 const chrome={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,onMessage:{addListener:f=>listener=f},sendMessage:async m=>{sent.push(m);return{ok:true,result:{}};}},storage:{session:{get:async()=>({localToken:'token'})}},offscreen:{hasDocument:async()=>true},tabs:{query:async()=>[{id:1}],sendMessage:async()=>{},onActivated:event,onUpdated:event,onRemoved:event},windows:{onFocusChanged:event,WINDOW_ID_NONE:-1}};
 vm.runInNewContext(code,{chrome,AbortController,AbortSignal,fetch:async()=>{healthStarted();await pending;return new Response(JSON.stringify({modes:{Transcription:'elevenlabs-live'}}));}});
 const sender={id:'ext',tab:{id:1,url:'https://example.org'},frameId:0,documentId:'doc'};const rpc=message=>new Promise(resolve=>listener(message,sender,resolve));
 const start=rpc({type:'voice-start',id:'one'});await seen;await rpc({type:'voice-cancel',id:'one'});release();await start;
 assert.equal(sent.filter(m=>m.action==='start').length,0);
});
