import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenshotSchema } from '../src/contracts.js';
import { createService } from '../src/service.js';
import { planStep } from '../src/planner.js';
import { startPage } from '../src/fixtures.js';
const image = { mimeType: 'image/png' as const, data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=', consent: true as const, pageId: startPage.pageId, revision: 1 };
test('screenshot context requires explicit consent, valid image signature and matching page', async () => {
 assert.equal(screenshotSchema.safeParse({...image,consent:false}).success,false);
 assert.equal(screenshotSchema.safeParse({...image,data:'not-image'}).success,false);
 const service=createService();
 await assert.rejects(service.start('energy bill', startPage, {...image,pageId:'other-page'}), /page/);
});
test('images reach the planner for one turn but never appear in returned task or later turns', async () => {
 const received=[];
 const service=createService({planner:async input=>{received.push(input.screenshot); return {kind:'guidance',instruction:'Read this image.',explanation:'Visual help.',targetId:input.screenshot?null:'energy-link',sourceIds:[],expectedOutcome:'user-confirmation'};}});
 const first=await service.start('energy bill',startPage,image);
 assert.deepEqual(received[0],image);
 assert.ok(!JSON.stringify(service.get(first.runId)).includes(image.data));
 await service.event(first.runId,{eventId:'next',stepId:first.stepId,pageId:first.pageId,revision:first.revision,type:'help-requested',snapshot:startPage});
 assert.equal(received[1],undefined);
});
test('visual-only guidance cannot invent a DOM highlight; null target requires image input', async()=>{
 const planner=async()=>({kind:'guidance',instruction:'Read the top heading.',explanation:'Visible in the crop.',targetId:null,sourceIds:[],expectedOutcome:'user-confirmation'});
 const input={task:'help',snapshot:startPage,sources:[],history:[]};
 assert.equal((await planStep(input,planner)).kind,'unsupported');
 assert.equal((await planStep({...input,screenshot:image},planner)).kind,'guidance');
});
