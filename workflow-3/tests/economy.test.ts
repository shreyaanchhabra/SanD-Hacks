import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {GuidanceEngine,FileGuidanceCache} from '../src/guidance-engine.js';
import {formPage} from '../src/fixtures.js';
const input=()=>({task:'Explain household',snapshot:formPage,sources:[],history:[]});
const result=id=>({kind:'guidance',instruction:'Read the household label.',explanation:'People living with you.',targetId:id,sourceIds:[],expectedOutcome:'user-confirmation'});
test('semantic cache remaps temporary IDs and survives a new engine instance',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'accesspatch-cache-'));let count=0;
 const planner=async context=>{count++;return result(context.snapshot.elements[0].id);};
 const first=new GuidanceEngine({planner,model:'test-model',cache:new FileGuidanceCache(directory),scope:'owner'});
 await first.plan(input());
 const fresh=new GuidanceEngine({planner,model:'test-model',cache:new FileGuidanceCache(directory),scope:'owner'});
 const changed={...input(),snapshot:{...formPage,pageId:'refreshed',revision:99,elements:[{...formPage.elements[0],id:'new-field'}],instructions:formPage.instructions.map(i=>({...i,elementId:'new-field'}))}};
 const next=await fresh.plan(changed);assert.equal(count,1);assert.equal(next.result.targetId,'new-field');assert.equal(next.usage.cache,'hit');
});
test('changing field requirements or progress invalidates cached guidance',async()=>{
 let count=0;const engine=new GuidanceEngine({model:'model',scope:'one',planner:async context=>{count++;return result(context.snapshot.elements[0].id);}});
 await engine.plan(input());await engine.plan({...input(),snapshot:{...formPage,elements:[{...formPage.elements[0],required:true}]}});
 await engine.plan({...input(),history:['User confirmed reading the label']});assert.equal(count,3);
});
test('concurrent identical requests share one validated provider call',async()=>{
 let count=0;const engine=new GuidanceEngine({model:'model',scope:'one',planner:async()=>{count++;return result('household-label');}});
 const [a,b]=await Promise.all([engine.plan(input()),engine.plan(input())]);assert.equal(count,1);assert.deepEqual(a.result,b.result);
});
test('provider errors do not block subsequent user requests locally',async()=>{
 let count=0,now=1000;const engine=new GuidanceEngine({model:'model',scope:'one',now:()=>now,planner:async()=>{count++;throw Object.assign(new Error('private provider error'),{status:429,error:{details:[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'120s'}]}});}});
 const first=await engine.plan(input());assert.equal(first.result.kind,'unsupported');assert.equal(count,1);
 const next=await engine.plan(input());assert.equal(count,2);assert.equal(next.usage.status,'provider-error');
 now+=121000;await engine.plan(input());assert.equal(count,3);
});
test('invalid target output is never persisted as reusable guidance',async()=>{
 let writes=0;const engine=new GuidanceEngine({model:'model',scope:'one',cache:{mode:'test',get:async()=>null,put:async()=>{writes++;}},planner:async()=>result('unknown')});
 assert.equal((await engine.plan(input())).result.kind,'unsupported');assert.equal(writes,0);
});
test('single-flight results remap targets for each waiting caller',async()=>{
 let resolve;const waiting=new Promise(r=>{resolve=r;});let calls=0;
 const engine=new GuidanceEngine({model:'model',scope:'one',planner:async context=>{calls++;await waiting;return result(context.snapshot.elements[0].id);}});
 const first=engine.plan(input());
 const other={...input(),snapshot:{...formPage,elements:[{...formPage.elements[0],id:'fresh-id'}],instructions:formPage.instructions.map(i=>({...i,elementId:'fresh-id'}))}};
 const next=engine.plan(other);resolve();const [a,b]=await Promise.all([first,next]);assert.equal(calls,1);assert.equal(a.result.targetId,'household-label');assert.equal(b.result.targetId,'fresh-id');
});
test('new image requests bypass reusable form guidance and are never written to the cache',async()=>{
 let writes=0,calls=0;const engine=new GuidanceEngine({model:'model',scope:'one',cache:{mode:'test',get:async()=>null,put:async()=>{writes++;}},planner:async()=>{calls++;return result('household-label');}});
 const image={mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=',consent:true,pageId:formPage.pageId,revision:1};
 await engine.plan({...input(),screenshot:image});await engine.plan({...input(),screenshot:image});assert.equal(writes,0);assert.equal(calls,2);
});
test('a changed destination fingerprint forces a fresh proposal even with the same labels',async()=>{
 let calls=0;const engine=new GuidanceEngine({scope:'owner',model:'model',planner:async()=>{calls++;return result('household-label');}});
 await engine.plan({...input(),snapshot:{...formPage,structureFingerprint:'a'.repeat(64)}});
 await engine.plan({...input(),snapshot:{...formPage,structureFingerprint:'b'.repeat(64)}});assert.equal(calls,2);
});

test('cached source-backed guidance preserves the validated preparation checklist',async()=>{
 const source={id:'official',url:'https://www.usa.gov/benefits',text:'Read the preparation requirements.',retrievedAt:new Date().toISOString(),synthetic:false};
 const engine=new GuidanceEngine({scope:'owner',model:'checklist-model',planner:async()=>({...result('household-label'),sourceIds:['official'],checklist:[{text:'Read the preparation requirements.',sourceId:'official'}]})});
 const request={...input(),sources:[source]};const first=await engine.plan(request);const second=await engine.plan(request);
 assert.equal(second.usage.cache,'hit');assert.deepEqual(second.result.checklist,first.result.checklist);
});

test('repeated uncached guidance has no daily or minute request cap',async()=>{let calls=0;const engine=new GuidanceEngine({model:'model',scope:'unlimited',planner:async()=>{calls++;return result('household-label');}});for(let i=0;i<25;i++)await engine.plan({...input(),history:['turn '+i]});assert.equal(calls,25);});
