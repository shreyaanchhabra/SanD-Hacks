import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const code=readFileSync(new URL('../../combined-extension/voice-controller.js',import.meta.url),'utf8');
function harness(rpc=async()=>({text:'Help with energy assistance'})){
 const events=[],drafts=[],messages=[];let page='page-one';const scope={crypto:{randomUUID},chrome:{storage:{local:{get:async()=>({}),set:async()=>{}}}}};vm.runInNewContext(code,scope);
 const voice=scope.__apCreateVoice({rpc:async message=>{events.push(message);return rpc(message);},context:()=>page,draft:text=>drafts.push(text),notify:text=>messages.push(text),changed:()=>{},stopAudio:()=>{}});
 return{voice,events,drafts,messages,navigate:()=>page='page-two'};
}
test('selecting Voice never starts recording and returning to Text cancels recording',async()=>{
 const h=harness();await h.voice.setMode('voice');assert.equal(h.events.length,0);await h.voice.talk();assert.equal(h.events[0].type,'voice-start');await h.voice.setMode('text');assert.equal(h.events[1].type,'voice-cancel');assert.equal(h.voice.active,false);
});
test('transcribed speech is a draft, not an automatically submitted task',async()=>{
 const h=harness();await h.voice.setMode('voice');await h.voice.talk();await h.voice.talk();assert.deepEqual(h.drafts,['Help with energy assistance']);assert.deepEqual(h.events.map(e=>e.type),['voice-start','voice-stop']);
});
test('late transcription after changing modes is discarded',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;});const h=harness(async message=>message.type==='voice-stop'?pending:{});
 await h.voice.talk();const request=h.voice.talk();await h.voice.setMode('text');release({text:'OLD TRANSCRIPT'});await request;assert.deepEqual(h.drafts,[]);
});
test('navigation invalidates a pending transcript',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;});const h=harness(async message=>message.type==='voice-stop'?pending:{});
 await h.voice.talk();const request=h.voice.talk();h.navigate();release({text:'OLD TRANSCRIPT'});await request;assert.deepEqual(h.drafts,[]);assert.match(h.messages.at(-1),/page changed/);
});
