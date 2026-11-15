import { assertApprovedRedirect, validateApprovedUrl } from './source-policy.mjs';

const API_URL = 'https://api.brightdata.com/request';
const MAX_RESPONSE_BYTES = 1_000_000;

export class BrightDataClient {
  constructor({ apiKey, zone, fetchImpl = fetch }) {
    if (!apiKey || !zone) throw new Error('BRIGHTDATA_API_KEY and BRIGHTDATA_ZONE are required.');
    this.apiKey = apiKey;
    this.zone = zone;
    this.fetchImpl = fetchImpl;
  }

  async fetchPublicPage(url) {
    const requestedUrl = validateApprovedUrl(url).href;
    const response = await this.fetchImpl(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zone: this.zone, url: requestedUrl, format: 'json' }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) throw new Error(`Bright Data request failed with status ${response.status}.`);
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error('Bright Data response exceeds the size limit.');
    const payload = await response.json();
    const result = readProviderResponse(payload);
    assertApprovedRedirect(result.finalUrl);
    if (Buffer.byteLength(result.html, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('Bright Data response exceeds the size limit.');
    return result;
  }
}

function readProviderResponse(payload) {
  const finalUrl = payload.url ?? payload.final_url ?? payload.response?.url;
  const html = payload.body ?? payload.html ?? payload.response?.body ?? payload.response?.html;
  if (typeof finalUrl !== 'string' || typeof html !== 'string') {
    throw new Error('Bright Data response did not include a final URL and HTML body.');
  }
  return { finalUrl, html };
}
