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

test('documented synchronous SERP request works without a customer ID and only follows organic links', async () => {
 const calls:{url:string,body:any}[]=[];
 const fetchImpl:typeof fetch=async(url,init)=>{
  const body=init?.body?JSON.parse(String(init.body)):{};calls.push({url:String(url),body});if(!init?.body)return new Response(officialHtml,{headers:{'content-type':'text/html'}});
  return new Response(JSON.stringify(body.zone==='search'?{organic:[{link:'https://www.usa.gov/benefits/'}],ads:[{link:'https://www.other.gov/ads'}]}:{url:body.url,body:officialHtml}),{headers:{'content-type':'application/json'}});
 };
 const live=createBrightDataSourceAdapter({BRIGHTDATA_API_KEY:'fixture',BRIGHTDATA_UNLOCKER_ZONE:'pages',BRIGHTDATA_SERP_ZONE:'search'},'/tmp/accesspatch-source-test-'+Date.now(),fetchImpl);
 const result=await live.retrieveContext('required documents',startPage);
 assert.ok(result.length);assert.equal(calls[0].url,'https://api.brightdata.com/request');assert.equal(calls[0].body.zone,'search');assert.match(calls[0].body.url,/bing.com\/search/);assert.equal(new URL(calls[0].body.url).searchParams.get('brd_json'),'1');assert.equal(calls.some(c=>c.body.url==='https://www.other.gov/ads'),false);
});
test('a three-page lookup completes under the default four-call minute budget',async()=>{
 const live=adapter({provider:provider({discover:async()=>['https://www.usa.gov/one','https://www.usa.gov/two','https://www.usa.gov/three']}),budget:new RetrievalBudget({daily:20,perMinute:4})});
 assert.ok((await live.retrieveContext('required documents',startPage)).length>0);
});
test('a failed later source does not discard earlier useful official passages',async()=>{
 let pages=0;const live=adapter({provider:provider({discover:async()=>['https://www.usa.gov/one','https://www.usa.gov/two'],fetchPage:async url=>{if(++pages===2)throw Error('temporary failure');return{url,html:officialHtml};}})});
 assert.ok((await live.retrieveContext('required documents',startPage)).length>0);
});
test('an explicit help question triggers research even when the original task is navigation',async()=>{
 let lookups=0;const service=createService({sources:{mode:'configured',retrieveContext:async()=>{lookups++;return[source];}},planner:async input=>({kind:'guidance',instruction:'Read the current label.',explanation:'Help.',targetId:input.snapshot.elements[0].id,sourceIds:[],expectedOutcome:'navigation'})});
 const first=await service.start('Find energy assistance',startPage);assert.equal(lookups,0);
 await service.event(first.runId,{eventId:'help-docs',stepId:first.stepId,pageId:first.pageId,revision:first.revision,type:'help-requested',answer:'What documents should I prepare?'});
 assert.equal(lookups,1);
});

test('HTTP 200 containing a provider policy denial is a visible failure, never an empty success',async()=>{
 const live=createBrightDataSourceAdapter({BRIGHTDATA_API_KEY:'fixture',BRIGHTDATA_UNLOCKER_ZONE:'pages',BRIGHTDATA_SERP_ZONE:'search'},'/tmp/accesspatch-denial-'+Date.now(),async()=>new Response(JSON.stringify({status_code:502,headers:{'x-brd-error':'Access denied: Government blocked by usage policy','x-brd-error-code':'proxy_error'},body:'Not a source'})));
 await assert.rejects(live.retrieveContext('required documents',startPage));assert.equal(live.outcomeFor('required documents',startPage)?.status,'provider-failure');assert.match(live.outcomeFor('required documents',startPage)?.message??'',/restricts access/);
});

test('search results can supply reviewed nonprofit instructions alongside the current government page',async()=>{
 const pages:string[]=[];const live=adapter({provider:provider({discover:async()=>['https://211.org/get-help/utilities-expenses','https://www.ncoa.org/article/help-with-energy-bills','https://benefitscheckup.org/programs','https://random-blog.example/claims'],fetchPage:async url=>{pages.push(url);return{url,html:officialHtml};}})});
 const sources=await live.retrieveContext('energy assistance documents',startPage);
 assert.ok(sources.some(s=>s.url.startsWith('https://211.org/')));assert.equal(pages.length,3);assert.equal(pages.some(url=>url.includes('random-blog')),false);
});

test('Bing structured search results yield publisher URLs, not adverts or tracking links',async()=>{
 const calls:any[]=[];const live=createBrightDataSourceAdapter({BRIGHTDATA_API_KEY:'fixture',BRIGHTDATA_UNLOCKER_ZONE:'pages',BRIGHTDATA_SERP_ZONE:'search'},'/tmp/accesspatch-bing-'+Date.now(),async(_url,init)=>{
  const body=init?.body?JSON.parse(String(init.body)):{};calls.push(body);if(!init?.body)return new Response(officialHtml,{headers:{'content-type':'text/html'}});return new Response(JSON.stringify(body.zone==='search'?{status_code:200,body:JSON.stringify({organic:[{link:'https://www.ncoa.org/article/energy-assistance'}],top_ads:[{link:'https://www.ncoa.org/advert'}]})}:{url:body.url,body:officialHtml}));
 });
 const found=await live.retrieveContext('energy assistance documents',startPage);assert.ok(found.length);assert.equal(new URL(calls[0].url).hostname,'www.bing.com');assert.equal(calls.some(c=>c.url?.includes('/advert')),false);
});

test('direct public-page fetch rejects an off-list redirect before requesting its destination',async()=>{
 let deniedRequested=false;const live=createBrightDataSourceAdapter({BRIGHTDATA_API_KEY:'fixture',BRIGHTDATA_UNLOCKER_ZONE:'unused',BRIGHTDATA_SERP_ZONE:'search'},'/tmp/accesspatch-direct-'+Date.now(),async(url,init)=>{
 if(init?.body)return new Response(JSON.stringify({organic:[{link:'https://www.ncoa.org/article/energy'}]}));
 if(String(url).startsWith('https://www.ncoa.org'))return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}});
 deniedRequested=true;throw Error('Should not request this destination');
 });
 await assert.rejects(live.retrieveContext('energy assistance documents',startPage));assert.equal(deniedRequested,false);
});

test('an explicit state changes public research context without exposing unrelated task text',async()=>{
 const queries:string[]=[];const live=adapter({provider:provider({discover:async query=>{queries.push(query);return['https://www.usa.gov/benefits/'];}})});
 await live.retrieveContext('required energy documents in California privatepersonsecret',startPage);await live.retrieveContext('required energy documents in Illinois',startPage);
 assert.equal(queries.length,2);assert.match(queries[0],/california/);assert.match(queries[1],/illinois/);assert.equal(queries[0].includes('privatepersonsecret'),false);
});

test('a search timeout is reported explicitly instead of implying no retrieval was attempted',async()=>{
 let requests=0;const live=createBrightDataSourceAdapter({BRIGHTDATA_API_KEY:'fixture',BRIGHTDATA_SERP_ZONE:'search'},'/tmp/accesspatch-search-timeout-'+Date.now(),async()=>{requests++;throw new DOMException('Timed out','TimeoutError');});
 await assert.rejects(live.retrieveContext('required energy documents',startPage));assert.equal(requests,1);assert.match(live.outcomeFor('required energy documents',startPage)?.message??'',/Bright Data search timed out/);
});
