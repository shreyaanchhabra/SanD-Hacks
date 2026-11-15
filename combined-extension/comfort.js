(() => {
 const choices=[['larger','Offer larger text'],['shorter','Offer shorter explanations'],['spoken','Offer spoken guidance'],['keyboard','Help me navigate by keyboard'],['quiet','Offer a quieter reading view']];
 const kinds=['larger','shorter','navigate','keyboard','quiet','spoken'];
 const clean=value=>{const out={};for(const [key]of choices)out[key]=value?.[key]===true;out.never=Array.isArray(value?.never)?value.never.filter(key=>kinds.includes(key)):[];out.always=Array.isArray(value?.always)?value.always.filter(key=>kinds.includes(key)):[];return out;};
 function pick(preferences,features,dismissed){const p=clean(preferences),blocked=new Set([...(dismissed||[]),...p.never]);const conditions={larger:p.larger&&(features.smallText||p.always.includes('larger')),shorter:p.shorter&&features.dense&&features.canExplain!==false,navigate:features.hasTask&&features.hasMatches,keyboard:p.keyboard&&features.landmarks,quiet:p.quiet&&features.hasMain,spoken:p.spoken&&features.hasStep};return kinds.find(kind=>conditions[kind]&&!blocked.has(kind))||null;}
 globalThis.__apComfortPolicy={pick,clean};
 globalThis.__apMountComfort=({header,panel,tools,getTask,hasStep,canExplain,getExplanation,onExplain,onSpeak})=>{
  const make=(tag,text,parent,attrs={})=>{const el=document.createElement(tag);if(text)el.textContent=text;Object.assign(el,attrs);parent?.append(el);return el;};
  const button=make('button','Comfort',header);button.setAttribute('aria-expanded','false');
  const sheet=make('section',null,panel,{className:'comfort-sheet',hidden:true});sheet.setAttribute('aria-label','Comfort preferences');panel.insertBefore(sheet,panel.querySelector('.bubble'));
  make('p','What helps you?',sheet,{className:'comfort-title'});make('p','Optional. Saved only in this browser. No needs are inferred.',sheet,{className:'subtle'});
  const profileLabel=make('label','Using this browser',sheet);const profile=make('select',null,profileLabel);profile.setAttribute('aria-label','Preference profile');for(const [value,text]of [['personal','My setup'],['other','Another person'],['guest','Guest · not saved']])make('option',text,profile,{value});
  const inputs={};for(const [key,text]of choices){const label=make('label',null,sheet,{className:'comfort-choice'});inputs[key]=make('input',null,label,{type:'checkbox'});label.append(document.createTextNode(text));}
  const row=make('div',null,sheet,{className:'actions'});const done=make('button','Done',row),reset=make('button','Reset preferences',row);
  const card=make('section',null,panel,{className:'comfort-suggestion',hidden:true});card.setAttribute('aria-label','Comfort suggestion');panel.insertBefore(card,panel.querySelector(':scope > .actions'));
  const message=make('p','',card),actions=make('div',null,card,{className:'actions'});const action=make('button','',actions),dismiss=make('button','Dismiss',actions);dismiss.setAttribute('aria-label','Dismiss suggestion');
  const note=make('p','',card,{className:'subtle'}),destinations=make('div',null,card,{className:'comfort-destinations'});
  const feedback=make('details',null,card);make('summary','Suggestion preferences',feedback);const always=make('button','Always offer this',feedback),never=make('button','Don’t suggest this again',feedback);
  const undoArea=make('div',null,panel,{className:'comfort-undo',hidden:true});const undo=make('button','Undo page changes',undoArea);const notice=make('p','',undoArea,{className:'subtle'});notice.setAttribute('role','status');
  let saved={active:'personal',profiles:{personal:clean(),other:clean()},onboarded:false},guest=clean(),ready=false,pageKey='',silenced=false,used=new Set(),kind,preview,explanationDraft,explanationStamp,rollbacks=[];
  const preferences=()=>saved.active==='guest'?guest:saved.profiles[saved.active];
  const persist=()=>chrome.storage.local.set({comfortPreferences:{active:saved.active,profiles:saved.profiles,onboarded:saved.onboarded}});
  function syncInputs(){profile.value=saved.active;for(const[key]of choices)inputs[key].checked=!!preferences()[key];}
  function restore(){explanationDraft=undefined;explanationStamp=undefined;destinations.replaceChildren();if(preview){preview();preview=undefined;}while(rollbacks.length)rollbacks.pop()();undoArea.hidden=true;notice.textContent='';}
  function open(){sheet.hidden=false;button.setAttribute('aria-expanded','true');card.hidden=true;syncInputs();profile.focus();}
  function close(){sheet.hidden=true;button.setAttribute('aria-expanded','false');refresh();button.focus();}
  button.addEventListener('click',event=>{if(!event.isTrusted)return;if(sheet.hidden)open();else close();});
  sheet.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
  done.addEventListener('click',async event=>{if(!event.isTrusted)return;saved.onboarded=true;await persist();close();});
  profile.addEventListener('change',async()=>{restore();saved.active=['personal','other','guest'].includes(profile.value)?profile.value:'guest';used.clear();silenced=false;await persist();syncInputs();});
  for(const[key]of choices)inputs[key].addEventListener('change',async event=>{if(!event.isTrusted)return;preferences()[key]=inputs[key].checked;used.delete(key);silenced=false;await persist();});
  reset.addEventListener('click',async event=>{if(!event.isTrusted)return;restore();if(saved.active==='guest')guest=clean();else saved.profiles[saved.active]=clean();used.clear();silenced=false;await persist();syncInputs();});
  undo.addEventListener('click',event=>{if(!event.isTrusted)return;restore();used.add(kind);refresh();});
  const copy={larger:['Some text is small. Try a larger, more spaced-out view?','Preview larger text'],shorter:['These instructions are long. Want one step at a time?','Explain one step at a time'],navigate:['Want to jump to the part about your task?','Find relevant sections'],keyboard:['Jump to a heading using your keyboard.','Choose a heading'],quiet:['Want a quieter background and a clear reading area?','Preview reading focus'],spoken:['Would you like this instruction read aloud?','Read this step aloud']};
  function refresh(){
   if(!ready)return;const nextPage=location.origin+location.pathname;if(nextPage!==pageKey){restore();pageKey=nextPage;used.clear();silenced=false;}
   if(!sheet.hidden){card.hidden=true;return;}if(preview||explanationDraft){card.hidden=false;return;}
   action.disabled=false;dismiss.disabled=false;destinations.replaceChildren();feedback.hidden=false;note.textContent='';
   if(!saved.onboarded){kind='welcome';card.hidden=false;message.textContent='Make this comfortable for you.';action.textContent='Choose preferences';dismiss.textContent='Not now';feedback.hidden=true;return;}
   const features=tools.features(getTask());features.hasStep=hasStep();features.canExplain=canExplain();kind=silenced?null:pick(preferences(),features,[...used]);card.hidden=!kind;if(!kind)return;
   [message.textContent,action.textContent]=copy[kind];dismiss.textContent='Dismiss';note.textContent=kind==='shorter'?'Review the instruction text before sharing it with Gemini.':kind==='spoken'?'Uses your configured speech provider.':'Local page tool · no AI request';
  }
  dismiss.addEventListener('click',async event=>{if(!event.isTrusted)return;if(preview){preview();preview=undefined;used.add(kind);refresh();return;}explanationDraft=undefined;explanationStamp=undefined;destinations.replaceChildren();if(kind==='welcome'){saved.onboarded=true;await persist();}else{used.add(kind);silenced=true;}refresh();});
  always.addEventListener('click',async event=>{if(!event.isTrusted||!kinds.includes(kind))return;const p=preferences();p.always=[...new Set([...p.always,kind])];await persist();note.textContent='We’ll offer this when it can help. Changes still need your choice.';feedback.open=false;});
  never.addEventListener('click',async event=>{if(!event.isTrusted||!kinds.includes(kind))return;preferences().never=[...new Set([...preferences().never,kind])];silenced=true;await persist();refresh();});
  action.addEventListener('click',async event=>{
   if(!event.isTrusted)return;
   try{
    if(kind==='welcome'){open();return;}
    if(preview){rollbacks.push(preview);preview=undefined;used.add(kind);undoArea.hidden=false;notice.textContent='Kept for this page. Undo is always available.';refresh();return;}
    if(kind==='larger'||kind==='quiet'){preview=tools.preview(kind);message.textContent='Preview on this page. Does it feel better?';action.textContent='Keep for this page';dismiss.textContent='Undo';dismiss.setAttribute('aria-label','Undo');feedback.hidden=true;note.textContent='Original text and website controls remain available.';return;}
    if(kind==='navigate'||kind==='keyboard'){
     const items=tools.destinations(getTask(),kind==='keyboard');destinations.replaceChildren();for(const item of items){const target=make('button',item.text,destinations);make('p',kind==='keyboard'?'Focus this heading without activating a link.':'Matches your task · '+item.context,destinations,{className:'subtle'});target.addEventListener('click',event=>{if(event.isTrusted)tools.locate(item,true);});}note.textContent=items.length?'Choose a destination. You stay in control.':'No matching destinations on this page.';action.disabled=true;return;
    }
    if(kind==='shorter'&&!explanationDraft){const context=getExplanation();if(!context.text){note.textContent='No suitable instruction text found. Ask your companion about a specific label instead.';return;}const label=make('label','Text to explain',destinations);explanationDraft=make('textarea',null,label,{value:context.text,rows:3,maxLength:1400});explanationStamp=context.stamp;action.textContent='Explain reviewed text';message.textContent='Keep only the instructions you want explained.';note.textContent='This text goes to Gemini. Remove private information before sending.';feedback.hidden=true;return;}
    const selected=kind;action.disabled=true;if(kind==='shorter'){if(getExplanation().stamp!==explanationStamp)throw new Error('The page changed. Dismiss and review the text again.');const text=explanationDraft.value.trim();if(!text)throw new Error('Keep some instruction text to explain.');await onExplain(text);explanationDraft=undefined;destinations.replaceChildren();}if(kind==='spoken')await onSpeak();used.add(selected);refresh();
   }catch(error){note.textContent=error.message;action.disabled=false;}
  });
  const originalRefresh=refresh;refresh=()=>{if(!preview)dismiss.setAttribute('aria-label','Dismiss suggestion');originalRefresh();};
  const timer=setInterval(()=>{if(!document.hidden&&!panel.hidden&&!preview&&destinations.childElementCount===0)refresh();},4000);window.addEventListener('pagehide',()=>{clearInterval(timer);restore();});
  (async()=>{const stored=(await chrome.storage.local.get('comfortPreferences')).comfortPreferences;saved={active:['personal','other','guest'].includes(stored?.active)?stored.active:'personal',profiles:{personal:clean(stored?.profiles?.personal),other:clean(stored?.profiles?.other)},onboarded:stored?.onboarded===true};ready=true;syncInputs();refresh();})().catch(()=>{ready=true;refresh();});
  return{refresh,restore};
 };
})();
