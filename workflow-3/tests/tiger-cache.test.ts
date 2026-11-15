import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TigerGuidanceCache,FallbackGuidanceCache} from '../src/tiger-cache.js';
import {CACHE_VERSION} from '../src/guidance-engine.js';
const entry=()=>({version:CACHE_VERSION,createdAt:1000,expiresAt:Date.now()+60000,result:{kind:'guidance',instruction:'Read Household.',explanation:'Page definition.',targetId:'control-0',sourceIds:[],expectedOutcome:'user-confirmation'},form:{origin:'https://example.org/',title:'Demo',fields:[{id:'control-0',name:'Household',kind:'field',required:true}]}});
test('Tiger cache uses parameterized queries for approved structure and guidance only',async()=>{
 const queries=[];const db={query:async(text,values)=>{queries.push({text,values});return{rows:text.startsWith('SELECT payload')?[{payload:entry()}]:[]};}};
 const cache=new TigerGuidanceCache(db);const raw=entry();raw.form.fields[0].validation={invalid:true,messages:['PRIVATE_ANSWER']};raw.form.fields[0].value='PRIVATE_ANSWER';raw.result.observations=[{text:'PRIVATE_PROGRESS',basis:'page',elementId:'control-0'}];raw.result.changeSummary='PRIVATE_PROGRESS';raw.result.journey=['PRIVATE_PROGRESS'];raw.result.stage='PRIVATE_PROGRESS';await cache.put('hash-key',raw);const read=await cache.get('hash-key');assert.equal(read.result.kind,'guidance');
 const write=queries.find(q=>q.text.startsWith('INSERT INTO accesspatch_guidance_cache'));assert.ok(write.text.includes('$1'));assert.equal(write.values[0],'hash-key');
 assert.equal(queries.filter(q=>q.text.startsWith('INSERT INTO accesspatch_form_structures')).length,1);
 assert.ok(!JSON.stringify(queries).includes('PRIVATE_ANSWER'));assert.ok(!JSON.stringify(queries).includes('PRIVATE_PROGRESS'));
 assert.ok(!JSON.stringify(write.values).includes('screenshot'));assert.ok(!JSON.stringify(write.values).includes('history'));
});
test('Tiger outages use the local cache without claiming a real Tiger write',async()=>{
 const records=new Map();const local={mode:'local',get:async key=>records.get(key)||null,put:async(key,value)=>records.set(key,value)};
 const unavailable={mode:'tiger-data',get:async()=>{throw new Error('private connection');},put:async()=>{throw new Error('private connection');}};
 const cache=new FallbackGuidanceCache(unavailable,local);await cache.put('key',entry());assert.equal(cache.mode,'local-fallback');assert.equal((await cache.get('key')).result.kind,'guidance');
});
