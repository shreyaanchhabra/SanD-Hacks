import {createBrightDataSourceAdapter} from '../src/brightdata.js';
import {resolve} from 'node:path';
const snapshot={pageId:'public-source-check',revision:1,url:'https://www.usa.gov/help-with-utility-bills',title:'USA.gov utility assistance',headings:['Help with utility bills'],elements:[{id:'public-link',role:'link',name:'Energy assistance',kind:'link' as const,protected:false}],instructions:[]};
const task='What documents are required for energy bill assistance?';
const adapter=createBrightDataSourceAdapter(process.env,resolve(process.env.TASK_STORAGE_DIR??'.data','public-source-cache'));
if(adapter.mode==='not-configured'){console.log('Set BRIGHTDATA_API_KEY and BRIGHTDATA_SERP_ZONE.');process.exitCode=2;}
else{try{const sources=await adapter.retrieveContext(task,snapshot);console.log(JSON.stringify({outcome:adapter.outcomeFor?.(task,snapshot),sources:sources.map(({url,retrievedAt})=>({url,retrievedAt}))},null,2));if(!sources.length)process.exitCode=2;}catch{console.log(JSON.stringify({outcome:adapter.outcomeFor?.(task,snapshot)??{status:'provider-failure',message:'External instructions unavailable.'}}));process.exitCode=1;}}
