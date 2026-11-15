import {test} from 'node:test';
import assert from 'node:assert/strict';
const helper = await import('../../combined-extension/pdf-context.mjs');
test('recognizes PDF paths without accepting unsafe protocols',()=>{
 assert.equal(helper.isPdfUrl('https://www.irs.gov/pub/irs-pdf/fw2.pdf?x=1'),true);
 assert.equal(helper.isPdfUrl('https://example.org/pdf-page'),false);
 assert.equal(helper.isPdfUrl('file:///tmp/a.pdf'),false);
 assert.throws(()=>helper.publicPdfUrl('javascript:alert(1)'));
});
test('field snapshot excludes values and opaque field names',()=>{
 const result=helper.fieldContext({id:'f1',alternativeText:'Employer name',fieldName:'private-name',fieldValue:'SECRET',rect:[0,0,20,20]},1);
 assert.equal(result.label,'Employer name');
 assert.equal(JSON.stringify(result).includes('SECRET'),false);
 assert.equal(JSON.stringify(result).includes('private-name'),false);
});
import {BrightDataSourceAdapter,MemoryPublicSourceCache} from '../src/brightdata.js';
import {snapshotSchema} from '../src/contracts.js';
test('PDF linked instructions precede search and form year survives query/cache',async()=>{
 const calls:string[]=[];
 const adapter=new BrightDataSourceAdapter({cache:new MemoryPublicSourceCache(),provider:{discover:async q=>{calls.push(q);return ['https://www.irs.gov/instructions/iw2w3'];},fetchPage:async url=>{calls.push(url);return {url,html:'<p>Employer name on Form W-2: use the employer name and address for tax year 2026.</p>'};}}});
 const snapshot=snapshotSchema.parse({pageId:'pdf',revision:1,url:'https://www.irs.gov/',title:'Form W-2 2026',headings:[],elements:[{id:'name',role:'textbox',name:'Employer name',kind:'field',protected:true}],instructions:[],instructionLinks:['https://www.irs.gov/instructions/iw2w3']});
 await adapter.retrieveContext('Form Helper explain employer name',snapshot);
 assert.equal(calls[0],'https://www.irs.gov/instructions/iw2w3');
 calls.length=0;
 await adapter.retrieveContext('Form Helper explain employer name',{...snapshot,title:'Form W-2 2025',instructionLinks:[]});
 assert.match(calls[0],/W-2 2025/);
});

test('broken linked instructions fall back to search',async()=>{
 const calls:string[]=[];
 const adapter=new BrightDataSourceAdapter({cache:new MemoryPublicSourceCache(),provider:{discover:async q=>{calls.push('search');return ['https://www.irs.gov/instructions/iw2w3'];},fetchPage:async url=>{if(url.endsWith('missing'))throw new Error('404');return {url,html:'<p>Employer name and employee wages on Form W-2 for tax year 2026.</p>'};}}});
 const sources=await adapter.retrieveContext('Explain employer name',{pageId:'pdf',revision:1,url:'https://www.irs.gov/',title:'Form W-2 2026',headings:[],elements:[{id:'f',kind:'field',role:'textbox',name:'Employer name',protected:true}],instructions:[],instructionLinks:['https://www.irs.gov/missing']});
 assert.deepEqual(calls,['search']);assert.ok(sources.length);
});
test('unlabelled PDF widgets use nearby printed labels, not widget contents',()=>{
 const a={id:'f',rect:[10,10,100,30],fieldValue:'SECRET'};
 const items=[{str:'SECRET',transform:[1,0,0,1,12,15]},{str:'Employer name',transform:[1,0,0,1,12,34]}];
 assert.equal(helper.fieldContext(a,1,items,[a]).label,'Employer name');
});
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('PDF arrival routes automatically and original bypass prevents a loop',async()=>{
 const values:Record<string,unknown>={};const updates:unknown[]=[];const url='https://www.irs.gov/pub/irs-pdf/fw2.pdf';
 const context=vm.createContext({URL,chrome:{runtime:{getURL:(p:string)=>'chrome-extension://test/'+p},storage:{session:{get:async()=>values,remove:async()=>{}}},tabs:{get:async()=>({url}),update:async(id:number,data:unknown)=>updates.push(data),onUpdated:{addListener:()=>{}},onRemoved:{addListener:()=>{}}}}});
 vm.runInContext(await readFile(new URL('../../combined-extension/pdf-routing.js',import.meta.url),'utf8'),context);
 await vm.runInContext(`routePdf(1,${JSON.stringify(url)})`,context);assert.equal(updates.length,1);
 values['pdf-original-1']=url;
 await vm.runInContext(`routePdf(1,${JSON.stringify(url)})`,context);assert.equal(updates.length,1);
 await vm.runInContext("routePdf(2,'javascript:alert(1)')",context);assert.equal(updates.length,1);
});
