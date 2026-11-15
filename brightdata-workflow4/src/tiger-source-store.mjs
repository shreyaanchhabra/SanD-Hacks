export class TigerSourceStore {
  constructor(pool) {
    this.pool = pool;
  }

  async save(record) {
    await this.pool.query(
      `INSERT INTO sources (
        id, canonical_url, requested_url, title, retrieved_at, content_hash, passages
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      ON CONFLICT (canonical_url, content_hash) DO NOTHING`,
      [
        record.id,
        record.canonicalUrl,
        record.requestedUrl,
        record.title,
        record.retrievedAt,
        record.contentHash,
        JSON.stringify(record.passages),
      ],
    );
  }

  async list() {
    const result = await this.pool.query(
      `SELECT id, canonical_url, requested_url, title, retrieved_at, content_hash, passages
       FROM sources
       ORDER BY retrieved_at DESC`,
    );
    return result.rows.map((row) => ({
      id: row.id,
      canonicalUrl: row.canonical_url,
      requestedUrl: row.requested_url,
      title: row.title,
      retrievedAt: new Date(row.retrieved_at).toISOString(),
      contentHash: row.content_hash,
      passages: typeof row.passages === 'string' ? JSON.parse(row.passages) : row.passages,
    }));
  }
}
