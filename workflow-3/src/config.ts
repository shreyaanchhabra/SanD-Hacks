import { createService } from './service.js';
import { geminiPlanner } from './planner.js';
export function configuredService() {
  const mode = process.env.PLANNER_MODE ?? 'mock';
  if (!['mock', 'gemini'].includes(mode)) throw new Error('PLANNER_MODE must be mock or gemini');
  if (mode === 'mock') return createService();
  const { GEMINI_API_KEY, GEMINI_MODEL } = process.env;
  if (!GEMINI_API_KEY || !GEMINI_MODEL) throw new Error('Gemini mode requires GEMINI_API_KEY and GEMINI_MODEL');
  return createService({ planner: geminiPlanner(GEMINI_API_KEY, GEMINI_MODEL), plannerMode: 'gemini-live' });
}
