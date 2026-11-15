import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { PageSnapshot, SourceAdapter, SourceExcerpt } from './contracts.js';

const SOURCE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_FETCHED_PAGES = 3;
const MAX_EXCERPTS = 6;
const MAX_RESPONSE_BYTES = 1_000_000;
const OFFICIAL_HOSTS = new Set(['usa.gov', 'india.gov.in']);
const NONPROFIT_HOSTS=new Set(['211.org','www.211.org','ncoa.org','www.ncoa.org','benefitscheckup.org','www.benefitscheckup.org']);
const TOPIC_WORDS = new Set(['apply', 'application', 'benefit', 'checklist', 'definition', 'document', 'documents', 'eligibility', 'food', 'form', 'health', 'housing', 'identity', 'income', 'insurance', 'household', 'required', 'requirements', 'utility', 'utilities', 'energy', 'bill', 'assistance', 'heating', 'electric', 'liheap']);
const STATES='alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia'.split('|');
function taskStates(task:string){return STATES.filter(state=>new RegExp('\\b'+state+'\\b','i').test(task));}
const cacheEntrySchema = z.object({ expiresAt: z.number().int().positive(), sources: z.array(z.object({ id: z.string(), url: z.string().url(), text: z.string(), retrievedAt: z.string(), synthetic: z.literal(false) }).strict()).max(10) }).strict();

export type RetrievalStatus = 'not-needed' | 'live' | 'cached' | 'no-results' | 'not-configured' | 'provider-failure' | 'budget-limited';
export type RetrievalOutcome = { status: RetrievalStatus; message?: string };
export type RetrievalDecision = { action: 'page-only' | 'reuse' | 'retrieve'; reason: string };

export interface BrightDataProvider {
  discover(query: string): Promise<string[]>;
  fetchPage(url: string): Promise<{ url: string; html: string }>;
}

export interface PublicSourceCache {
  get(key: string): Promise<{ expiresAt: number; sources: SourceExcerpt[] } | null>;
  put(key: string, value: { expiresAt: number; sources: SourceExcerpt[] }): Promise<void>;
}

export class FilePublicSourceCache implements PublicSourceCache {
  constructor(private directory: string) { mkdirSync(directory, { recursive: true, mode: 0o700 }); }
  async get(key: string) {
    try { return cacheEntrySchema.parse(JSON.parse(readFileSync(join(this.directory, `${key}.json`), 'utf8'))); }
    catch { return null; }
  }
  async put(key: string, value: { expiresAt: number; sources: SourceExcerpt[] }) {
    const target = join(this.directory, `${key}.json`);
    writeFileSync(`${target}.tmp`, JSON.stringify(cacheEntrySchema.parse(value)), { mode: 0o600 });
    renameSync(`${target}.tmp`, target);
  }
}

export class MemoryPublicSourceCache implements PublicSourceCache {
  private entries = new Map<string, { expiresAt: number; sources: SourceExcerpt[] }>();
  async get(key: string) { return this.entries.get(key) ?? null; }
  async put(key: string, value: { expiresAt: number; sources: SourceExcerpt[] }) { this.entries.set(key, structuredClone(value)); }
}

class RetrievalError extends Error {
  constructor(readonly status: 'provider-failure', message: string) { super(message); }
}

export class BrightDataSourceAdapter implements SourceAdapter {
  mode = 'configured';
  private inFlight = new Map<string, Promise<SourceExcerpt[]>>();
  private outcomes = new Map<string, RetrievalOutcome>();
  private now: () => number;
  constructor(private options: { provider: BrightDataProvider; cache: PublicSourceCache; now?: () => number }) { this.now = options.now ?? Date.now; }
  outcomeFor(task: string, snapshot: PageSnapshot): RetrievalOutcome | undefined { return this.outcomes.get(contextKey(task, snapshot)); }
  async retrieveContext(task: string, snapshot: PageSnapshot): Promise<SourceExcerpt[]> {
    const key = contextKey(task, snapshot);
    const cached = await this.options.cache.get(key);
    if (cached && cached.expiresAt > this.now()) {
      this.outcomes.set(key, { status: cached.sources.length ? 'cached' : 'no-results' });
      return cached.sources;
    }
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const lookup = this.lookup(task, snapshot, key);
    this.inFlight.set(key, lookup);
    try { return await lookup; } finally { this.inFlight.delete(key); }
  }
  private async lookup(task: string, snapshot: PageSnapshot, key: string) {
    try {
      const discovered = await this.options.provider.discover(buildSearchQuery(task, snapshot));
      const candidates = uniqueUrls([...discovered, snapshot.url]).filter(isApprovedPublicUrl).slice(0, MAX_FETCHED_PAGES);
      const sources: SourceExcerpt[] = [];
      for (const candidate of candidates) {
        let page;
        try { page = await this.options.provider.fetchPage(candidate); }
        catch(error) {
          if(error instanceof RetrievalError || statusCode(error)===429){if(!sources.length)throw error;break;}
          if(candidate===candidates.at(-1)&&!sources.length)throw error;
          continue;
        }
        if (!isApprovedPublicUrl(page.url)) continue;
        for (const text of extractRelevantPassages(page.html, task, snapshot)) {
          if (sources.length >= MAX_EXCERPTS) break;
          sources.push({ id: sourceId(page.url, text), url: canonicalUrl(page.url), text, retrievedAt: new Date(this.now()).toISOString(), synthetic: false });
        }
      }
      const deduped = sources.filter((source, index, all) => all.findIndex(other => other.id === source.id) === index);
      await this.options.cache.put(key, { expiresAt: this.now() + SOURCE_TTL_MS, sources: deduped });
      this.outcomes.set(key, { status: deduped.length ? 'live' : 'no-results' });
      return deduped;
    } catch (error) {
      if (error instanceof RetrievalError) { this.outcomes.set(key, { status: error.status, message: error.message }); throw error; }
      const message = 'External instructions unavailable.';
      this.outcomes.set(key, { status: 'provider-failure', message });
      throw new RetrievalError('provider-failure', message);
    }
  }
}

export function decideRetrieval(task: string, snapshot: PageSnapshot, retained: SourceExcerpt[], now = Date.now()): RetrievalDecision {
  const explicitResearch = /\b(document|documents|checklist|required|requirement|prepare|bring|proof|definition|what does|what is|means|meaning|explain|eligib)/i.test(task);
  const hasFormGap = snapshot.elements.some(element => element.kind === 'field' && !snapshot.instructions.some(instruction => instruction.elementId === element.id));
  const visibleNavigation = snapshot.elements.some(element => (element.kind === 'link' || element.kind === 'button') && element.name.length > 0);
  const navigationOnly = /\b(open|go|next|continue|start|find|navigate)\b/i.test(task) && !explicitResearch;
  if (visibleNavigation && navigationOnly) return { action: 'page-only', reason: 'A visible page control can be used without external instructions.' };
  if (!explicitResearch && !hasFormGap) return { action: 'page-only', reason: 'The current page contains sufficient visible guidance.' };
  const currentOrigin = new URL(snapshot.url).origin;
  const needs = [...safeTaskTerms(task), ...informationNeed(snapshot).flatMap(value => value.match(/[a-z]{3,}/g) ?? [])];
  const fresh = retained.filter(source => new URL(source.url).origin === currentOrigin && now - new Date(source.retrievedAt).getTime() < SOURCE_TTL_MS);
  const requestedStates=taskStates(task);
  const matchesNeed = fresh.some(source => (!requestedStates.length||requestedStates.some(state=>(source.url+' '+source.text).toLowerCase().includes(state))) && (needs.length === 0 || needs.some(term => new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(source.text))));
  if (matchesNeed) return { action: 'reuse', reason: 'Relevant public instructions are already available for this task and website.' };
  return { action: 'retrieve', reason: explicitResearch ? 'The task requests public instructions or document preparation.' : 'A form field lacks nearby public instructions.' };
}

export function createBrightDataSourceAdapter(environment: NodeJS.ProcessEnv, cacheDirectory: string, fetchImpl: typeof fetch = fetch): SourceAdapter {
  const apiKey = environment.BRIGHTDATA_API_KEY;
  const serpZone = environment.BRIGHTDATA_SERP_ZONE;
  if (!apiKey || !serpZone) return { mode: 'not-configured', retrieveContext: async () => [] };
  const positive = (value: string | undefined, fallback: number) => { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback; };
  const timeoutMs = positive(environment.BRIGHTDATA_TIMEOUT_MS, 15_000);
  return new BrightDataSourceAdapter({
    provider: new BrightDataHttpProvider({ apiKey, serpZone, timeoutMs, fetchImpl }),
    cache: new FilePublicSourceCache(cacheDirectory),
  });
}

class BrightDataHttpProvider implements BrightDataProvider {
  constructor(private options: { apiKey: string; serpZone: string; timeoutMs: number; fetchImpl: typeof fetch }) {}
  async discover(query: string): Promise<string[]> {
    const search=new URL('https://www.bing.com/search');search.searchParams.set('q',query);search.searchParams.set('brd_json','1');
    const response=await this.request(new URL('https://api.brightdata.com/request'),{method:'POST',body:JSON.stringify({zone:this.options.serpZone,url:search.toString(),format:'json'})});
    const payload=providerPayload(JSON.parse(await boundedText(response))) as {organic?:{link?:unknown}[]};
    return (payload.organic??[]).flatMap(item=>typeof item.link==='string'&&isApprovedPublicUrl(item.link)?[item.link]:[]);
  }

  async fetchPage(url: string): Promise<{ url: string; html: string }> {
    let current=url;
    for(let redirects=0;redirects<=3;redirects++){
      if(!isApprovedPublicUrl(current))throw new Error('Unapproved public destination');
      const response=await this.options.fetchImpl(current,{method:'GET',redirect:'manual',headers:{Accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(this.options.timeoutMs)});
      if([301,302,303,307,308].includes(response.status)){
        const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new Error('Redirect without destination');
        current=new URL(location,current).toString();if(!isApprovedPublicUrl(current))throw new Error('Unapproved public redirect');continue;
      }
      if(!response.ok)throw Object.assign(new Error('Public source unavailable'),{status:response.status});
      if(!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type')??''))throw new Error('Unsupported public content');
      return{url:canonicalUrl(current),html:await boundedText(response)};
    }
    throw new Error('Too many public redirects');
  }

  private async request(url: URL, init: RequestInit) {
    let response:Response;
    try{response = await this.options.fetchImpl(url, { ...init, headers: { Authorization: `Bearer ${this.options.apiKey}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(this.options.timeoutMs) });}
    catch(error){if(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name))throw new RetrievalError('provider-failure','Bright Data search timed out. Page guidance still works; try the lookup again later.');throw error;}
    if (!response.ok) throw Object.assign(new Error(`Bright Data request failed with ${response.status}`), { status: response.status });
    return response;
  }
}

function contextKey(task: string, snapshot: PageSnapshot) { return createHash('sha256').update(JSON.stringify({ origin: new URL(snapshot.url).origin, task: safeTaskTerms(task), ...(taskStates(task).length?{states:taskStates(task)}:{}), need: informationNeed(snapshot) })).digest('hex'); }
function sourceId(url: string, text: string) { return `bd-${createHash('sha256').update(`${url}\n${text}`).digest('hex').slice(0, 24)}`; }
function canonicalUrl(value: string) { const url = new URL(value); url.username = ''; url.password = ''; url.search = ''; url.hash = ''; return url.href; }
function isApprovedPublicUrl(value: string) { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !isPrivateHost(url.hostname) && (isOfficialHost(url.hostname)||NONPROFIT_HOSTS.has(url.hostname.toLowerCase())); } catch { return false; } }
function isOfficialHost(hostname: string) { const host = hostname.toLowerCase(); return OFFICIAL_HOSTS.has(host) || host.endsWith('.gov') || host.endsWith('.gov.in'); }
function isPrivateHost(hostname: string) { const host = hostname.toLowerCase(); return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':'); }
function uniqueUrls(values: string[]) { return [...new Set(values.map(value => { try { return canonicalUrl(value); } catch { return ''; } }).filter(Boolean))]; }
function safeTaskTerms(task: string) { return [...new Set((task.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter(word => TOPIC_WORDS.has(word)))].slice(0, 6); }
function informationNeed(snapshot: PageSnapshot) { return snapshot.elements.filter(element => element.kind === 'field').map(element => element.name.toLowerCase().replace(/[^a-z ]/g, '')).map(value => (value.match(/[a-z]{3,}/g) ?? []).filter(word => TOPIC_WORDS.has(word)).join(' ')).filter(Boolean).slice(0, 5); }
function buildSearchQuery(task: string, snapshot: PageSnapshot) {
  const publicTerms = [...taskStates(task), ...safeTaskTerms(task), ...informationNeed(snapshot).flatMap(value => value.match(/[a-z]{3,}/g) ?? [])];
  return `${[...new Set(publicTerms)].slice(0,10).join(' ')||'application instructions'} official nonprofit help`.slice(0,300);
}
function extractRelevantPassages(html: string, task: string, snapshot: PageSnapshot) {
  const candidates = (html.match(/<(?:p|li|h[1-3])\b[^>]*>[\s\S]*?<\/(?:p|li|h[1-3])>/gi) ?? []).map(fragment => decode(strip(fragment)).replace(/\s+/g, ' ').trim()).filter(text => text.length >= 40);
  const keywords = new Set([...safeTaskTerms(task), ...informationNeed(snapshot).flatMap(value => value.match(/[a-z]{3,}/g) ?? [])]);
  return candidates.map(text => ({ text: text.slice(0, 1200), score: [...keywords].filter(keyword => new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(text)).length })).filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score || a.text.length - b.text.length).slice(0, 2).map(candidate => candidate.text);
}
function strip(value: string) { return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '); }
function decode(value: string) { return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>'); }
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function statusCode(error: unknown) { return Number((error as { status?: unknown })?.status); }

async function boundedText(response:Response){
 if(Number(response.headers.get('content-length'))>MAX_RESPONSE_BYTES)throw new Error('Source response too large');
 if(!response.body)return '';const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_RESPONSE_BYTES)throw new Error('Source response too large');chunks.push(value);}}finally{await reader.cancel();reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}

function providerPayload(value:unknown):Record<string,unknown>{
 const parsed=z.record(z.string(),z.unknown()).parse(value);const status=Number(parsed.status_code??200);
 if(status>=400){const headers=parsed.headers as Record<string,unknown>|undefined;const policy=/usage policy|classified as Government/i.test(String(headers?.['x-brd-error']??''));
 if(policy)throw new RetrievalError('provider-failure','Bright Data restricts access to this public site. Page guidance still works.');
 throw Object.assign(new Error('External instructions unavailable.'),{status});}
 if(typeof parsed.body==='string'&&!parsed.organic){try{const nested=JSON.parse(parsed.body);if(nested?.organic)return nested;}catch{}}
 return parsed;
}
