import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LibSQLStore} from '@mastra/libsql';
import {TaskRepository} from '../src/repository.js';
import {createService} from '../src/service.js';
import {startPage,formPage} from '../src/fixtures.js';
test('a fresh backend resumes an existing Mastra checkpoint and preserves task history',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'accesspatch-persistence-'));
 const options=()=>({repository:new TaskRepository(join(dir,'tasks')),storage:new LibSQLStore({id:'test-persistent',url:'file:'+join(dir,'mastra.db')})});
 const firstService=createService(options());const first=await firstService.start('energy bill',startPage);
 const nextService=createService(options());assert.deepEqual(nextService.get(first.runId),first);
 const event={eventId:'nav',stepId:first.stepId,pageId:first.pageId,revision:first.revision,type:'navigation-observed',snapshot:formPage};
 const next=await nextService.event(first.runId,event);assert.equal(next.status,'waiting-for-user');
 assert.equal(next.result.kind,'guidance');if(next.result.kind==='guidance')assert.equal(next.result.targetId,'household-label');
 const thirdService=createService(options());assert.deepEqual(await thirdService.event(first.runId,event),next);
});
test('a failed durable transition leaves the previous wait recoverable after restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'accesspatch-write-failure-'));let fail=false;
 class FailingRepository extends TaskRepository{save(record){if(fail)throw new Error('Simulated disk write failure');super.save(record);}}
 const first=createService({repository:new FailingRepository(join(dir,'tasks')),storage:new LibSQLStore({id:'recoverable',url:'file:'+join(dir,'mastra.db')})});
 const state=await first.start('energy bill',startPage);fail=true;
 const event={eventId:'failure-nav',stepId:state.stepId,pageId:state.pageId,revision:state.revision,type:'navigation-observed',snapshot:formPage};
 await assert.rejects(first.event(state.runId,event),/disk write failure/);
 fail=false;const fresh=createService({repository:new TaskRepository(join(dir,'tasks')),storage:new LibSQLStore({id:'recoverable',url:'file:'+join(dir,'mastra.db')})});
 const result=await fresh.event(state.runId,event);assert.equal(result.result.kind,'guidance');
});
