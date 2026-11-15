import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const scope={};vm.runInNewContext(readFileSync(new URL('../../combined-extension/comfort.js',import.meta.url),'utf8'),scope);
const policy=scope.__apComfortPolicy;
test('comfort suggestions depend on explicit preferences and only select one opportunity',()=>{
 const features={smallText:true,dense:true,hasTask:true,hasMatches:true,hasMain:true,hasStep:true,landmarks:true};
 assert.equal(policy.pick({},features,[]),'navigate'); // Task navigation is contextual, not a personal inference.
 assert.equal(policy.pick({}, {...features,hasTask:false},[]),null);
 assert.equal(policy.pick({larger:true,shorter:true},features,[]),'larger');
 assert.equal(policy.pick({larger:true,shorter:true},features,['larger']),'shorter');
});
test('disabled suggestions and unavailable page features are respected',()=>{
 assert.equal(policy.pick({larger:true,never:['larger']},{smallText:true},[]),null);
 assert.equal(policy.pick({shorter:true},{dense:false},[]),null);
});
