import {Pool} from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {TigerGuidanceCache} from '../src/tiger-cache.js';
import {CACHE_VERSION} from '../src/guidance-engine.js';
async function main(){
 const connection=process.env.TIGER_DATABASE_URL;if(!connection){console.log('TIGER_DATABASE_URL is not configured. Remote storage remains unverified.');process.exitCode=2;return;}
 const url=new URL(connection);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))url.searchParams.set('sslmode','verify-full');
 const pool=new Pool({connectionString:url.toString(),connectionTimeoutMillis:5000,query_timeout:5000,max:1});
 try{
  const key=createHash('sha256').update(randomUUID()).digest('hex');const cache=new TigerGuidanceCache(pool);
  const now=Date.now();await cache.put(key,{version:CACHE_VERSION,createdAt:now,expiresAt:now+60000,result:{kind:'guidance',instruction:'Read the demo label.',explanation:'Synthetic storage smoke test.',targetId:'control-0',sourceIds:[],expectedOutcome:'user-confirmation'},form:{origin:'https://example.org/',title:'Synthetic Tiger Data smoke test '+key,fields:[{id:'control-0',name:'Demo field',kind:'field'}]}});
  const stored=await cache.get(key);if(!stored)throw new Error('Readback failed');
  console.log('Tiger Data form/guidance write and readback succeeded (synthetic fixture).');
  await pool.query('DELETE FROM accesspatch_guidance_cache WHERE cache_key=$1',[key]);
  // Static form blueprints are reusable and contain no task-progress metadata.
 }catch{console.log('Tiger Data smoke test failed. Check connection, TLS and table permissions; no credentials displayed.');process.exitCode=1;}finally{await pool.end();}
}
main();
