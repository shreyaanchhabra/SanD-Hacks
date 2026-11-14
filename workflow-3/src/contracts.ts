import { z } from 'zod';
const text = z.string().trim().min(1).max(2000);
const id = z.string().min(1).max(120);
export const snapshotSchema = z.object({
  pageId: id, revision: z.number().int().positive(),
  url: z.string().url().max(2048).refine(value => { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.search && !u.hash && !u.username && !u.password; }, 'Use a sanitized URL without credentials, query, or fragment'),
  title: text, headings: z.array(text).max(30),
  elements: z.array(z.object({ id, role: text, name: text, kind: z.enum(['link', 'button', 'field', 'section', 'text']), protected: z.boolean() }).strict()).max(100),
  instructions: z.array(z.object({ elementId: id, text }).strict()).max(100),
}).strict().refine(s => new Set(s.elements.map(e => e.id)).size === s.elements.length, 'Duplicate target IDs');
export type PageSnapshot = z.infer<typeof snapshotSchema>;
export const sourceSchema = z.object({ id, url: z.string().url(), text, retrievedAt: z.string(), synthetic: z.boolean() }).strict();
export type SourceExcerpt = z.infer<typeof sourceSchema>;
export const resultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('guidance'), instruction: text, explanation: text, targetId: id, sourceIds: z.array(id).max(10), expectedOutcome: z.enum(['navigation', 'user-confirmation']) }).strict(),
  z.object({ kind: z.literal('clarification'), question: text }).strict(),
  z.object({ kind: z.literal('unsupported'), reason: text }).strict(),
]);
export type PlannerResult = z.infer<typeof resultSchema>;
export type PlannerInput = { task: string; snapshot: PageSnapshot; sources: SourceExcerpt[]; history: string[] };
export type Planner = (input: PlannerInput) => Promise<unknown>;
export const eventSchema = z.object({ eventId: id, stepId: id, pageId: id, revision: z.number().int().positive(), type: z.enum(['navigation-observed', 'user-confirmed', 'help-requested', 'clarification-answered']), snapshot: snapshotSchema.optional(), answer: text.optional() }).strict();
export type ProgressEvent = z.infer<typeof eventSchema>;
export const startSchema = z.object({ task: text, snapshot: snapshotSchema }).strict();
export type TaskState = { runId: string; stepId: string; pageId: string; revision: number; status: 'clarifying' | 'waiting-for-user' | 'unsupported' | 'paused'; result: PlannerResult; sources: SourceExcerpt[]; workflowStatus: string };
/** Workflow 4 supplies retrieval; only approved public excerpts belong here. */
export interface SourceAdapter { mode: string; retrieveContext(task: string, snapshot: PageSnapshot): Promise<SourceExcerpt[]> }
/** Workflow 2 supplies speech. The service passes validated current-step text only. */
export interface SpeechAdapter { mode: string; speak(stepId: string, text: string): Promise<{ status: string }> }
