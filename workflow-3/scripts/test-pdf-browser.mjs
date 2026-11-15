import {chromium} from 'playwright-core';
import http from 'node:http';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const root=new URL('../../combined-extension',import.meta.url).pathname;
if(!process.env.PDF_TEST_FILE)throw new Error('Set PDF_TEST_FILE to a downloaded public IRS fw2.pdf (2026).');
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname;const file=path==='/test.pdf'?process.env.PDF_TEST_FILE:root+path;const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.pdf')?'application/pdf':'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}}).listen(4337,'127.0.0.1');
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.sent=[];window.chrome={tabs:{getCurrent:async()=>({id:1})},permissions:{request:async()=>true},runtime:{openOptionsPage:async()=>{},sendMessage:async msg=>{window.sent.push(msg);return {ok:true,result:{runId:'abc',stepId:'def',pageId:'pdf',revision:1,result:{kind:'clarification',question:'Are you preparing a W-2 or entering a received W-2?'},sources:[],retrievedSources:[{url:'https://www.irs.gov/instructions/iw2w3',text:'Test instructions for employer name.'}]}};}}};});
try{
await page.goto('http://127.0.0.1:4337/pdf-viewer.html?url='+encodeURIComponent('http://127.0.0.1:4337/test.pdf'));
await page.getByText('Open with AccessPatch',{exact:true}).click();
await page.waitForFunction(()=>document.querySelector('#page-number').textContent.includes('/'),{timeout:30000});
await page.locator('#next').click();await page.waitForFunction(()=>document.querySelector('#page-number').textContent.startsWith('2 /'));
await page.locator('#next').click();await page.waitForFunction(()=>document.querySelector('#page-number').textContent.startsWith('3 /'));
console.log('Fields',await page.locator('input.field').count());
const field=page.locator('input.field').first();await field.fill('PRIVATE_VALUE_NEVER_SEND');await page.locator('#question').fill('What goes here?');await page.locator('#send').click();await page.getByText('Are you preparing a W-2 or entering a received W-2?').waitFor();
const sent=await page.evaluate(()=>window.sent);assert(!JSON.stringify(sent).includes('PRIVATE_VALUE_NEVER_SEND'));assert.match(sent[0].body.snapshot.title,/2026/);assert.match(sent[0].body.snapshot.elements[0].name,/social security/i);assert.equal(await page.locator('summary').textContent(),'View sources');
const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise;const saved=await fs.readFile(await download.path());
await page.route('**/saved.pdf',route=>route.fulfill({contentType:'application/pdf',body:saved}));
const savedValue=await page.evaluate(async()=>{const lib=await import('/vendor/pdfjs/pdf.mjs');const doc=await lib.getDocument({url:'/saved.pdf',isEvalSupported:false,useWasm:false}).promise;const annotations=await(await doc.getPage(3)).getAnnotations();return annotations.find(a=>a.fieldType==='Tx').fieldValue;});assert.equal(savedValue,'PRIVATE_VALUE_NEVER_SEND');
await page.screenshot({path:'/tmp/accesspatch-pdf.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PDF rendering, field entry, value-free request, year detection, clarification and sources PASS');
}catch(e){console.log('STATUS',await page.locator('#status').textContent(),'ERRORS',errors);throw e;}finally{await browser.close();server.close();}
