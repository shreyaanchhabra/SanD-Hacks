(() => {
 if(window.top!==window.self||globalThis.__apMountTools)return;
 const state={appearance:null,simplified:false,matches:[],current:-1,task:''};
 const protectedWords=/error|invalid|required|deadline|due date|cost|fee|consent|privacy|security|official|help|cancel|back|return|recover/i;
 const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
 const visible=element=>element instanceof Element&&!element.closest('#accesspatch-guide,[hidden],[aria-hidden="true"],[inert]')&&getComputedStyle(element).visibility!=='hidden'&&getComputedStyle(element).display!=='none'&&element.getClientRects().length>0;
 function safeText(element,limit=100){
  if(!element||!visible(element)||element.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))return'';
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let text='',node;
  while((node=walker.nextNode())&&text.length<limit*3)if(node.parentElement&&!node.parentElement.closest('input,select,textarea,script,style,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')&&visible(node.parentElement))text+=' '+node.textContent;
  return text.replace(/\s+/g,' ').trim().slice(0,limit);
 }
 function labelFor(element){
  const labelled=(element.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean).map(id=>safeText(document.getElementById(id))).join(' ');
  const label=Array.from(element.labels||[]).map(node=>safeText(node)).join(' ');
  const heading=element.matches('a,button')?element.querySelector('h1,h2,h3,h4,h5,h6'):null;
  const field=element.matches('input,select,textarea,[role="textbox"]');
  return(labelled||element.getAttribute('aria-label')||label||safeText(heading)||(!field?safeText(element):'')).replace(/\s+/g,' ').trim().slice(0,96);
 }
 function terms(text){const stop=new Set(['the','and','for','with','help','find','how','can','this','that','want','need','please','would','like','have','your','page']);return text.toLowerCase().split(/\W+/).filter(word=>word.length>2&&!stop.has(word));}
 function itemTextIncludes(text,word){return text.toLowerCase().includes(word);}
 function clearHighlights(){document.querySelectorAll('.apc-hit,.apc-current').forEach(element=>element.classList.remove('apc-hit','apc-current'));state.matches=[];state.current=-1;}
 function searchables(){
  return Array.from(document.querySelectorAll('a[href],button,h1,h2,h3,h4,input,select,textarea,[role="textbox"]')).filter(visible).filter(e=>!e.matches('input[type="hidden"],input[type="password"]')).map(element=>{
   const text=labelFor(element);const actionable=element.matches('a,button,input,select,textarea');
   const container=element.closest('section,article,fieldset');const context=safeText(container?.querySelector('legend,h1,h2,h3,h4'),64)|| (element.closest('main,form,[role="main"]')?'Main content':'Page navigation');
   const description=element.matches('a')?safeText(element.querySelector('p'),140):'';
   return{element,text,context,description,type:element.matches('a')?'Link':element.matches('input,select,textarea')?'Field':element.matches('button')?'Button':'Heading',priority:(actionable?4:1)+(element.closest('main,form,[role="main"]')?2:0)};
  }).filter(item=>item.text);
 }
 function search(query,update=true){
  if(update)clearHighlights();const words=terms(query);if(!words.length)return[];
  const grouped=new Map();
  for(const item of searchables()){
   const score=words.reduce((sum,word)=>sum+(itemTextIncludes(item.text,word)?4:0)+(itemTextIncludes(item.description,word)?1:0),0);if(!score)continue;
   let key=item.text.toLowerCase()+(item.type==='Field'?'|'+item.context:'');if(item.element.matches('a')){try{const url=new URL(item.element.href);if(/^https?:$/.test(url.protocol))key=url.origin+url.pathname+url.hash;}catch{}}
   const candidate={...item,score};const old=grouped.get(key);if(!old||score>old.score||score===old.score&&item.priority>old.priority)grouped.set(key,candidate);
  }
  const ranked=[...grouped.values()].sort((a,b)=>b.score-a.score||b.priority-a.priority);
  // A heading and link with the same short title are one destination; prefer the link.
  const names=new Map();for(const item of ranked){const key=item.text.toLowerCase()+(item.type==='Field'?'|'+item.context:'');const old=names.get(key);if(!old||item.priority>old.priority)names.set(key,item);}
  const results=[...names.values()].sort((a,b)=>b.score-a.score||b.priority-a.priority).slice(0,5);if(update)state.matches=results.map(item=>item.element);return results;
 }
  function importantImage(image) {
    if (!(image instanceof HTMLImageElement) || image.closest("#accesspatch-companion-root")) return false;
    if (image.closest("header,nav,footer,aside")) return false;
    const rect = image.getBoundingClientRect();
    return Boolean(image.alt?.trim() || image.closest("figure")?.querySelector("figcaption")?.textContent.trim() || rect.width >= 160 || rect.height >= 120 || image.naturalWidth >= 160 || image.naturalHeight >= 120);
  }

  function describeImages() {
    document.querySelectorAll(".apc-image-note").forEach((note) => note.remove());
    let count = 0;
    for (const image of document.images) {
      if (!importantImage(image)) continue;
      const caption = image.closest("figure")?.querySelector("figcaption")?.textContent.trim();
      const description = image.alt?.trim() || caption || "No text description is available for this important photo.";
      const inFigure = image.closest("figure");
      const hasCaption = Boolean(inFigure?.querySelector("figcaption"));
      const note = make(inFigure && !hasCaption ? "figcaption" : "p", `Existing image description (not AI analysis): ${description}`, "apc-image-note");
      note.setAttribute("role", "note");
      if (inFigure) {
        inFigure.append(note);
      } else {
        const imageLink = image.closest("a");
        (imageLink || image).insertAdjacentElement("afterend", note);
      }
      count += 1;
    }
    return count;
  }

  function clearPresentationMarkers() {
    document.documentElement.classList.remove("apc-simplify", "apc-easy-read", "apc-low-vision");
    document.querySelectorAll("[data-apc-unrelated],[data-apc-secondary],[data-apc-low-surface],[data-apc-reading-focus]").forEach((element) => {
      element.removeAttribute("data-apc-reading-focus");
      element.removeAttribute("data-apc-unrelated");
      element.removeAttribute("data-apc-secondary");
      element.removeAttribute("data-apc-low-surface");
    });
  }

  function isProtected(element) {
    return protectedWords.test(element.textContent || "") || Boolean(element.querySelector("input,select,textarea,button,[contenteditable='true']"));
  }

  function applySimplification() {
    const main=document.querySelector('main,[role="main"],article');if(main&&visible(main))main.setAttribute('data-apc-reading-focus','true');
  }
  const enlarged=new Map();
  function restoreLarger(){
    for(const [element,properties]of enlarged){for(const [key,old,priority,applied]of properties)if(element.style.getPropertyValue(key)===applied){if(old)element.style.setProperty(key,old,priority);else element.style.removeProperty(key);}}
    enlarged.clear();
  }
  function applyLarger(){
    if(enlarged.size)return;
    const measured=[...document.querySelectorAll('p,li,dt,dd,blockquote,figcaption,label,legend,h1,h2,h3,h4,button,input,textarea,select')].filter(visible).slice(0,500).map(element=>{const c=getComputedStyle(element);return{element,size:parseFloat(c.fontSize),lineHeight:c.lineHeight,height:element.getBoundingClientRect().height};});
    for(const {element,size,lineHeight,height} of measured){if(!Number.isFinite(size))continue;
      const font=Math.max(20,size*1.15),line=Math.max(1.6,(parseFloat(lineHeight)||size*1.4)/size);
      const values=[['font-size',font.toFixed(2)+'px'],['line-height',line.toFixed(2)]];
      if(element.matches('button,input,select'))values.push(['min-height',Math.max(height,font*line+12).toFixed(2)+'px']);
      enlarged.set(element,values.map(([key,value])=>{const old=element.style.getPropertyValue(key),priority=element.style.getPropertyPriority(key);element.style.setProperty(key,value,'important');return[key,old,priority,element.style.getPropertyValue(key)];}));
    }
  }

  function isLightSurface(element) {
    if (!(element instanceof HTMLElement) || element.closest("#accesspatch-companion-root,#accesspatch-guide") || element.matches("img,svg,canvas,video,iframe")) return false;
    const color = getComputedStyle(element).backgroundColor.match(/rgba?\(([^)]+)\)/i);
    if (!color) return false;
    const channels = color[1].split(",").map(Number);
    if (channels.length < 3 || (channels[3] !== undefined && channels[3] < 0.15)) return false;
    const [red, green, blue] = channels;
    return (red * 0.2126 + green * 0.7152 + blue * 0.0722) > 150;
  }

  function applyLowVisionSurfaces() {
    [...document.body.querySelectorAll("*")].slice(0, 1200).forEach((element) => {
      if (isLightSurface(element)) element.setAttribute("data-apc-low-surface", "true");
    });
  }

  function refreshPresentation() {
    clearPresentationMarkers();
    if(state.appearance==='easy-read')applyLarger();else restoreLarger();
    if (state.simplified) {
      document.documentElement.classList.add("apc-simplify");
      applySimplification();
    }
    if (state.appearance) document.documentElement.classList.add(`apc-${state.appearance}`);
    if (state.appearance === "low-vision") applyLowVisionSurfaces();
  }

 function show(element,status){
  if(!element?.isConnected||!visible(element)){status.textContent='This part of the page changed. Find it again.';return;}
  clearHighlights();element.classList.add('apc-current');element.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});status.textContent='Outlined on the original page. You choose the next action.';
 }
 globalThis.__apMountTools=container=>{
  const root=make('div');root.id='accesspatch-companion-root';root.dataset.apcUi='true';
  const panel=make('section',undefined,'apc-panel');panel.setAttribute('aria-label','Page compass');root.append(panel);container.append(root);
  const taskNote=make('p','Local tools · no AI request','apc-task-note');panel.append(taskNote);
  const label=make('label','Find a place on this page');const input=make('input');input.placeholder='Try “taxes” or a field name';input.setAttribute('type','search');label.append(input);panel.append(label);
  const find=make('button','Find on page','primary');panel.append(find);
  const status=make('p','','apc-status');status.setAttribute('role','status');panel.append(status);
  const results=make('ul',undefined,'apc-results');panel.append(results);
  const shortcuts=make('div',undefined,'apc-shortcuts');const required=make('button','Find required fields');const errors=make('button','Find visible errors');const current=make('button','Current step');shortcuts.append(required,errors,current);panel.append(shortcuts);
  const reading=make('details');const summary=make('summary','Reading preferences');reading.append(summary);panel.append(reading);
  const simplify=make('button','Reading focus'),easy=make('button','Larger text'),low=make('button','High contrast'),images=make('button','Show existing image descriptions'),restore=make('button','Restore page');reading.append(simplify,easy,low,images);panel.append(restore);
  const modeButtons={simplify,easy,low};for(const button of Object.values(modeButtons))button.setAttribute('aria-pressed','false');
  const setModes=()=>{for(const[key,button]of Object.entries(modeButtons))button.setAttribute('aria-pressed',String(key==='simplify'?state.simplified:state.appearance===(key==='easy'?'easy-read':'low-vision')));};
  function render(resultsData){
   results.replaceChildren();for(const item of resultsData){const row=make('li',undefined,'apc-result');const copy=make('div');copy.append(make('span',item.type,'apc-kind'),make('strong',item.text,'apc-title'),make('span',item.context+(item.score?' · Matches '+terms(input.value||state.task).filter(word=>itemTextIncludes(item.text,word)||itemTextIncludes(item.description||'',word)).join(', '):''),'apc-context'));const button=make('button','Show');button.setAttribute('aria-label','Show '+item.text+(resultsData.filter(other=>other.text===item.text).length>1?' in '+item.context:''));button.addEventListener('click',event=>{if(event.isTrusted)show(item.element,status);});row.append(copy,button);results.append(row);}
   status.textContent=resultsData.length?`${resultsData.length} distinct ${resultsData.length===1?'destination':'destinations'}. Choose one to locate it.`:'No matching controls or headings. Try a shorter topic or ask your companion.';
  }
  find.addEventListener('click',event=>{if(event.isTrusted)render(search(input.value));});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();render(search(input.value));}});
  function showFields(selector,message){const fields=Array.from(document.querySelectorAll(selector)).filter(visible);clearHighlights();if(!fields.length){status.textContent=message;results.replaceChildren();return;}render(fields.slice(0,5).map(element=>({element,text:labelFor(element)||'Unlabeled field',type:'Field',context:safeText(element.closest('fieldset')?.querySelector('legend'),64)||'Form'})));status.textContent=`${fields.length} fields marked by this page. Filled answers are not read.`;}
  required.addEventListener('click',()=>showFields('input[required],select[required],textarea[required],[aria-required="true"]','No required fields are marked on this page.'));
  errors.addEventListener('click',()=>showFields('[aria-invalid="true"]','No fields are currently marked invalid by this page.'));
  current.addEventListener('click',()=>{try{if(!globalThis.__apPageActions?.showCurrent)throw new Error();globalThis.__apPageActions.showCurrent();}catch{status.textContent='Ask your companion for a current step first.';}});
  simplify.addEventListener('click',()=>{state.simplified=!state.simplified;refreshPresentation();setModes();status.textContent=state.simplified?'Reading area emphasized. Navigation, images and original instructions remain visible.':'Reading focus off.';});
  for(const[button,mode]of [[easy,'easy-read'],[low,'low-vision']])button.addEventListener('click',()=>{state.appearance=state.appearance===mode?null:mode;refreshPresentation();setModes();status.textContent=state.appearance?'Reading preference applied.':'Original reading style restored.';});
  images.addEventListener('click',()=>{const count=describeImages();status.textContent=`${count} existing image descriptions shown. Image pixels were not analyzed.`;});
  restore.addEventListener('click',()=>{clearHighlights();state.appearance=null;state.simplified=false;refreshPresentation();setModes();document.querySelectorAll('.apc-image-note').forEach(note=>note.remove());status.textContent='Original page restored.';});
  globalThis.__apSetTask=task=>{state.task=String(task||'');taskNote.textContent=state.task?'For your task · '+state.task.slice(0,90):'Local tools · no AI request';};
  globalThis.__apPageTools={
   features(task){const paragraphs=[...document.querySelectorAll('p,li,label,legend')].filter(visible).slice(0,120);return{smallText:paragraphs.some(el=>parseFloat(getComputedStyle(el).fontSize)<18),dense:paragraphs.some(el=>safeText(el,600).length>350)||paragraphs.length>18,hasMain:!!document.querySelector('main,[role="main"],article'),hasTask:!!terms(task).length,hasMatches:!!terms(task).length&&search(task,false).length>0,landmarks:this.destinations('',true).length>0};},
   destinations(task,landmarks=false){return(landmarks?searchables().filter(item=>item.type==='Heading'):search(task,false)).slice(0,3);},
   locate(item,keyboard=false){if(!item?.element?.isConnected)return;show(item.element,status);if(keyboard){const el=item.element,old=el.getAttribute('tabindex');if(old===null)el.setAttribute('tabindex','-1');el.focus({preventScroll:true});if(old===null)el.addEventListener('blur',()=>{if(el.getAttribute('tabindex')==='-1')el.removeAttribute('tabindex');},{once:true});}},
   preview(kind){const previous={appearance:state.appearance,simplified:state.simplified};if(kind==='larger')state.appearance='easy-read';if(kind==='quiet')state.simplified=true;refreshPresentation();setModes();return()=>{state.appearance=previous.appearance;state.simplified=previous.simplified;refreshPresentation();setModes();};},
   descriptions:describeImages
  };
  return root;
 };
})();
