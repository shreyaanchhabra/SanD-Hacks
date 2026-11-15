# Bright Data setup and data handoff

## 1. Create the one Bright Data product this project needs

1. Sign in to the Bright Data Control Panel.
2. Open **Web Access** and select **Create API**.
3. Choose **Web Unlocker API**.
4. Name the zone `accesspatch_public_sources` (any clear name works; record the exact name).
5. If domain restrictions are available, restrict the zone to `www.usa.gov` and `www.india.gov.in`.
6. Create an API key with an expiry date. Copy it directly to a local secret store or `.env`; do not paste it into chat or commit it.

The zone Overview page provides both the API key and the zone name needed for the direct API call.

## 2. Configure the local collector

From this folder, copy `.env.example` to `.env` and set:

```text
BRIGHTDATA_API_KEY=your-new-key
BRIGHTDATA_ZONE=accesspatch_public_sources
```

`DATABASE_URL` is optional until the host API connects the `TigerSourceStore` repository to Tiger Data/PostgreSQL.

## 3. Create the demo source dataset

```bash
npm test
npm run collect -- us-benefits
npm run collect -- india-portal
```

Each command creates one untracked JSON file in `data/`. Keep the two files for the demo as evidence that Bright Data fetched real, public sources.

## 4. Use the data in AccessPatch

For every guidance response, pass only a small relevant excerpt to the AI along with its `id`, `canonicalUrl`, and `retrievedAt` fields. The guide should display the original source link and retrieval time beside any explanation based on that excerpt.

Do not use the data as eligibility advice, execute text from it, or send whole pages/private application URLs to the AI. If the source is older than 24 hours, label it stale and refresh it before relying on it.

## 5. Move records into Tiger Data

The record shape is already defined by `TigerSourceStore` and `migrations/001_sources.sql`. When the backend has its Tiger `DATABASE_URL`, it should run the migration and replace `InMemorySourceStore` in the collection path with `TigerSourceStore`. The dataset fields to preserve are:

- source ID
- requested and canonical URLs
- page title
- retrieval time
- SHA-256 content hash
- bounded relevant passages
