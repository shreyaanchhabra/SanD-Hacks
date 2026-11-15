(() => {
 const kinds=['navigate','larger','simple','quiet'];
 const clean=value=>({suggestions:value?.suggestions!==false,never:Array.isArray(value?.never)?value.never.filter(key=>kinds.includes(key)):[]});
 function pick(preferences,features,dismissed=[]){const p=clean(preferences);if(!p.suggestions||features.active)return null;const blocked=new Set([...dismissed,...p.never]);const available={navigate:features.hasTask&&features.hasMatches,larger:features.smallText,simple:features.clutter,quiet:features.dense&&features.hasMain};return kinds.find(kind=>available[kind]&&!blocked.has(kind))||null;}
 globalThis.__apComfortPolicy={pick,clean};
 globalThis.__apMountComfort=({panel,tools,getTask})=>{
  const make=(tag,text,parent,attrs={})=>{const el=document.createElement(tag);if(text)el.textContent=text;Object.assign(el,attrs);parent?.append(el);return el;};
  const dock=make('aside',null,panel.getRootNode(),{className:'comfort-dock'});dock.setAttribute('aria-label','Page comfort');
  const header=make('div',null,dock,{className:'comfort-dock-header'}),title=make('div',null,header);make('strong','Page comfort',title);make('span','Your page, your pace',title);
  const collapse=make('button','−',header);const body=make('div',null,dock,{className:'comfort-dock-body'});
  function setCollapsed(value){body.hidden=value;dock.classList.toggle('is-collapsed',value);collapse.textContent=value?'+':'−';collapse.setAttribute('aria-label',value?'Expand page comfort':'Collapse page comfort');collapse.setAttribute('aria-expanded',String(!value));}
  setCollapsed(matchMedia('(max-width:600px)').matches);collapse.addEventListener('click',event=>{if(event.isTrusted)setCollapsed(!body.hidden);});
  dock.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setCollapsed(true);collapse.focus();}});
  const card=make('section',null,body,{className:'comfort-suggestion'});card.setAttribute('aria-label','Comfort suggestion');make('h2','Suggested for this page',card);
  const message=make('p','',card),actions=make('div',null,card,{className:'actions'}),action=make('button','',actions),dismiss=make('button','Dismiss',actions);dismiss.setAttribute('aria-label','Dismiss suggestion');
  const destinations=make('div',null,card,{className:'comfort-destinations'});
  const adjustments=make('section',null,body,{className:'comfort-adjustments'});adjustments.setAttribute('aria-label','Page adjustments');make('h2','Page adjustments',adjustments);
  const grid=make('div',null,adjustments,{className:'comfort-adjustment-grid'}),buttons={};
  for(const [kind,label]of [['simple','Simple'],['larger','Larger text'],['contrast','High contrast'],['quiet','Reading focus']]){const button=make('button',label,grid);buttons[kind]=button;button.setAttribute('aria-pressed','false');button.addEventListener('click',event=>{if(!event.isTrusted)return;tools.activate(kind);silenced=true;destinations.replaceChildren();sync();refresh();});}
  const restoreButton=make('button','Restore',adjustments,{className:'comfort-restore'});const status=make('p','',adjustments,{className:'subtle'});status.setAttribute('role','status');
  const options=make('details',null,body,{className:'comfort-options'});make('summary','Suggestion settings',options);
  const label=make('label',null,options,{className:'comfort-choice'}),enabled=make('input',null,label,{type:'checkbox',checked:true});label.append(document.createTextNode('Suggest helpful adjustments'));
  const profileLabel=make('label','Using this browser',options),profile=make('select',null,profileLabel);profile.setAttribute('aria-label','Preference profile');for(const [value,text]of [['personal','My setup'],['other','Another person'],['guest','Guest · not saved']])make('option',text,profile,{value});
  make('p','Preferences stay in this browser.',options,{className:'subtle'});
  let saved={active:'personal',profiles:{personal:clean(),other:clean()}},guest=clean(),ready=false,pageKey=location.href,silenced=false,kind;
  const preferences=()=>saved.active==='guest'?guest:saved.profiles[saved.active];
  const persist=()=>chrome.storage.local.set({comfortPreferences:saved});
  const copy={navigate:['Jump to the part about your task.','Find relevant sections'],larger:['Some text is small. Make it easier to read.','Use larger text'],simple:['Less clutter, the same main content.','Use Simple'],quiet:['Give the main reading area a little focus.','Use reading focus']};
  function sync(){const active=tools.active();for(const[key,button]of Object.entries(buttons))button.setAttribute('aria-pressed',String(active===key));restoreButton.disabled=!active;status.textContent=active==='simple'?'Clutter hidden. Main content keeps its original style.':active?'Applied to this page. Restore anytime.':'';}
  function refresh(){if(!ready)return;if(location.href!==pageKey){pageKey=location.href;silenced=false;destinations.replaceChildren();}sync();if(destinations.childElementCount)return;kind=silenced?null:pick(preferences(),tools.features(getTask()));actions.hidden=!kind;if(!kind){message.textContent=tools.active()?'Your adjustment is on.':'No suggestions right now. Page adjustments are always available below.';return;}[message.textContent,action.textContent]=copy[kind];action.disabled=false;}
  function restore(){tools.restoreAppearance();destinations.replaceChildren();silenced=true;sync();refresh();}
  restoreButton.addEventListener('click',event=>{if(event.isTrusted)restore();});
  dismiss.addEventListener('click',event=>{if(!event.isTrusted)return;silenced=true;destinations.replaceChildren();refresh();});
  enabled.addEventListener('change',async event=>{if(!event.isTrusted)return;preferences().suggestions=enabled.checked;silenced=false;destinations.replaceChildren();await persist();refresh();});
  profile.addEventListener('change',async()=>{tools.restoreAppearance();saved.active=['personal','other','guest'].includes(profile.value)?profile.value:'guest';enabled.checked=preferences().suggestions;silenced=false;destinations.replaceChildren();await persist();refresh();});
  action.addEventListener('click',event=>{if(!event.isTrusted||!kind)return;if(kind==='navigate'){for(const item of tools.destinations(getTask())){const target=make('button',item.text,destinations);target.addEventListener('click',e=>{if(e.isTrusted)tools.locate(item,true);});}action.disabled=true;return;}tools.activate(kind);silenced=true;sync();refresh();});
  const timer=setInterval(()=>{if(!document.hidden&&!body.hidden)refresh();},4000);window.addEventListener('pagehide',()=>clearInterval(timer));
  (async()=>{const stored=(await chrome.storage.local.get('comfortPreferences')).comfortPreferences;saved={active:['personal','other','guest'].includes(stored?.active)?stored.active:'personal',profiles:{personal:clean(stored?.profiles?.personal),other:clean(stored?.profiles?.other)}};profile.value=saved.active;enabled.checked=preferences().suggestions;ready=true;refresh();})().catch(()=>{ready=true;refresh();});
  return{refresh,restore};
 };
})();
