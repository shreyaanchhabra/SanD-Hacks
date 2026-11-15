import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Pool} from 'pg';
import {cacheEntrySchema,reusableEntry,type CacheEntry,type GuidanceCache} from './guidance-engine.js';
export type QueryClient={query(text:string,values?:unknown[]):Promise<{rows:Record<string,any>[]}>};
export class TigerGuidanceCache implements GuidanceCache{
 mode='tiger-data';private ready?:Promise<unknown>;
 constructor(private db:QueryClient){}
 private init(){return this.ready??=(this.db.query(readFileSync(new URL('../migrations/002_guidance_cache.sql',import.meta.url),'utf8')).catch(error=>{this.ready=undefined;throw error;}));}
 async get(key:string){await this.init();const result=await this.db.query('SELECT payload FROM accesspatch_guidance_cache WHERE cache_key=$1 AND expires_at>now()',[key]);return result.rows.length?cacheEntrySchema.parse(result.rows[0].payload):null;}
 async put(key:string,raw:CacheEntry){
  const entry=reusableEntry(cacheEntrySchema.parse(raw));await this.init();
  const formHash=entry.form?createHash('sha256').update(JSON.stringify(entry.form)).digest('hex'):null;
  if(formHash)await this.db.query('INSERT INTO accesspatch_form_structures (form_hash,structure) VALUES ($1,$2::jsonb) ON CONFLICT (form_hash) DO UPDATE SET structure=EXCLUDED.structure,updated_at=now()',[formHash,JSON.stringify(entry.form)]);
  await this.db.query('INSERT INTO accesspatch_guidance_cache (cache_key,form_hash,payload,expires_at) VALUES ($1,$2,$3::jsonb,$4) ON CONFLICT (cache_key) DO UPDATE SET form_hash=EXCLUDED.form_hash,payload=EXCLUDED.payload,expires_at=EXCLUDED.expires_at',[key,formHash,JSON.stringify(entry),new Date(entry.expiresAt)]);
 }
}
export class FallbackGuidanceCache implements GuidanceCache{
 private failedUntil=0;private active='tiger-data-pending';
 get mode(){return this.active;}
 constructor(private primary:GuidanceCache,private local:GuidanceCache){}
 async get(key:string){if(Date.now()>this.failedUntil)try{const result=await this.primary.get(key);this.active='tiger-data';return result??await this.local.get(key);}catch{this.failedUntil=Date.now()+30000;}this.active='local-fallback';return this.local.get(key);}
 async put(key:string,entry:CacheEntry){await this.local.put(key,entry);if(Date.now()>this.failedUntil)try{await this.primary.put(key,entry);this.active='tiger-data';return;}catch{this.failedUntil=Date.now()+30000;}this.active='local-fallback';}
}
export function tigerCache(connectionString:string,local:GuidanceCache){
 const url=new URL(connectionString);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))url.searchParams.set('sslmode','verify-full');
 const pool=new Pool({connectionString:url.toString(),max:3,connectionTimeoutMillis:3000,query_timeout:3000});pool.on('error',()=>{});
 return new FallbackGuidanceCache(new TigerGuidanceCache(pool),local);
}
