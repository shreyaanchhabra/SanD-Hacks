import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {z} from 'zod';
import {resultSchema,type Planner,type PlannerInput,type PlannerResult} from './contracts.js';
import {planStep} from './planner.js';
export const CACHE_VERSION='form-evidence-v2';
export const cacheEntrySchema=z.object({version:z.literal(CACHE_VERSION),createdAt:z.number(),expiresAt:z.number(),result:resultSchema,form:z.record(z.string(),z.unknown()).optional()});
export type CacheEntry=z.infer<typeof cacheEntrySchema>;
export interface GuidanceCache{mode:string;get(key:string):Promise<CacheEntry|null>;put(key:string,entry:CacheEntry):Promise<void>}
export class FileGuidanceCache implements GuidanceCache{
 mode='local';constructor(private directory:string){mkdirSync(directory,{recursive:true,mode:0o700});}
 async get(key:string){try{return cacheEntrySchema.parse(JSON.parse(readFileSync(join(this.directory,key+'.json'),'utf8')));}catch{return null;}}
 async put(key:string,entry:CacheEntry){const file=join(this.directory,key+'.json');writeFileSync(file+'.tmp',JSON.stringify(cacheEntrySchema.parse(entry)),{mode:0o600});renameSync(file+'.tmp',file);}
}
export type GuidanceUsage={cache:'hit'|'miss'|'coalesced'|'bypass';status:'ready'|'cooldown'|'budget'|'provider-error';store:string;providerCalls:number;retryAfterSeconds?:number};
export type EngineResult={result:PlannerResult;usage:GuidanceUsage};
function hash(value:unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function canonical(input:PlannerInput){
 const actualToStable=new Map(input.snapshot.elements.map((element,index)=>[element.id,'control-'+index]));
 const stableToActual=new Map([...actualToStable].map(([actual,stable])=>[stable,actual]));
 const snapshot={...input.snapshot,pageId:'canonical',revision:1,elements:input.snapshot.elements.map(e=>({...e,id:actualToStable.get(e.id)!})),instructions:input.snapshot.instructions.map(i=>({...i,elementId:actualToStable.get(i.elementId)||'unknown'}))};
 const history=input.history.map(item=>{try{const parsed=JSON.parse(item);delete parsed.pageId;if(parsed.result)delete parsed.result.targetId;return JSON.stringify(parsed);}catch{return item;}});
 const payload={version:CACHE_VERSION,task:input.task,snapshot,sources:input.sources,history,pageChange:input.pageChange};
 const fields=snapshot.elements.filter(e=>e.kind==='field').map(({id,name,kind,role,required,inputType,groupLabel,constraints})=>({id,name,kind,role,required,inputType,groupLabel,constraints}));
 const form=fields.length?{origin:snapshot.url,fields}:undefined;
 return{payload,form,actualToStable,stableToActual};
}
function remapResult(raw:PlannerResult,ids:Map<string,string>):PlannerResult{
 const result=structuredClone(raw);
 if(result.kind==='guidance'&&result.targetId)result.targetId=ids.get(result.targetId)||'unresolved';
 if(result.observations)for(const item of result.observations)if(item.elementId)item.elementId=ids.get(item.elementId)||'unresolved';
 if(result.kind==='guidance'&&result.completionEvidence?.elementId)result.completionEvidence.elementId=ids.get(result.completionEvidence.elementId)||'unresolved';
 return result;
}
export function reusableEntry(entry:CacheEntry):CacheEntry{
 const result=entry.result;
 if(result.kind!=='guidance')throw new Error('Only validated guidance is reusable');
 const fieldsSchema=z.array(z.object({id:z.string(),name:z.string(),kind:z.literal('field'),role:z.string().optional(),required:z.boolean().optional(),inputType:z.string().optional(),groupLabel:z.string().optional(),constraints:z.object({min:z.string().optional(),max:z.string().optional(),minLength:z.number().optional(),maxLength:z.number().optional()}).optional()}));
 const fields=entry.form?fieldsSchema.parse(entry.form.fields??[]):[];
 const form=entry.form&&fields.length?{origin:new URL(String(entry.form.origin)).origin+'/',fields}:undefined;
 return{version:CACHE_VERSION,createdAt:entry.createdAt,expiresAt:entry.expiresAt,result:{kind:'guidance',instruction:result.instruction,explanation:result.explanation,targetId:result.targetId,sourceIds:result.sourceIds,expectedOutcome:result.expectedOutcome,...(result.completionEvidence?{completionEvidence:result.completionEvidence}:{})},...(form?{form}:{})};
}
function freshEvidence(input:PlannerInput,result:PlannerResult):PlannerResult{
 if(result.kind!=='guidance')return result;
 const target=input.snapshot.elements.find(e=>e.id===result.targetId);
 return{...result,observations:target?[{basis:'page',elementId:target.id,text:`This page contains “${target.name}”${target.required?' and marks it required':''}.`}]:[],changeSummary:null};
}
function retryDelay(error:unknown){
 const e=error as {message?:string;error?:{details?:unknown[]}};let details=e.error?.details;
 if(!details&&e.message)try{const parsed=JSON.parse(e.message);details=parsed.error?.details||parsed.details;}catch{}
 for(const entry of details||[]){const info=entry as {retryDelay?:string};if(info.retryDelay){const seconds=Number.parseFloat(info.retryDelay);if(Number.isFinite(seconds))return Math.min(86400,Math.max(1,seconds));}}
 return 60;
}
export class GuidanceEngine{
 private cache?:GuidanceCache;private memory=new Map<string,CacheEntry>();private inFlight=new Map<string,{promise:Promise<EngineResult>;ids:Map<string,string>} >();
 private day='';private used=0;private minute:number[]=[];private cooldown=0;private now:()=>number;
 constructor(private options:{planner:Planner;model:string;scope:string;cache?:GuidanceCache;now?:()=>number;dailyBudget?:number;minuteBudget?:number;ttlMs?:number;budgetFile?:string}){
  this.cache=options.cache;this.now=options.now??Date.now;
  if(options.budgetFile)try{const saved=JSON.parse(readFileSync(options.budgetFile,'utf8'));this.day=String(saved.day||'');this.used=Number(saved.used)||0;this.cooldown=Number(saved.cooldown)||0;this.minute=Array.isArray(saved.minute)?saved.minute.filter((x:unknown)=>typeof x==='number'):[];}catch{}
 }
 get cacheMode(){return this.cache?.mode??'memory';}
 private saveBudget(){if(this.options.budgetFile){const file=this.options.budgetFile;writeFileSync(file+'.tmp',JSON.stringify({day:this.day,used:this.used,minute:this.minute,cooldown:this.cooldown}),{mode:0o600});renameSync(file+'.tmp',file);}}
 async plan(input:PlannerInput):Promise<EngineResult>{
  const normalized=canonical(input);const key=hash({owner:this.options.scope,model:this.options.model,...normalized.payload});const now=this.now();const bypass=!!input.screenshot||input.snapshot.elements.some(e=>e.validation?.invalid)||input.history.length>0;
  let entry=this.memory.get(key);
  if(!bypass&&!entry&&this.cache)try{entry=(await this.cache.get(key))??undefined;}catch{}
  if(!bypass&&entry&&entry.version===CACHE_VERSION&&entry.expiresAt>now){
   const mapped=await planStep(input,async()=>freshEvidence(input,remapResult(reusableEntry(entry!).result,normalized.stableToActual)));
   if(mapped.kind==='guidance')return{result:mapped,usage:{cache:'hit',status:'ready',store:this.cacheMode,providerCalls:0}};
  }
  if(!bypass&&this.inFlight.has(key)){const pending=this.inFlight.get(key)!;const first=await pending.promise;return{result:remapResult(remapResult(first.result,pending.ids),normalized.stableToActual),usage:{...first.usage,cache:'coalesced',providerCalls:0}};}
  const work=this.execute(input,key,normalized,bypass);
  if(!bypass)this.inFlight.set(key,{promise:work,ids:normalized.actualToStable});
  try{return await work;}finally{if(!bypass)this.inFlight.delete(key);}
 }
 private async execute(input:PlannerInput,key:string,normalized:ReturnType<typeof canonical>,bypass:boolean):Promise<EngineResult>{
  let calls=0,blocked:'cooldown'|'budget'|undefined,retry=0;
  const guarded:Planner=async context=>{
   const now=this.now();const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
   if(day!==this.day){this.day=day;this.used=0;}
   this.minute=this.minute.filter(timestamp=>now-timestamp<60000);
   if(this.cooldown>now){blocked='cooldown';retry=Math.ceil((this.cooldown-now)/1000);throw Object.assign(new Error('cooldown'),{status:429});}
   if(this.used>=(this.options.dailyBudget??20)){blocked='budget';retry=3600;throw Object.assign(new Error('local budget'),{status:429});}
   if(this.minute.length>=(this.options.minuteBudget??5)){blocked='cooldown';retry=Math.max(1,Math.ceil((60000-(now-this.minute[0]))/1000));throw Object.assign(new Error('local pace'),{status:429});}
   this.used++;this.minute.push(now);calls++;this.saveBudget();
   try{return await this.options.planner(context);}catch(error){const status=Number((error as {status?:unknown})?.status);if(status===429||status>=500){this.cooldown=now+1000*(status===429?retryDelay(error):30);retry=Math.ceil((this.cooldown-now)/1000);blocked='cooldown';this.saveBudget();}throw error;}
  };
  let result=await planStep(input,guarded);
  if(blocked&&result.kind==='unsupported')result={kind:'unsupported',reason:blocked==='budget'?'Guidance is paused at the configured daily request budget. Your local page tools remain available.':`Guidance is cooling down. Retry in ${retry} seconds; your local page tools remain available.`};
  const usage:GuidanceUsage={cache:bypass?'bypass':'miss',status:blocked??(result.kind==='unsupported'?'provider-error':'ready'),store:this.cacheMode,providerCalls:calls,...(retry?{retryAfterSeconds:retry}:{})};
  if(!bypass&&result.kind==='guidance'){
   const entry:CacheEntry=reusableEntry({version:CACHE_VERSION,createdAt:this.now(),expiresAt:this.now()+(this.options.ttlMs??900000),result:remapResult(result,normalized.actualToStable),...(normalized.form?{form:normalized.form}:{})});
   this.memory.set(key,entry);if(this.memory.size>500)this.memory.delete(this.memory.keys().next().value!);
   if(this.cache)try{await this.cache.put(key,entry);}catch{}
  }
  return{result,usage};
 }
}
