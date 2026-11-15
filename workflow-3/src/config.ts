import {elevenLabsTranscription} from './transcription.js';
import {createHash} from 'node:crypto';
import {GuidanceEngine,FileGuidanceCache} from './guidance-engine.js';
import {tigerCache} from './tiger-cache.js';
import { LibSQLStore } from '@mastra/libsql';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { TaskRepository } from './repository.js';
import { createService } from './service.js';
import { geminiPlanner } from './planner.js';
import { elevenLabsSpeech } from './speech.js';
import { TigerDataStore } from './tiger-data.js';
import { createBrightDataSourceAdapter } from './brightdata.js';
export async function configuredService() {
  const mode = process.env.PLANNER_MODE ?? 'mock';
  if (!['mock', 'gemini'].includes(mode)) throw new Error('PLANNER_MODE must be mock or gemini');
  const directory=resolve(process.env.TASK_STORAGE_DIR ?? '.data');mkdirSync(directory,{recursive:true,mode:0o700});
  const durable={repository:new TaskRepository(join(directory,'tasks')),storage:new LibSQLStore({id:'accesspatch-local',url:'file:'+join(directory,'mastra.db')})};
  const tigerUrl = process.env.TIGER_DATA_URL;
  const tigerOwner = process.env.TIGER_OWNER_ID;
  const database = process.env.TIGER_DATABASE_URL || tigerUrl;
  if (tigerUrl && !tigerOwner) throw new Error('Set TIGER_OWNER_ID with TIGER_DATA_URL to enable saved journeys and consented events');
  if (tigerOwner && !database) throw new Error('Set TIGER_DATABASE_URL or TIGER_DATA_URL with TIGER_OWNER_ID');
  const tiger = database && tigerOwner ? await TigerDataStore.connect(tigerUrl || database, tigerOwner) : undefined;
  const transcribe=process.env.ELEVENLABS_API_KEY?elevenLabsTranscription(process.env.ELEVENLABS_API_KEY):undefined;
  const speech = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID
    ? elevenLabsSpeech(process.env.ELEVENLABS_API_KEY, process.env.ELEVENLABS_VOICE_ID) : undefined;
  if (mode === 'mock') return createService({ transcribe, speech, tiger, ...durable });
  const { GEMINI_API_KEY, GEMINI_MODEL } = process.env;
  if (!GEMINI_API_KEY || !GEMINI_MODEL) throw new Error('Gemini mode requires GEMINI_API_KEY and GEMINI_MODEL');
  const planner=geminiPlanner(GEMINI_API_KEY,GEMINI_MODEL);
  const localCache=new FileGuidanceCache(join(directory,'guidance-cache'));
  const cache=database?tigerCache(database,localCache):localCache;
  const sources=createBrightDataSourceAdapter(process.env,join(directory,'public-source-cache'));
  const scope=createHash('sha256').update(process.env.LOCAL_API_TOKEN??GEMINI_API_KEY).digest('hex');
  const positive=(value:string|undefined,fallback:number)=>{const number=Number(value);return Number.isInteger(number)&&number>0?number:fallback;};
  const engine=new GuidanceEngine({planner,model:GEMINI_MODEL,scope,dailyBudget:positive(process.env.GEMINI_DAILY_BUDGET,20),minuteBudget:positive(process.env.GEMINI_MINUTE_BUDGET,5),cache,budgetFile:join(directory,'budget-'+createHash('sha256').update(GEMINI_MODEL).digest('hex').slice(0,12)+'.json')});
  return createService({ transcribe, engine,planner, plannerMode: 'gemini-live', speech,tiger, sources, ...durable });
}
