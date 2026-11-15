import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {z} from 'zod';
import {resultSchema,type Planner,type PlannerInput,type PlannerResult} from './contracts.js';
import {planStep} from './planner.js';
export const CACHE_VERSION='form-evidence-v3';
export const cacheEntrySchema=z.object({version:z.literal(CACHE_VERSION),createdAt:z.number(),expiresAt:z.number(),result:resultSchema,form:z.record(z.string(),z.unknown()).optional()});
export type CacheEntry=z.infer<typeof cacheEntrySchema>;
export interface GuidanceCache{mode:string;get(key:string):Promise<CacheEntry|null>;put(key:string,entry:CacheEntry):Promise<void>}
export class FileGuidanceCache implements GuidanceCache{
 mode='local';constructor(private directory:string){mkdirSync(directory,{recursive:true,mode:0o700});}
 async get(key:string){try{return cacheEntrySchema.parse(JSON.parse(readFileSync(join(this.directory,key+'.json'),'utf8')));}catch{return null;}}
 async put(key:string,entry:CacheEntry){const file=join(this.directory,key+'.json');writeFileSync(file+'.tmp',JSON.stringify(cacheEntrySchema.parse(entry)),{mode:0o600});renameSync(file+'.tmp',file);}
}
export type GuidanceUsage={cache:'hit'|'miss'|'coalesced'|'bypass';status:'ready'|'provider-error';store:string;providerCalls:number;retryAfterSeconds?:number};
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
 return{version:CACHE_VERSION,createdAt:entry.createdAt,expiresAt:entry.expiresAt,result:{kind:'guidance',instruction:result.instruction,explanation:result.explanation,targetId:result.targetId,sourceIds:result.sourceIds,...(result.checklist?{checklist:result.checklist}:{}),expectedOutcome:result.expectedOutcome,...(result.completionEvidence?{completionEvidence:result.completionEvidence}:{})},...(form?{form}:{})};
}
function freshEvidence(input:PlannerInput,result:PlannerResult):PlannerResult{
 if(result.kind!=='guidance')return result;
 const target=input.snapshot.elements.find(e=>e.id===result.targetId);
 return{...result,observations:target?[{basis:'page',elementId:target.id,text:`This page contains “${target.name}”${target.required?' and marks it required':''}.`}]:[],changeSummary:null};
}
export class GuidanceEngine{
 private cache?:GuidanceCache;private memory=new Map<string,CacheEntry>();private inFlight=new Map<string,{promise:Promise<EngineResult>;ids:Map<string,string>} >();
 private now:()=>number;
 constructor(private options:{planner:Planner;model:string;scope:string;cache?:GuidanceCache;now?:()=>number;ttlMs?:number}){
  this.cache=options.cache;this.now=options.now??Date.now;
 }
 get cacheMode(){return this.cache?.mode??'memory';}
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
  let calls=0;
  const guarded:Planner=async context=>{calls++;return this.options.planner(context);};
  const result=await planStep(input,guarded);
  const usage:GuidanceUsage={cache:bypass?'bypass':'miss',status:result.kind==='unsupported'?'provider-error':'ready',store:this.cacheMode,providerCalls:calls};
  if(!bypass&&result.kind==='guidance'){
   const entry:CacheEntry=reusableEntry({version:CACHE_VERSION,createdAt:this.now(),expiresAt:this.now()+(this.options.ttlMs??900000),result:remapResult(result,normalized.actualToStable),...(normalized.form?{form:normalized.form}:{})});
   this.memory.set(key,entry);if(this.memory.size>500)this.memory.delete(this.memory.keys().next().value!);
   if(this.cache)try{await this.cache.put(key,entry);}catch{}
  }
  return{result,usage};
 }
}
