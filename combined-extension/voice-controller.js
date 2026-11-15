(() => {
 globalThis.__apCreateVoice = ({rpc, context, draft, notify, changed, stopAudio}) => {
  let mode='text', phase='ready', generation=0, recording,recordedContext;
  const update=()=>changed({mode,phase});
  async function cancel(){generation++;const id=recording;recording=undefined;phase='ready';update();if(id)await rpc({type:'voice-cancel',id}).catch(()=>{});}
  async function setMode(value){await cancel();stopAudio();mode=value==='voice'?'voice':'text';await chrome.storage.local.set({companionMode:mode});update();}
  async function talk(){
   if(phase==='transcribing')return;
   if(phase==='recording'){
    const id=recording,version=generation,before=recordedContext;phase='transcribing';update();notify('Turning speech into text…');
    try{const result=await rpc({type:'voice-stop',id});if(version!==generation)return;
     if(before!==context()){notify('The page changed. Please record your question again.');return;}
     draft(result.text);notify('Check your transcript, then send. Nothing has been submitted to your guide yet.');
    }catch(error){if(version===generation)notify(error.message);}
    finally{if(version===generation){recording=undefined;phase='ready';update();}}return;
   }
   stopAudio();const version=++generation,id=crypto.randomUUID();recording=id;recordedContext=context();phase='starting';update();
   try{await rpc({type:'voice-start',id});if(version!==generation){await rpc({type:'voice-cancel',id}).catch(()=>{});return;}phase='recording';notify('Listening… Select Stop recording when finished (30 seconds maximum).');}
   catch(error){if(version===generation){recording=undefined;phase='ready';notify(error.message);}}
   finally{if(version===generation)update();}
  }
  return {setMode,talk,cancel,ended(id){if(recording===id){cancel();return true;}return false;},get phase(){return phase;},get mode(){return mode;},get active(){return phase!=='ready';},async restore(){const saved=await chrome.storage.local.get('companionMode');mode=saved.companionMode==='voice'?'voice':'text';update();}};
 };
})();
