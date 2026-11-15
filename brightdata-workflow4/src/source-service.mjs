import { createHash, randomUUID } from 'node:crypto';
import { extractPassages, extractTitle } from './extract.mjs';
import { validateApprovedUrl } from './source-policy.mjs';

export class SourceService {
  constructor({ client, store, now = () => new Date() }) {
    this.client = client;
    this.store = store;
    this.now = now;
  }

  async collectSource(url, task = '') {
    const approvedUrl = validateApprovedUrl(url).href;
    const { finalUrl, html } = await this.client.fetchPublicPage(approvedUrl);
    const retrievedAt = this.now().toISOString();
    const record = {
      id: randomUUID(),
      canonicalUrl: finalUrl,
      requestedUrl: approvedUrl,
      title: extractTitle(html),
      retrievedAt,
      contentHash: createHash('sha256').update(html).digest('hex'),
      passages: extractPassages(html, task),
    };
    await this.store.save(record);
    return record;
  }

  async retrieveContext(task, pageUrl) {
    validateApprovedUrl(pageUrl);
    const sources = await this.store.list();
    const cutoff = this.now().getTime() - 24 * 60 * 60 * 1000;
    return sources.flatMap((source) => source.passages.map((text) => ({
      sourceId: source.id,
      url: source.canonicalUrl,
      retrievedAt: source.retrievedAt,
      stale: new Date(source.retrievedAt).getTime() < cutoff,
      text,
      task,
    })));
  }
}

export class InMemorySourceStore {
  constructor() { this.records = []; }
  async save(record) { this.records.push(record); }
  async list() { return [...this.records]; }
}
