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
export function configuredService() {
  const mode = process.env.PLANNER_MODE ?? 'mock';
  if (!['mock', 'gemini'].includes(mode)) throw new Error('PLANNER_MODE must be mock or gemini');
  const directory=resolve(process.env.TASK_STORAGE_DIR ?? '.data');mkdirSync(directory,{recursive:true,mode:0o700});
  const durable={repository:new TaskRepository(join(directory,'tasks')),storage:new LibSQLStore({id:'accesspatch-local',url:'file:'+join(directory,'mastra.db')})};
  const speech = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID
    ? elevenLabsSpeech(process.env.ELEVENLABS_API_KEY, process.env.ELEVENLABS_VOICE_ID) : undefined;
  if (mode === 'mock') return createService({ speech, ...durable });
  const { GEMINI_API_KEY, GEMINI_MODEL } = process.env;
  if (!GEMINI_API_KEY || !GEMINI_MODEL) throw new Error('Gemini mode requires GEMINI_API_KEY and GEMINI_MODEL');
  const planner=geminiPlanner(GEMINI_API_KEY,GEMINI_MODEL);
  const localCache=new FileGuidanceCache(join(directory,'guidance-cache'));
  const database=process.env.TIGER_DATABASE_URL;
  const cache=database?tigerCache(database,localCache):localCache;
  const scope=createHash('sha256').update(process.env.LOCAL_API_TOKEN??GEMINI_API_KEY).digest('hex');
  const positive=(value:string|undefined,fallback:number)=>{const number=Number(value);return Number.isInteger(number)&&number>0?number:fallback;};
  const engine=new GuidanceEngine({planner,model:GEMINI_MODEL,scope,cache,dailyBudget:positive(process.env.GEMINI_DAILY_BUDGET,20),minuteBudget:positive(process.env.GEMINI_MINUTE_BUDGET,5),budgetFile:join(directory,'budget-'+createHash('sha256').update(GEMINI_MODEL).digest('hex').slice(0,12)+'.json')});
  return createService({ engine,planner, plannerMode: 'gemini-live', speech, sources:{mode:'not-connected',retrieveContext:async()=>[]}, ...durable });
}
