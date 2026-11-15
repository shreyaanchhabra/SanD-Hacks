import { randomUUID } from 'node:crypto';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { Mastra } from '@mastra/core/mastra';
import { TaskRepository } from './repository.js';
import type { MastraCompositeStore } from '@mastra/core/storage';
import { InMemoryStore } from '@mastra/core/storage';
import { eventSchema, snapshotSchema, startSchema, sourceSchema, resultSchema, type Screenshot, type PageSnapshot, type Planner, type SourceAdapter, type SpeechAdapter, type TaskState } from './contracts.js';
import { sources } from './fixtures.js';
import { mockPlanner, planStep } from './planner.js';

export function createService(options: { planner?: Planner; sources?: SourceAdapter; speech?: SpeechAdapter; plannerMode?: string; repository?: TaskRepository; storage?: MastraCompositeStore } = {}) {
  const sourceAdapter = options.sources ?? { mode: 'synthetic-fixture', retrieveContext: async () => sources };
  const speech = options.speech ?? { mode: 'mock-no-audio', speak: async () => ({ status: 'mock-no-audio' }) };
  const inputSchema = z.object({ task: z.string(), snapshot: snapshotSchema, history: z.array(z.string()), imageKey: z.string().optional() });
  const images = new Map<string, Screenshot>();
  const turnSchema = z.object({ result: resultSchema, sources: z.array(sourceSchema) });
  const planning = createStep({ id: 'plan', inputSchema, outputSchema: turnSchema, execute: async ({ inputData }) => {
    let excerpts: z.infer<typeof sourceSchema>[] = [];
    try { excerpts = z.array(sourceSchema).max(10).parse(await sourceAdapter.retrieveContext(inputData.task, inputData.snapshot)); } catch { /* Page-only guidance remains available. */ }
    const result = await planStep({ task: inputData.task, snapshot: inputData.snapshot, history: inputData.history, sources: excerpts, screenshot: inputData.imageKey ? images.get(inputData.imageKey) : undefined }, options.planner ?? mockPlanner);
    return { result, sources: result.kind === 'guidance' ? excerpts.filter(s => result.sourceIds.includes(s.id)) : [] };
  } });
  const waiting = createStep({ id: 'wait-for-user', inputSchema: turnSchema, outputSchema: turnSchema, resumeSchema: z.object({ proceed: z.literal(true) }), suspendSchema: turnSchema,
    execute: async ({ inputData, resumeData, suspend }) => resumeData?.proceed ? inputData : suspend(inputData) });
  const workflow = createWorkflow({ id: 'guidance-turn', inputSchema, outputSchema: turnSchema }).then(planning).then(waiting).commit();
  const mastra = new Mastra({ workflows: { guidance: workflow }, storage: options.storage ?? new InMemoryStore() });
  void mastra; // Registration binds the workflow to its snapshot store.
  type Run = Awaited<ReturnType<typeof workflow.createRun>>;
  type Record = { task: string; snapshot: PageSnapshot; history: string[]; state: TaskState; run?: Run; workflowRunId: string; events: Set<string>; busy: boolean; touched: number };
  const records = new Map<string, Record>();
  for(const stored of options.repository?.load() ?? []) records.set(stored.state.runId,{...stored,events:new Set(stored.events),busy:false});
  const persist=(record:Record)=>options.repository?.save({task:record.task,snapshot:record.snapshot,history:record.history,state:record.state,workflowRunId:record.workflowRunId,events:[...record.events],touched:record.touched});
  const get = (id: string) => { const record = records.get(id); if (!record) throw new Error('Task not found'); if (Date.now() - record.touched > 3600000) { records.delete(id); throw new Error('Task expired'); } record.touched = Date.now(); return record; };
  async function turn(runId: string, task: string, snapshot: PageSnapshot, history: string[], screenshot?: Screenshot) {
    if (screenshot && (screenshot.pageId !== snapshot.pageId || screenshot.revision !== snapshot.revision)) throw new Error('Screenshot page does not match current page');
    const imageKey = screenshot ? randomUUID() : undefined;
    if (imageKey) images.set(imageKey, screenshot!);
    let run!: Run;
    let output;
    try { run = await workflow.createRun(); output = await run.start({ inputData: { task, snapshot, history, imageKey } }); }
    finally { if (imageKey) images.delete(imageKey); }
    if (output.status !== 'suspended') throw new Error('Workflow unavailable');
    const { result, sources: citedSources } = turnSchema.parse(output.steps['wait-for-user'].suspendPayload);
    const state: TaskState = { runId, stepId: randomUUID(), pageId: snapshot.pageId, revision: snapshot.revision, status: result.kind === 'clarification' ? 'clarifying' : result.kind === 'unsupported' ? 'unsupported' : 'waiting-for-user', result, sources: citedSources, workflowStatus: output.status, task, journey: result.journey ?? [], ...(result.stage ? {stage: result.stage} : {}), analysis: { input: screenshot ? 'image+text' : 'text', imageStatus: !screenshot ? 'not-requested' : result.visualObservation ? 'analyzed' : result.kind === 'unsupported' ? 'failed' : 'unverified', observation: result.visualObservation ?? null, provider: options.plannerMode ?? 'mock' } };
    return { run, state, workflowRunId: run.runId };
  }
  return {
    persistence: options.repository ? 'local SQLite checkpoints and task files; access expires after one idle hour; disk retention is separate' : 'memory',
    modes: { Gemini: options.plannerMode ?? 'mock', Mastra: 'real-local-suspend-resume', 'Bright Data': sourceAdapter.mode, 'Tiger Data': 'not-connected-in-memory', ElevenLabs: speech.mode },
    async start(task: string, snapshot: PageSnapshot, screenshot?: Screenshot) {
      const { screenshot: image, ...clean } = startSchema.parse({ task, snapshot, screenshot });
      for (const [id, r] of records) if (Date.now() - r.touched > 3600000) records.delete(id);
      if (records.size >= 100) throw new Error('Local task limit reached; restart the demo');
      const runId = randomUUID();
      const current = await turn(runId, clean.task, clean.snapshot, [], image);
      records.set(runId, { ...current, ...clean, history: [], events: new Set(), busy: false, touched: Date.now() });
      persist(records.get(runId)!);
      return structuredClone(current.state);
    },
    get(runId: string) { return structuredClone(get(runId).state); },
    async event(runId: string, raw: unknown) {
      const event = eventSchema.parse(raw);
      const record = get(runId);
      if (record.events.has(event.eventId)) return structuredClone(record.state);
      if (record.busy) throw new Error('Task busy');
      if (record.state.status === 'paused') throw new Error('Task paused');
      if (event.stepId !== record.state.stepId || event.pageId !== record.state.pageId || event.revision !== record.state.revision) throw new Error('Event is stale; remap the current page');
      if (event.type === 'clarification-answered' && (record.state.status !== 'clarifying' || !event.answer)) throw new Error('A clarification answer is required');
      if (record.state.status === 'clarifying' && !['clarification-answered','navigation-observed','page-updated'].includes(event.type)) throw new Error('Answer the clarification first');
      if (event.type === 'navigation-observed' && (!event.snapshot || event.snapshot.pageId === record.snapshot.pageId)) throw new Error('Navigation requires a new page snapshot');
      if (event.snapshot?.pageId === record.snapshot.pageId && event.snapshot.revision < record.snapshot.revision) throw new Error('Snapshot is stale');
      if (record.events.size >= 500) throw new Error('Local event limit reached; start a new task');
      record.busy = true;
      try {
        const snapshot = event.snapshot ?? record.snapshot;
        const task = event.type === 'clarification-answered' ? `${record.task}\nClarification: ${event.answer}`.slice(-2000) : record.task;
        const history = [...record.history, JSON.stringify({ event: event.type, userHelp: event.type === 'help-requested' ? event.answer : undefined, pageId: record.state.pageId, result: record.state.result })].slice(-12);
        // Prepare the next turn first: failure leaves the current suspended run retryable.
        const next = await turn(runId, task, snapshot, history, event.screenshot);
        const previousRun = record.run ?? await workflow.createRun({ runId: record.workflowRunId });
        if(!next.state.journey.length)next.state.journey=record.state.journey;
        if((record.state as TaskState).status==='paused')next.state.status='paused';
        const committed: Record={...record,...next,task,snapshot,history,events:new Set([...record.events,event.eventId])};
        // Commit the new suspended checkpoint pointer BEFORE releasing the old wait.
        // A write failure leaves the old run suspended and the event safely retryable.
        persist(committed);Object.assign(record,committed);
        try { await previousRun.resume({ step: 'wait-for-user', resumeData: { proceed: true } }); await workflow.deleteWorkflowRunById(previousRun.runId); }
        catch { /* The committed next checkpoint is authoritative; old-run cleanup can fail independently. */ }
        return structuredClone(record.state);
      } finally { record.busy = false; }
    },
    async pause(runId: string) { const r = get(runId); r.state.status = 'paused';persist(r); return structuredClone(r.state); },
    async unpause(runId: string) { const r = get(runId); if (r.busy) throw new Error('Task busy'); r.state.status = r.state.result.kind === 'clarification' ? 'clarifying' : r.state.result.kind === 'unsupported' ? 'unsupported' : 'waiting-for-user';persist(r); return structuredClone(r.state); },
    async speak(runId: string, stepId: string) { const r = get(runId); if (r.state.stepId !== stepId || r.state.status === 'paused') throw new Error('Speech step is stale or paused'); const result = r.state.result; const text = result.kind === 'guidance' ? result.instruction : result.kind === 'clarification' ? result.question : result.reason; return speech.speak(stepId, text); },
  };
}
