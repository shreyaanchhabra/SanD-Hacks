import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BrightDataClient } from '../src/brightdata-client.mjs';
import { SourceService, InMemorySourceStore } from '../src/source-service.mjs';
import { APPROVED_SOURCES } from '../src/source-policy.mjs';

const source = APPROVED_SOURCES.find(({ category }) => category === process.argv[2]);
if (!source) {
  console.error(`Choose one of: ${APPROVED_SOURCES.map(({ category }) => category).join(', ')}`);
  process.exitCode = 1;
} else {
  const client = new BrightDataClient({
    apiKey: process.env.BRIGHTDATA_API_KEY,
    zone: process.env.BRIGHTDATA_ZONE,
  });
  const service = new SourceService({ client, store: new InMemorySourceStore() });
  const record = await service.collectSource(source.url, 'government benefits and financial assistance');
  const outputDirectory = fileURLToPath(new URL('../data/', import.meta.url));
  const outputFile = `${outputDirectory}/${source.category}-${record.retrievedAt.replaceAll(':', '-')}.json`;
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputFile, id: record.id, url: record.canonicalUrl, title: record.title, retrievedAt: record.retrievedAt, passageCount: record.passages.length }, null, 2));
}
