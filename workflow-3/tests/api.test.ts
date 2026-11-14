import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/api.js';
import { startPage } from '../src/fixtures.js';
const api = createApi({ token: 'test-local-token' });
const request = (path: string, body?: unknown, token = 'test-local-token') => new Request(`http://127.0.0.1:4313${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
test('API denies unauthenticated callers and hostile browser origins', async () => {
  assert.equal((await api(request('/api/health', undefined, 'wrong'))).status, 401);
  const req = request('/api/health'); req.headers.set('Origin', 'https://evil.example');
  assert.equal((await api(req)).status, 403);
});
test('API starts a standalone run, returns sponsor modes, and rejects private fields', async () => {
  const health = await (await api(request('/api/health'))).json();
  assert.equal(health.modes.ElevenLabs, 'mock-no-audio');
  const response = await api(request('/api/tasks', { task: 'energy bill', snapshot: startPage }));
  assert.equal(response.status, 201);
  const state = await response.json();
  assert.equal(state.status, 'waiting-for-user');
  assert.equal((await api(request(`/api/tasks/${state.runId}`))).status, 200);
  const speech = await (await api(request(`/api/tasks/${state.runId}/speech`, { stepId: state.stepId }))).json();
  assert.equal(speech.status, 'mock-no-audio');
  assert.equal((await api(request('/api/tasks', { task: 'energy bill', snapshot: { ...startPage, password: 'SECRET' } }))).status, 400);
});
test('only the configured extension origin can make authenticated requests', async () => {
  const origin = 'chrome-extension://' + 'a'.repeat(32);
  const extensionApi = createApi({ token: 'test-local-token', allowedExtensionOrigin: origin });
  const req = request('/api/health'); req.headers.set('origin', origin);
  const result = await extensionApi(req);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('access-control-allow-origin'), origin);
  const preflight = new Request('http://127.0.0.1:4313/api/tasks', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, content-type' } });
  assert.equal((await extensionApi(preflight)).status, 204);
  const unauthorized = request('/api/health', undefined, 'wrong'); unauthorized.headers.set('origin', origin);
  assert.equal((await extensionApi(unauthorized)).status, 401);
  req.headers.set('origin', 'chrome-extension://' + 'b'.repeat(32));
  assert.equal((await extensionApi(req)).status, 403);
});
