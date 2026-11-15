import {test} from 'node:test';
import assert from 'node:assert/strict';
import {elevenLabsSpeech} from '../src/speech.js';
import {createService} from '../src/service.js';
import {startPage} from '../src/fixtures.js';
test('speech receives only the validated current instruction and rejects stale steps',async()=>{
 let sent='';const speech=elevenLabsSpeech('test-key','test-voice',async(_url,init)=>{sent=JSON.parse(String(init.body)).text;return new Response(new Uint8Array([73,68,51,1]),{headers:{'Content-Type':'audio/mpeg'}});});
 const service=createService({speech});const first=await service.start('energy bill',startPage);
 const audio=await service.speak(first.runId,first.stepId);assert.equal(audio.status,'ready');
 assert.equal(sent,first.result.kind==='guidance'?first.result.instruction:'');
 await assert.rejects(service.speak(first.runId,'wrong-step'),/stale/);
});
test('speech provider failures do not reveal provider response or key',async()=>{
 const speech=elevenLabsSpeech('secret-key','voice',async()=>new Response('secret provider detail',{status:401}));
 await assert.rejects(speech.speak('step','Read the label.'),/Speech temporarily unavailable/);
});

test('voice preview uses fixed sample text without creating a task',async()=>{
 let seen;const service=createService({speech:{mode:'test',speak:async(id,text)=>{seen={id,text};return{status:'mock-no-audio'};}}});await service.previewVoice();assert.equal(seen.id,'voice-preview');assert.match(seen.text,/page companion/);
});
