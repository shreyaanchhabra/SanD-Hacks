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
export const screenshotSchema = z.object({
  mimeType: z.enum(['image/png', 'image/jpeg']),
  data: z.string().max(1400000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  consent: z.literal(true), pageId: id, revision: z.number().int().positive(),
}).strict().refine(image => {
  const bytes = Buffer.from(image.data, 'base64');
  return bytes.length <= 1000000 && (image.mimeType === 'image/png'
    ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255);
}, 'Invalid or oversized screenshot');
export type Screenshot = z.infer<typeof screenshotSchema>;
export const sourceSchema = z.object({ id, url: z.string().url(), text, retrievedAt: z.string(), synthetic: z.boolean() }).strict();
export type SourceExcerpt = z.infer<typeof sourceSchema>;
const journeyFields = { journey: z.array(z.string().min(1).max(160)).max(6).optional(), stage: z.string().max(160).optional(), visualObservation: text.optional() };
export const resultSchema = z.discriminatedUnion('kind', [
  z.object({ ...journeyFields, kind: z.literal('guidance'), instruction: text, explanation: text, targetId: id.nullable(), sourceIds: z.array(id).max(10), expectedOutcome: z.enum(['navigation', 'user-confirmation']) }).strict(),
  z.object({ ...journeyFields, kind: z.literal('clarification'), question: text }).strict(),
  z.object({ ...journeyFields, kind: z.literal('unsupported'), reason: text }).strict(),
]);
export type PlannerResult = z.infer<typeof resultSchema>;
export type PlannerInput = { task: string; snapshot: PageSnapshot; sources: SourceExcerpt[]; history: string[]; screenshot?: Screenshot; validationFeedback?: string };
export type Planner = (input: PlannerInput) => Promise<unknown>;
export const eventSchema = z.object({ eventId: id, stepId: id, pageId: id, revision: z.number().int().positive(), type: z.enum(['navigation-observed', 'page-updated', 'user-confirmed', 'help-requested', 'clarification-answered']), snapshot: snapshotSchema.optional(), screenshot: screenshotSchema.optional(), answer: text.optional() }).strict();
export type ProgressEvent = z.infer<typeof eventSchema>;
export const startSchema = z.object({ task: text, snapshot: snapshotSchema, screenshot: screenshotSchema.optional() }).strict();
export const taskStateSchema = z.object({
 runId: id, stepId: id, pageId: id, revision: z.number().int().positive(),
 savedForLater: z.boolean().optional(),
 status: z.enum(['clarifying','waiting-for-user','unsupported','paused']), result: resultSchema,
 sources: z.array(sourceSchema), workflowStatus: z.string(), task: text,
 journey: z.array(z.string().max(160)).max(6), stage: z.string().max(160).optional(),
 analysis: z.object({ input: z.enum(['text','image+text']), imageStatus: z.enum(['not-requested','analyzed','unverified','failed']), observation: z.string().nullable(), provider: z.string() }),
});
export type TaskState = z.infer<typeof taskStateSchema>;
/** Workflow 4 supplies retrieval; only approved public excerpts belong here. */
export interface SourceAdapter { mode: string; retrieveContext(task: string, snapshot: PageSnapshot): Promise<SourceExcerpt[]> }
/** Workflow 2 supplies speech. The service passes validated current-step text only. */
export interface SpeechAdapter { mode: string; speak(stepId: string, text: string): Promise<{ status: string; audioBase64?: string; contentType?: string }> }
