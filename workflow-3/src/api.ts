import {transcriptionSchema} from './transcription.js';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createService } from './service.js';
import { startSchema } from './contracts.js';
import { guidanceEventType } from './tiger-data.js';
export function createApi({ token, service = createService(), allowedExtensionOrigin }: { token: string; allowedExtensionOrigin?: string; service?: ReturnType<typeof createService> }) {
  if (!token) throw new Error('A local API token is required');
  if (allowedExtensionOrigin && !/^chrome-extension:\/\/[a-p]{32}$/.test(allowedExtensionOrigin)) throw new Error('Invalid extension origin');
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  const handle = async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/') return json({ service: 'workflow-3', status: 'running', message: 'Open the combined-extension and configure its local API token. API routes remain protected.' });
    const origin = request.headers.get('origin');
    if (origin && origin !== allowedExtensionOrigin) return json({ error: 'Browser origin is not allowed' }, 403);
    if (request.method === 'OPTIONS' && origin === allowedExtensionOrigin && origin) return new Response(null, { status: 204 });
    const provided = Buffer.from(request.headers.get('authorization') ?? '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return json({ error: 'Unauthorized' }, 401);
    try {
      if (request.method === 'GET' && path === '/api/health') return json({ modes: service.modes, persistence: service.persistence });
      if (request.method === 'GET' && path === '/api/saved-journeys') return json(await service.savedJourneys());
      if (request.method === 'DELETE' && path === '/api/analytics/events') { await service.clearGuidanceEvents(); return json({ deleted: true }); }
      const match = /^\/api\/tasks\/([a-f0-9-]+)(?:\/(events|pause|resume|speech|save))?$/.exec(path);
      const savedMatch = /^\/api\/saved-journeys\/([a-f0-9-]+)$/.exec(path);
      if (request.method === 'DELETE' && savedMatch) { await service.deleteSavedJourney(savedMatch[1]); return json({ deleted: true }); }
      if (request.method === 'GET' && match && !match[2]) return json(service.get(match[1]));
      if (request.method !== 'POST') return json({ error: 'Not found' }, 404);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'JSON required' }, 415);
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 1600000) return json({ error: 'Request too large' }, 413);
      const body = JSON.parse(raw);
      if (path === '/api/voice/transcribe') return json(await service.transcribe(transcriptionSchema.parse(body)));
      if (path === '/api/tasks') { const { task, snapshot, screenshot } = startSchema.parse(body); return json(await service.start(task, snapshot, screenshot), 201); }
      if (path === '/api/analytics/events') {
        const value = z.object({ consent: z.literal(true), eventId: z.string().min(1).max(120), type: z.string(), journeyCategory: z.enum(['application','account-setup','benefits','healthcare','education','other']), stepCategory: z.enum(['navigation','identity','contact','eligibility','documents','review','submission','unknown']), provider: z.enum(['gemini','mastra','bright-data','elevenlabs','extension']).optional() }).strict().parse(body);
        if (!guidanceEventType(value.type)) return json({ error: 'Unsupported event type' }, 400);
        return json(await service.recordGuidanceEvent({ consent: value.consent, id: value.eventId, type: value.type, journeyCategory: value.journeyCategory, stepCategory: value.stepCategory, provider: value.provider }));
      }
      if (match) {
        const [, id, action] = match;
        if (action === 'events') return json(await service.event(id, body));
        if (action === 'save') { const value = z.object({ consent: z.literal(true) }).strict().parse(body); return json(await service.saveJourney(id, value.consent)); }
        if (action === 'pause' || action === 'resume') { z.object({}).strict().parse(body); return json(await (action === 'pause' ? service.pause(id) : service.unpause(id))); }
        if (action === 'speech') { const { stepId } = z.object({ stepId: z.string() }).strict().parse(body); return json(await service.speak(id, stepId)); }
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: 'Invalid request; send only the documented value-free fields' }, 400);
      const message = error instanceof Error ? error.message : '';
      if(path==='/api/voice/transcribe')return json({error:message.startsWith('Voice transcription')?message:'Voice transcription unavailable. Type your question instead.'},503);
      if (message === 'Task not found' || message === 'Task expired') return json({ error: message }, 404);
      const safeMessages = ['Task paused', 'Task busy', 'Event is stale; remap the current page', 'Navigation requires a new page snapshot', 'Snapshot is stale', 'A clarification answer is required', 'Answer the clarification first', 'Speech step is stale or paused'];
      return safeMessages.includes(message) ? json({ error: message }, 409) : json({ error: 'Guidance temporarily unavailable; the original page remains usable' }, 503);
    }
  };
  return async (request: Request) => {
    const response = await handle(request);
    if (allowedExtensionOrigin && request.headers.get('origin') === allowedExtensionOrigin) {
      response.headers.set('access-control-allow-origin', allowedExtensionOrigin);
      response.headers.set('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
      response.headers.set('access-control-allow-headers', 'Authorization, Content-Type');
      response.headers.set('vary', 'Origin');
    }
    return response;
  };
}
