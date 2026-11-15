let recording, pendingId, acquisitionGeneration=0;
function discard(){if(!recording)return;const old=recording;recording=undefined;clearTimeout(old.timer);old.chunks.length=0;old.stream.getTracks().forEach(track=>track.stop());if(old.recorder.state!=='inactive')old.recorder.stop();}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||sender.tab||message.target!=='accesspatch-recorder')return;
 (async()=>{
  if(message.action==='cancel'){if(pendingId===message.id){acquisitionGeneration++;pendingId=undefined;}if(recording?.id===message.id)discard();return{};}
  if(message.action==='start'){
   discard();const generation=++acquisitionGeneration;pendingId=message.id;const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(generation!==acquisitionGeneration){stream.getTracks().forEach(track=>track.stop());throw new Error('Recording cancelled');}pendingId=undefined;
   try{
    const recorder=new MediaRecorder(stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:64000});
    const current={id:message.id,stream,recorder,chunks:[],bytes:0,timer:null};recording=current;
    recorder.ondataavailable=event=>{if(recording!==current)return;current.bytes+=event.data.size;if(current.bytes>1000000){discard();chrome.runtime.sendMessage({type:'voice-expired',id:current.id}).catch(()=>{});}else current.chunks.push(event.data);};
    current.timer=setTimeout(()=>{if(recording===current){discard();chrome.runtime.sendMessage({type:'voice-expired',id:current.id}).catch(()=>{});}},30000);
    recorder.start(200);return{};
   }catch(error){stream.getTracks().forEach(track=>track.stop());throw error;}
  }
  if(message.action==='stop'){
   const current=recording;if(!current||current.id!==message.id)throw new Error('Recording ended. Please try again.');
   clearTimeout(current.timer);await new Promise(resolve=>{current.recorder.onstop=resolve;current.recorder.stop();});
   current.stream.getTracks().forEach(track=>track.stop());if(recording!==current)throw new Error('Recording cancelled');
   const blob=new Blob(current.chunks,{type:'audio/webm'});recording=undefined;current.chunks.length=0;
   if(!blob.size||blob.size>1000000)throw new Error('Recording too large or empty');
   const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return {consent:true,mimeType:'audio/webm',data:btoa(binary)};
  }
  throw new Error('Unknown recorder request');
 })().then(result=>reply({ok:true,result})).catch(()=>reply({ok:false,error:'Microphone unavailable. Enable it in Voice setup, then try again.'}));return true;
});
