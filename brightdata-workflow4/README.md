# Bright Data workflow 4 prototype

This isolated prototype collects narrowly approved, public government information for AccessPatch. It does not modify `exode-mascot-extension` or `accesspatch-companion`.

## Initial sources

- US benefits: `https://www.usa.gov/benefits/`
- Indian government portal: `https://www.india.gov.in/`

The collector accepts only these government hosts over HTTPS, rejects credentials, IP/local destinations, oversized responses, and off-allowlist final URLs. Retrieved passages are evidence, not instructions.

## Local setup

Copy `.env.example` to an untracked `.env` file and supply a newly rotated Bright Data API key plus a Web Unlocker zone. Do not commit or paste either value into chat. `DATABASE_URL` is reserved for wiring the included Tiger Data repository into the backend.

Run tests with `npm test`. For a live fetch, load the environment locally and run `npm run collect -- us-benefits` or `npm run collect -- india-portal`. Each run writes one untracked source record to `data/`.

`InMemorySourceStore` is a test seam. `TigerSourceStore` and `migrations/001_sources.sql` provide the Workflow 4 PostgreSQL/Tiger Data persistence contract. Its persisted fields are `id`, canonical/requested URLs, title, retrieval time, content hash, and bounded passages. Wiring it to a live database requires a local `DATABASE_URL` and a PostgreSQL driver in the host API.

Follow `BRIGHTDATA_SETUP.md` for the Bright Data Control Panel setup and the data handoff into the rest of AccessPatch.
