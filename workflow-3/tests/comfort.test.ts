import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const scope={};vm.runInNewContext(readFileSync(new URL('../../combined-extension/comfort.js',import.meta.url),'utf8'),scope);
const policy=scope.__apComfortPolicy;
test('suggestions precede preferences and select only one page opportunity',()=>{
 assert.equal(policy.pick({}, {smallText:true,clutter:true}),'larger');
 assert.equal(policy.pick({}, {hasTask:true,hasMatches:true,smallText:true}),'navigate');
 assert.equal(policy.pick({}, {clutter:true}),'simple');
});
test('disabled suggestions and an applied adjustment suppress offers',()=>{
 assert.equal(policy.pick({suggestions:false},{smallText:true}),null);
 assert.equal(policy.pick({}, {smallText:true,active:'contrast'}),null);
 assert.equal(policy.pick({}, {smallText:true},['larger']),null);
});
