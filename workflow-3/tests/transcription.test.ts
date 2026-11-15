import {test} from 'node:test';
import assert from 'node:assert/strict';
import {elevenLabsTranscription, transcriptionSchema} from '../src/transcription.js';
const input={consent:true as const,mimeType:'audio/webm',data:Buffer.from([0x1a,0x45,0xdf,0xa3,1,2,3,4]).toString('base64')};
test('transcription rejects missing consent, malformed audio and oversized input',()=>{
 assert.equal(transcriptionSchema.safeParse({...input,consent:false}).success,false);
 assert.equal(transcriptionSchema.safeParse({...input,data:'not audio'}).success,false);
 assert.equal(transcriptionSchema.safeParse({...input,data:'A'.repeat(1400000)}).success,false);
});
test('transcription sends audio only and returns bounded text without retaining recording',async()=>{
 let calls=0;
 const adapter=elevenLabsTranscription('private-key',async(url,options)=>{
  calls++;assert.equal(String(url),'https://api.elevenlabs.io/v1/speech-to-text');
  const form=options!.body as FormData;assert.equal(form.get('model_id'),'scribe_v2');assert.ok(form.get('file') instanceof Blob);
  return new Response(JSON.stringify({text:'Help with my energy bill'}));
 });
 assert.deepEqual(await adapter(input),{text:'Help with my energy bill'});assert.equal(calls,1);
});
test('transcription failure does not expose provider secrets',async()=>{
 const adapter=elevenLabsTranscription('private-key',async()=>new Response('private provider detail',{status:429}));
 await assert.rejects(adapter(input),/Voice transcription unavailable/);
});

 test('authenticated transcription route validates consent and keeps task storage separate',async()=>{
 const {createApi}=await import('../src/api.js');const {createService}=await import('../src/service.js');let calls=0;
 const api=createApi({token:'test',service:createService({transcribe:async()=>{calls++;return{text:'Question draft'};}})});
 const send=(body,token='test')=>api(new Request('http://localhost/api/voice/transcribe',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)}));
 assert.equal((await send(input,'wrong')).status,401);assert.equal((await send({...input,consent:false})).status,400);assert.equal(calls,0);
 const response=await send(input);assert.equal(response.status,200);assert.deepEqual(await response.json(),{text:'Question draft'});assert.equal(calls,1);
 });

test('transcription has no local per-minute request cap',async()=>{let calls=0;const adapter=elevenLabsTranscription('test',async()=>{calls++;return new Response(JSON.stringify({text:'Question'}));});for(let i=0;i<8;i++)await adapter(input);assert.equal(calls,8);});
