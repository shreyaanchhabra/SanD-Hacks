import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const eventTypes = ['explain_more', 'im_stuck', 'lost_target', 'provider_failure'] as const;
export type GuidanceEventType = typeof eventTypes[number];
export type SavedJourney = {
  id: string;
  goal: string;
  milestone: string;
  confirmedProgress: string[];
  mastraRunId: string;
  updatedAt: string;
};

/** Tiger Data stores only explicit user saves, approved public sources, and consented coarse events. */
export class TigerDataStore {
  private constructor(private pool: Pool, private ownerId: string) {}

  static async connect(connectionString: string, ownerId: string) {
    const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000, ssl: { rejectUnauthorized: true } });
    const store = new TigerDataStore(pool, ownerId);
    try { await store.migrate(); } catch (error) { await pool.end(); throw error; }
    return store;
  }

  private async migrate() {
    const migration = readFileSync(fileURLToPath(new URL('../migrations/001_tiger_data.sql', import.meta.url)), 'utf8');
    await this.pool.query(migration);
  }

  async saveJourney(journey: SavedJourney) {
    await this.pool.query(`INSERT INTO accesspatch_saved_journeys(id,owner_id,goal,milestone,confirmed_progress,mastra_run_id,updated_at)
      VALUES($1,$2,$3,$4,$5::jsonb,$6,now()) ON CONFLICT(id) DO UPDATE SET goal=excluded.goal,milestone=excluded.milestone,
      confirmed_progress=excluded.confirmed_progress,mastra_run_id=excluded.mastra_run_id,updated_at=now() WHERE accesspatch_saved_journeys.owner_id=excluded.owner_id`,
    [journey.id, this.ownerId, journey.goal.slice(0, 2000), journey.milestone.slice(0, 160), JSON.stringify(journey.confirmedProgress.slice(-20).map(x => x.slice(0, 160))), journey.mastraRunId]);
  }

  async listJourneys(): Promise<SavedJourney[]> {
    const result = await this.pool.query(`SELECT id,goal,milestone,confirmed_progress,mastra_run_id,updated_at FROM accesspatch_saved_journeys WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 100`, [this.ownerId]);
    return result.rows.map(row => ({ id: row.id, goal: row.goal, milestone: row.milestone, confirmedProgress: row.confirmed_progress, mastraRunId: row.mastra_run_id, updatedAt: row.updated_at.toISOString() }));
  }

  async deleteJourney(id: string) { await this.pool.query('DELETE FROM accesspatch_saved_journeys WHERE id=$1 AND owner_id=$2', [id, this.ownerId]); }

  async recordEvent(input: { id: string; type: GuidanceEventType; journeyCategory: string; stepCategory: string; provider?: string }) {
    await this.pool.query("DELETE FROM accesspatch_guidance_events WHERE created_at < now() - interval '7 days'");
    await this.pool.query(`INSERT INTO accesspatch_guidance_events(id,owner_id,event_type,journey_category,step_category,provider)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`, [input.id, this.ownerId, input.type, input.journeyCategory, input.stepCategory, input.provider ?? null]);
  }

  async clearEvents() { await this.pool.query('DELETE FROM accesspatch_guidance_events WHERE owner_id=$1', [this.ownerId]); }

  async saveApprovedSource(input: { id: string; url: string; title: string; excerpt: string; retrievedAt: string }) {
    const url = new URL(input.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Only public HTTPS sources can be saved');
    const excerpt = input.excerpt.slice(0, 2000);
    const hash = createHash('sha256').update(excerpt).digest('hex');
    await this.pool.query(`INSERT INTO accesspatch_public_sources(id,canonical_url,title,excerpt,content_sha256,retrieved_at)
      VALUES($1,$2,$3,$4,$5,$6::timestamptz) ON CONFLICT(id) DO UPDATE SET canonical_url=excluded.canonical_url,title=excluded.title,
      excerpt=excluded.excerpt,content_sha256=excluded.content_sha256,retrieved_at=excluded.retrieved_at`, [input.id, url.toString(), input.title.slice(0, 300), excerpt, hash, input.retrievedAt]);
  }

  async close() { await this.pool.end(); }
}

export const guidanceEventType = (value: unknown): value is GuidanceEventType => typeof value === 'string' && (eventTypes as readonly string[]).includes(value);
