import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrightDataSourceAdapter, MemoryPublicSourceCache, RetrievalBudget, createBrightDataSourceAdapter, decideRetrieval, type BrightDataProvider } from '../src/brightdata.js';
import { createService } from '../src/service.js';
import { formPage, startPage } from '../src/fixtures.js';

const officialHtml = '<title>Official help</title><p>Bring proof of income and proof of identity when the program asks for documents.</p><p>Applications have different requirements depending on the program.</p>';
const source = { id: 'bd-source', url: 'https://www.usa.gov/benefits/', text: 'Bring proof of income and proof of identity when the program asks for documents.', retrievedAt: '2026-11-14T12:00:00.000Z', synthetic: false as const };

function provider(overrides: Partial<BrightDataProvider> = {}) {
  return {
    discover: async () => ['https://www.usa.gov/benefits/', 'https://example.com/not-official', 'https://127.0.0.1/private'],
    fetchPage: async (url: string) => ({ url, html: officialHtml }),
    ...overrides,
  } satisfies BrightDataProvider;
}
function adapter(overrides: Partial<ConstructorParameters<typeof BrightDataSourceAdapter>[0]> = {}) {
  return new BrightDataSourceAdapter({ provider: provider(), cache: new MemoryPublicSourceCache(), budget: new RetrievalBudget({ daily: 20, perMinute: 20 }), ...overrides });
}

test('retrieval decisions keep visible navigation page-only and retrieve document questions', () => {
  assert.equal(decideRetrieval('Open energy assistance', startPage, []).action, 'page-only');
  assert.equal(decideRetrieval('What documents are required?', startPage, []).action, 'retrieve');
  assert.equal(decideRetrieval('Explain household definition', formPage, []).action, 'retrieve');
});

test('Bright Data adapter fetches only verified official URLs and returns real excerpts', async () => {
  const calls: string[] = [];
  const sources = await adapter({ provider: provider({ fetchPage: async url => { calls.push(url); return { url, html: officialHtml }; } }) }).retrieveContext('What documents are required?', startPage);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].synthetic, false);
  assert.equal(sources[0].url, 'https://www.usa.gov/benefits/');
  assert.deepEqual(calls, ['https://www.usa.gov/benefits/']);
});

test('fetched redirect destinations outside the official allowlist are discarded', async () => {
  const sources = await adapter({ provider: provider({ discover: async () => ['https://www.usa.gov/benefits/'], fetchPage: async () => ({ url: 'https://127.0.0.1/private', html: officialHtml }) }) }).retrieveContext('What documents are required?', startPage);
  assert.deepEqual(sources, []);
});

test('public-source cache and single-flight deduplicate concurrent retrieval', async () => {
  let searches = 0;
  const cached = adapter({ provider: provider({ discover: async () => { searches += 1; return ['https://www.usa.gov/benefits/']; } }) });
  const task = 'What documents are required?';
  const [first, second] = await Promise.all([cached.retrieveContext(task, startPage), cached.retrieveContext(task, startPage)]);
  assert.deepEqual(first, second);
  assert.equal(searches, 1);
  await cached.retrieveContext(task, startPage);
  assert.equal(searches, 1);
  assert.equal(cached.outcomeFor(task, startPage)?.status, 'cached');
});

test('call budgets stop excessive Bright Data requests', async () => {
  const limited = adapter({ budget: new RetrievalBudget({ daily: 1, perMinute: 1 }) });
  await assert.rejects(limited.retrieveContext('What documents are required?', startPage), /call budget/);
  assert.equal(limited.outcomeFor('What documents are required?', startPage)?.status, 'budget-limited');
});

test('provider failures preserve page-only guidance and expose a safe retrieval state', async () => {
  const failing = adapter({ provider: provider({ discover: async () => { throw Object.assign(new Error('provider secret'), { status: 429 }); } }) });
  const service = createService({
    sources: failing,
    planner: async () => ({ kind: 'guidance', instruction: 'Read the Energy bill assistance link.', explanation: 'The current page label is available.', targetId: 'energy-link', sourceIds: [], expectedOutcome: 'navigation' }),
  });
  const state = await service.start('What documents are required?', startPage);
  assert.equal(state.status, 'waiting-for-user');
  assert.equal(state.analysis.retrieval, 'provider-failure');
  assert.equal(state.analysis.retrievalMessage, 'External instructions unavailable.');
  assert.ok(!JSON.stringify(state).includes('provider secret'));
});

test('rate-limited discovery enters cooldown instead of immediately retrying Bright Data', async () => {
  let calls = 0;
  const limited = adapter({ provider: provider({ discover: async () => { calls += 1; throw Object.assign(new Error('rate limit'), { status: 429 }); } }) });
  await assert.rejects(limited.retrieveContext('What documents are required?', startPage));
  await assert.rejects(limited.retrieveContext('What documents are required?', startPage), /cooling down/);
  assert.equal(calls, 1);
});

test('Bright Data is not presented as configured without every required environment value', async () => {
  const disconnected = createBrightDataSourceAdapter({}, '.unused-public-source-cache');
  assert.equal(disconnected.mode, 'not-configured');
  assert.deepEqual(await disconnected.retrieveContext('documents', startPage), []);
});

test('source-backed checklists return only cited fetched sources', async () => {
  const live = adapter({ provider: provider({ discover: async () => ['https://www.usa.gov/benefits/'] }) });
  const service = createService({
    sources: live,
    planner: async input => ({ kind: 'guidance', instruction: 'Read the benefits link.', explanation: 'Official instructions list preparation documents.', targetId: 'energy-link', sourceIds: [input.sources[0].id], checklist: [{ text: 'Have proof of income available.', sourceId: input.sources[0].id }], expectedOutcome: 'navigation' }),
  });
  const state = await service.start('What documents are required?', startPage);
  assert.equal(state.sources.length, 1);
  assert.equal(state.sources[0].synthetic, false);
  if (state.result.kind === 'guidance') assert.deepEqual(state.result.checklist, [{ text: 'Have proof of income available.', sourceId: state.sources[0].id }]);
});

test('linked-page retrieval retains prior official excerpts while refreshing changed websites', async () => {
  let discoveries = 0;
  const live = adapter({ provider: provider({ discover: async () => { discoveries += 1; return ['https://www.usa.gov/benefits/']; } }) });
  const service = createService({
    sources: live,
    planner: async input => ({ kind: 'guidance', instruction: 'Read the current page.', explanation: 'Official context is available.', targetId: input.snapshot.elements[0].id, sourceIds: [input.sources[0].id], expectedOutcome: 'navigation' }),
  });
  const first = await service.start('What documents are required?', startPage);
  const next = await service.event(first.runId, { eventId: 'next', stepId: first.stepId, pageId: first.pageId, revision: first.revision, type: 'navigation-observed', snapshot: formPage });
  assert.equal(discoveries, 2);
  assert.equal(next.sources.length, 1);
  assert.equal(next.sources[0].synthetic, false);
});
