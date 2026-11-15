// Extension-owned capture; audio never enters a content script or persistent storage.
let voiceSession, recorderCreating;
async function recorderRequest(action,id){const response=await chrome.runtime.sendMessage({target:'accesspatch-recorder',action,id});if(!response?.ok)throw new Error(response?.error||'Microphone unavailable');return response.result;}
async function cancelVoice(id){const session=voiceSession;if(!session||(id&&id!==session.id))return;voiceSession=undefined;session.abort.abort();await recorderRequest('cancel',session.id).catch(()=>{});await chrome.tabs.sendMessage(session.tabId,{type:'voice-ended',id:session.id}).catch(()=>{});}
async function ensureRecorder(){if(await chrome.offscreen.hasDocument())return;if(!recorderCreating)recorderCreating=chrome.offscreen.createDocument({url:'recorder.html',reasons:['USER_MEDIA'],justification:'Record only an explicitly requested short question for transcription.'}).finally(()=>{recorderCreating=undefined;});await recorderCreating;}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||!message.type?.startsWith('voice-'))return;
 (async()=>{
  if(message.type==='voice-expired'){if(!sender.tab&&sender.url===chrome.runtime.getURL('recorder.html'))await cancelVoice(message.id);return{};}
  if(!sender.tab?.id||sender.frameId!==0)throw new Error('Open voice on the current website.');
  const tabId=sender.tab.id;
  if(message.type==='voice-setup'){await chrome.tabs.create({url:chrome.runtime.getURL('microphone.html')});return{};}
  if(message.type==='voice-cancel'){if(voiceSession?.tabId===tabId)await cancelVoice(message.id);return{};}
  if(message.type==='voice-start'){
   const previous=cancelVoice();const session={id:String(message.id),tabId,url:sender.tab.url,documentId:sender.documentId,abort:new AbortController()};voiceSession=session;
   const check=()=>{if(voiceSession!==session||session.abort.signal.aborted)throw new Error('Recording cancelled');};
   try{
    await previous;check();
    const [active]=await chrome.tabs.query({active:true,lastFocusedWindow:true});check();if(active?.id!==tabId)throw new Error('Keep your website tab active.');
    const {localToken}=await chrome.storage.session.get('localToken');check();if(!localToken)throw new Error('Add the local API token in Connection first.');
    const healthResponse=await fetch('http://127.0.0.1:4313/api/health',{headers:{Authorization:`Bearer ${localToken}`},signal:AbortSignal.any([session.abort.signal,AbortSignal.timeout(5000)])});check();
    if(!healthResponse.ok)throw new Error('Connect your local guide before using voice.');
    const health=await healthResponse.json();check();if(health.modes?.Transcription!=='elevenlabs-live')throw new Error('Voice input needs ELEVENLABS_API_KEY on your backend. Text guidance is ready.');
    await ensureRecorder();check();await recorderRequest('start',session.id);
    if(voiceSession!==session){await recorderRequest('cancel',session.id);throw new Error('Recording cancelled');}return{};
   }catch(error){await cancelVoice(session.id);throw error;}
  }
  const session=voiceSession;if(!session||session.tabId!==tabId||session.id!==message.id||session.documentId!==sender.documentId)throw new Error('Recording ended. Try again.');
  if(message.type==='voice-stop'){
   try{const recording=await recorderRequest('stop',session.id);if(voiceSession!==session)throw new Error('Recording cancelled');
    const {localToken}=await chrome.storage.session.get('localToken');
    const response=await fetch('http://127.0.0.1:4313/api/voice/transcribe',{method:'POST',headers:{Authorization:`Bearer ${localToken}`,'Content-Type':'application/json'},body:JSON.stringify(recording),signal:AbortSignal.any([session.abort.signal,AbortSignal.timeout(35000)])});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Transcription unavailable');
    if(voiceSession!==session)throw new Error('Recording cancelled');return result;
   }finally{if(voiceSession===session)voiceSession=undefined;}
  }
  throw new Error('Unknown voice request');
 })().then(result=>reply({ok:true,result})).catch(error=>reply({ok:false,error:error.message}));return true;
});
chrome.tabs.onActivated.addListener(({tabId})=>{if(voiceSession&&voiceSession.tabId!==tabId)cancelVoice();});
chrome.tabs.onUpdated.addListener((tabId,change)=>{if(voiceSession?.tabId===tabId&&(change.url||change.status==='loading'))cancelVoice();});
chrome.tabs.onRemoved.addListener(tabId=>{if(voiceSession?.tabId===tabId)cancelVoice();});
chrome.windows.onFocusChanged.addListener(id=>{if(id===chrome.windows.WINDOW_ID_NONE)cancelVoice();});
