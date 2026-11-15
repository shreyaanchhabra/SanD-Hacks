import {getDocument,GlobalWorkerOptions} from './vendor/pdfjs/pdf.mjs';
import {publicPdfUrl,fieldContext} from './pdf-context.mjs';
GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
const $=id=>document.getElementById(id);
let url, pdf, pageNumber=1, selected=null, state=null, revision=0, selectionVersion=0, rendering=false;
const clarifications=[];
let identity='PDF form — identity and year unconfirmed', links=[];
const pageId=crypto.randomUUID();
const values=new Map(), conversations=new Map();
function point(viewport,x,y){const [a,b,c,d,e,f]=viewport.transform;return [a*x+c*y+e,b*x+d*y+f];}
async function message(data){const tab=await chrome.tabs.getCurrent();const response=await chrome.runtime.sendMessage({...data,tabId:tab?.id});if(!response?.ok)throw new Error(response?.error||'Unable to connect.');return response.result;}
function status(text){$('status').textContent=text;}
try{url=publicPdfUrl(new URL(location.href).searchParams.get('url'));}catch{status('This PDF link is invalid. Return to the original website.');$('open').disabled=true;}
$('settings').onclick=()=>chrome.runtime.openOptionsPage();
$('original').onclick=()=>message({type:'pdf-original',url}).catch(e=>status(e.message));
$('open').onclick=async()=>{
 try{
 const allowed=await chrome.permissions.request({origins:[new URL(url).origin+'/*']});
 if(!allowed){status('Site access was not granted. You can still view the original.');return;}
 $('open').disabled=true;status('Opening your PDF…');
 const response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('Unable to load this PDF. Try View original.');
 if(Number(response.headers.get('content-length'))>25000000)throw new Error('This PDF is too large. Use View original.');
 const reader=response.body.getReader();let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>25000000){await reader.cancel();throw new Error('This PDF is too large. Use View original.');}chunks.push(value);}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
 pdf=await getDocument({data,isEvalSupported:false,enableXfa:false,useWasm:false,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true}).promise;
 // Only form identity patterns are retained from document text, never the full text.
 for(let i=1;i<=Math.min(pdf.numPages,3);i++){
 const page=await pdf.getPage(i),content=await page.getTextContent();
 const text=content.items.map(x=>x.str||'').join(' ');
 if(/\bW[–-]?2\b/i.test(text)){
 const year=text.match(/(?:Statement\s+|Form\s+W-2\s+)(20\d{2})\b/i)?.[1]||text.match(/\b(20\d{2})\b/)?.[1];
 identity='Form W-2'+(year?' '+year:' — year unconfirmed');
 }
 const annotations=await page.getAnnotations();
 for(const a of annotations){if(a.subtype==='Link'&&a.url){try{const u=new URL(a.url);if(u.protocol==='https:'&&!u.search&&!u.hash&&!u.username&&!u.password&&!/\.pdf$/i.test(u.pathname))links.push(u.href);}catch{}}}
 }
 links=[...new Set(links)].slice(0,5);
 $('welcome').hidden=true;$('workspace').hidden=false;$('download').hidden=false;
 await render();
 }catch(e){status(e.message||'Unable to open this PDF. Use View original.');$('open').disabled=false;}
};
function select(field){if(selected?.id===field.id&&selected?.page===field.page)return;selected=field;selectionVersion++;state=conversations.get(field.page+':'+field.id)||null;$('selected').textContent=identity+' · Page '+pageNumber+' · '+field.label;$('answer').textContent='';$('sources').textContent='No sources retrieved for this field yet.';$('send').disabled=false;}
async function render(){
 if(rendering)return;rendering=true;selected=null;state=null;selectionVersion++;$('send').disabled=true;$('selected').textContent='Select a field in the PDF.';$('answer').textContent='';$('sources').textContent='No sources retrieved for this field yet.';
 try{
 const page=await pdf.getPage(pageNumber);const viewport=page.getViewport({scale:Number($('zoom').value)});const canvas=document.querySelector('canvas');
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);$('fields').replaceChildren();
 await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 const annotations=await page.getAnnotations();const labelItems=(await page.getTextContent()).items;let count=0;
 for(const a of annotations){
 if(a.subtype!=='Widget'||!['Tx','Btn','Ch'].includes(a.fieldType))continue;
 const field=fieldContext(a,pageNumber,labelItems,annotations.filter(x=>x.subtype==='Widget'));const rect=[...point(viewport,a.rect[0],a.rect[1]),...point(viewport,a.rect[2],a.rect[3])];let control;
 if(a.fieldType==='Tx'){control=document.createElement('input');control.type='text';control.value=values.get(a.id)??a.fieldValue??'';}
 else if(a.fieldType==='Ch'){control=document.createElement('select');for(const option of a.options||[]){const el=document.createElement('option');el.textContent=option.displayValue;el.value=option.exportValue;control.append(el);}control.value=values.get(a.id)??a.fieldValue?.[0]??'';}
 else if(a.checkBox){control=document.createElement('input');control.type='checkbox';control.checked=values.get(a.id)??(a.fieldValue!=='Off'&&!!a.fieldValue);}
 else continue;
 control.className='field';control.setAttribute('aria-label',field.label);control.title=field.label;control.disabled=!!a.readOnly;
 Object.assign(control.style,{left:Math.min(rect[0],rect[2])+'px',top:Math.min(rect[1],rect[3])+'px',width:Math.abs(rect[2]-rect[0])+'px',height:Math.abs(rect[3]-rect[1])+'px'});
 control.addEventListener('focus',()=>select(field));control.addEventListener('click',()=>{if(selected?.id!==field.id)select(field);});
 control.addEventListener('input',()=>{const value=control.type==='checkbox'?control.checked:control.value;values.set(a.id,value);pdf.annotationStorage.setValue(a.id,{value});});
 $('fields').append(control);count++;
 }
 // Text-only PDFs: make printed text selectable as a label, never read editable values.
 if(!count){const content=await page.getTextContent();for(const [index,item] of content.items.entries()){
 if(!item.str?.trim())continue;const position=point(viewport,item.transform[4],item.transform[5]);
 const button=document.createElement('button');button.className='field';button.setAttribute('aria-label',item.str);button.title=item.str;
 Object.assign(button.style,{left:position[0]+'px',top:(position[1]-Math.abs(item.height*viewport.scale))+'px',width:Math.max(12,item.width*viewport.scale)+'px',height:Math.max(12,item.height*viewport.scale)+'px'});
 button.onclick=()=>select({id:'text-'+index,label:item.str.slice(0,160),page:pageNumber});$('fields').append(button);
 }status(content.items.length?'Select a printed label to ask about it. This page has no fillable fields.':'This page appears scanned. Text recognition is not supported yet; use View original.');}
 else status('Select a highlighted field to ask about it.');
 $('page-number').textContent=pageNumber+' / '+pdf.numPages;$('previous').disabled=pageNumber===1;$('next').disabled=pageNumber===pdf.numPages;
 }catch(e){status('Could not render this page: '+e.message);}finally{rendering=false;}
}
$('previous').onclick=()=>{if(!rendering&&pageNumber>1){pageNumber--;void render();}};
$('next').onclick=()=>{if(!rendering&&pageNumber<pdf.numPages){pageNumber++;void render();}};
$('zoom').onchange=()=>void render();
$('download').onclick=async()=>{try{const bytes=await pdf.saveDocument();const href=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=href;a.download='accesspatch-copy.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(href),10000);}catch{status('Unable to download your copy. Keep this tab open.');}};
$('ask').onsubmit=async event=>{
 event.preventDefault();if(!selected)return;const version=selectionVersion;const field={...selected};$('send').disabled=true;
 $('answer').textContent='Checking instructions…';
 try{
 const snapshot={pageId,revision:++revision,url:new URL(url).origin+'/',title:identity,headings:[identity,'PDF page '+pageNumber],elements:[{id:field.id,role:'textbox',kind:'field',protected:true,name:field.label}],instructions:[],instructionLinks:links};
 const question=$('question').value.trim();if(!question)throw new Error('Enter a question first.');
 let result;state=conversations.get(field.page+':'+field.id)||null;
 if(state){const clarifying=state.result.kind==='clarification';if(clarifying)clarifications.push(question);result=await message({type:'api',path:'/api/tasks/'+state.runId+'/events',body:{eventId:crypto.randomUUID(),stepId:state.stepId,pageId:state.pageId,revision:state.revision,type:clarifying?'clarification-answered':'help-requested',answer:question,snapshot}});}
 else result=await message({type:'api',path:'/api/tasks',body:{task:('Form Helper: '+identity+'. Selected field: '+field.label+'. Question: '+question+'. Prior user clarifications: '+clarifications.slice(-4).join('; ')+'. Confirm form/year if uncertain. For W-2 clarify preparing for an employee versus entering a received W-2 before giving entry advice. Separate sourced instructions from explanation.').slice(0,2000),snapshot}});
 conversations.set(field.page+':'+field.id,result);if(version!==selectionVersion)return;state=result;
 const answer=result.result;$('answer').textContent=answer.kind==='guidance'?'Plain-language explanation\n'+answer.instruction+'\n\n'+answer.explanation:answer.kind==='clarification'?answer.question:answer.reason;
 $('sources').replaceChildren();const sources=result.retrievedSources?.length?result.retrievedSources:result.sources||[];
 if(!sources.length)$('sources').textContent='No authoritative passages were retrieved. '+(result.analysis?.retrievalMessage||'');
 else{const heading=document.createElement('strong');heading.textContent='What the instructions say';$('sources').append(heading);for(const source of sources){try{if(new URL(source.url).protocol!=='https:')continue;}catch{continue;}const p=document.createElement('p'),a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=new URL(source.url).hostname;const excerpt=document.createElement('p');excerpt.textContent=source.text;p.append(a,excerpt);$('sources').append(p);}}
 $('question').value='';
 }catch(e){if(version===selectionVersion)$('answer').textContent=e.message;}finally{if(version===selectionVersion)$('send').disabled=false;}
};
