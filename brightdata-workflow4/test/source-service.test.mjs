import assert from 'node:assert/strict';
import test from 'node:test';
import { BrightDataClient } from '../src/brightdata-client.mjs';
import { InMemorySourceStore, SourceService } from '../src/source-service.mjs';
import { validateApprovedUrl } from '../src/source-policy.mjs';
import { TigerSourceStore } from '../src/tiger-source-store.mjs';

test('rejects unsafe and unapproved source URLs before a provider request', () => {
  for (const url of ['http://www.usa.gov/benefits', 'https://localhost/', 'https://127.0.0.1/', 'https://example.com/', 'https://user:secret@www.usa.gov/']) {
    assert.throws(() => validateApprovedUrl(url));
  }
});

test('stores bounded cited passages from an approved Bright Data response', async () => {
  const client = new BrightDataClient({
    apiKey: 'test-key',
    zone: 'test-zone',
    fetchImpl: async () => new Response(JSON.stringify({
      url: 'https://www.usa.gov/benefits/',
      body: '<title>Government benefits</title><p>Find government benefits and financial help for food, housing, health care, and other basic expenses.</p><p>Each program has its own eligibility rules, deadlines, and application process.</p>',
    }), { status: 200, headers: { 'content-type': 'application/json' } }),
  });
  const service = new SourceService({
    client,
    store: new InMemorySourceStore(),
    now: () => new Date('2026-11-14T12:00:00.000Z'),
  });

  const source = await service.collectSource('https://www.usa.gov/benefits/', 'food assistance');
  assert.equal(source.title, 'Government benefits');
  assert.equal(source.canonicalUrl, 'https://www.usa.gov/benefits/');
  assert.equal(source.passages.length, 1);
  assert.match(source.contentHash, /^[a-f0-9]{64}$/);
  const context = await service.retrieveContext('food assistance', 'https://www.usa.gov/benefits/');
  assert.equal(context[0].stale, false);
  assert.equal(context[0].sourceId, source.id);
});

test('rejects a redirect outside the approved government sources', async () => {
  const client = new BrightDataClient({
    apiKey: 'test-key',
    zone: 'test-zone',
    fetchImpl: async () => new Response(JSON.stringify({
      url: 'https://example.com/',
      body: '<p>Unexpected destination</p>',
    }), { status: 200 }),
  });
  await assert.rejects(() => client.fetchPublicPage('https://www.usa.gov/benefits/'), /not approved/);
});

test('writes source records through the Tiger Data repository contract', async () => {
  const calls = [];
  const store = new TigerSourceStore({
    query: async (...args) => {
      calls.push(args);
      return { rows: [] };
    },
  });
  await store.save({
    id: '6c0a9489-94a5-4bfe-886d-2fa7a6609ab5',
    canonicalUrl: 'https://www.usa.gov/benefits/',
    requestedUrl: 'https://www.usa.gov/benefits/',
    title: 'Government benefits',
    retrievedAt: '2026-11-14T12:00:00.000Z',
    contentHash: 'a'.repeat(64),
    passages: ['Find government benefits and financial help.'],
  });
  assert.match(calls[0][0], /INSERT INTO sources/);
  assert.deepEqual(JSON.parse(calls[0][1][6]), ['Find government benefits and financial help.']);
});
