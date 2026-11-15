import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../../combined-extension/recorder.js',import.meta.url),'utf8');
test('cancellation invalidates pending microphone acquisition and stops its tracks',async()=>{
 let listener,release,stops=0,starts=0;const pending=new Promise(resolve=>release=resolve);
 class Recorder {state='inactive';constructor(){}start(){starts++;this.state='recording';}stop(){this.state='inactive';}}
 const chrome={runtime:{id:'ext',onMessage:{addListener:f=>listener=f},sendMessage:async()=>{}}};
 vm.runInNewContext(code,{chrome,navigator:{mediaDevices:{getUserMedia:()=>pending}},MediaRecorder:Recorder,setTimeout:()=>1,clearTimeout:()=>{}});
 const rpc=message=>new Promise(resolve=>listener({target:'accesspatch-recorder',...message},{id:'ext'},resolve));
 const start=rpc({action:'start',id:'one'});await rpc({action:'cancel',id:'one'});release({getTracks:()=>[{stop:()=>stops++}]});await start;
 assert.equal(starts,0);assert.equal(stops,1);
});
