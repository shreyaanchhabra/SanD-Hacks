import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createService } from './service.js';
import { startSchema } from './contracts.js';
export function createApi({ token, service = createService(), allowedExtensionOrigin }: { token: string; allowedExtensionOrigin?: string; service?: ReturnType<typeof createService> }) {
  if (!token) throw new Error('A local API token is required');
  if (allowedExtensionOrigin && !/^chrome-extension:\/\/[a-p]{32}$/.test(allowedExtensionOrigin)) throw new Error('Invalid extension origin');
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  const handle = async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    if (origin && origin !== allowedExtensionOrigin) return json({ error: 'Browser origin is not allowed' }, 403);
    if (request.method === 'OPTIONS' && origin === allowedExtensionOrigin && origin) return new Response(null, { status: 204 });
    const provided = Buffer.from(request.headers.get('authorization') ?? '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return json({ error: 'Unauthorized' }, 401);
    const path = new URL(request.url).pathname;
    try {
      if (request.method === 'GET' && path === '/api/health') return json({ modes: service.modes, persistence: 'memory; restart clears all tasks' });
      const match = /^\/api\/tasks\/([a-f0-9-]+)(?:\/(events|pause|resume|speech))?$/.exec(path);
      if (request.method === 'GET' && match && !match[2]) return json(service.get(match[1]));
      if (request.method !== 'POST') return json({ error: 'Not found' }, 404);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'JSON required' }, 415);
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 65536) return json({ error: 'Request too large' }, 413);
      const body = JSON.parse(raw);
      if (path === '/api/tasks') { const { task, snapshot } = startSchema.parse(body); return json(await service.start(task, snapshot), 201); }
      if (match) {
        const [, id, action] = match;
        if (action === 'events') return json(await service.event(id, body));
        if (action === 'pause' || action === 'resume') { z.object({}).strict().parse(body); return json(await (action === 'pause' ? service.pause(id) : service.unpause(id))); }
        if (action === 'speech') { const { stepId } = z.object({ stepId: z.string() }).strict().parse(body); return json(await service.speak(id, stepId)); }
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: 'Invalid request; send only the documented value-free fields' }, 400);
      const message = error instanceof Error ? error.message : '';
      if (message === 'Task not found' || message === 'Task expired') return json({ error: message }, 404);
      const safeMessages = ['Task paused', 'Task busy', 'Event is stale; remap the current page', 'Navigation requires a new page snapshot', 'Snapshot is stale', 'A clarification answer is required', 'Answer the clarification first', 'Speech step is stale or paused'];
      return safeMessages.includes(message) ? json({ error: message }, 409) : json({ error: 'Guidance temporarily unavailable; the original page remains usable' }, 503);
    }
  };
  return async (request: Request) => {
    const response = await handle(request);
    if (allowedExtensionOrigin && request.headers.get('origin') === allowedExtensionOrigin) {
      response.headers.set('access-control-allow-origin', allowedExtensionOrigin);
      response.headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
      response.headers.set('access-control-allow-headers', 'Authorization, Content-Type');
      response.headers.set('vary', 'Origin');
    }
    return response;
  };
}
