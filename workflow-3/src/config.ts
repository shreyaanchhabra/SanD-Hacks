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
  return createService({ planner: geminiPlanner(GEMINI_API_KEY, GEMINI_MODEL), plannerMode: 'gemini-live', speech, sources:{mode:'not-connected',retrieveContext:async()=>[]}, ...durable });
}
