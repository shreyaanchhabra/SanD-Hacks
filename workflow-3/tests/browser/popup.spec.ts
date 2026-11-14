import { test, expect } from '@playwright/test';
test('late guidance is withheld after page changes while the request is in flight', async ({ page }) => {
  await page.addInitScript(() => {
    const snapshot = { pageId: 'page-a', revision: 1, url: 'https://example.org/', title: 'Test', headings: [], elements: [{ id: 'ap-1', role: 'link', name: 'Energy bill assistance', kind: 'link', protected: false }], instructions: [] };
    globalThis.currentSnapshot = snapshot;
    const storage = { localToken: 'test-token' };
    globalThis.chrome = {
      runtime: { id: 'a'.repeat(32) },
      tabs: { query: async () => [{ id: 1 }], sendMessage: async () => ({ ok: true, snapshot: globalThis.currentSnapshot }) },
      scripting: { executeScript: async () => [] },
      storage: { session: { get: async () => storage, set: async value => Object.assign(storage, value), remove: async key => delete storage[key] } },
    };
    globalThis.fetch = async url => {
      if (url.endsWith('/api/health')) return new Response(JSON.stringify({ modes: { Gemini: 'mock' } }), { status: 200 });
      globalThis.requestStarted = true;
      await new Promise(resolve => { globalThis.releaseResponse = resolve; });
      return new Response(JSON.stringify({ runId: 'run', stepId: 'step', pageId: 'page-a', revision: 1, status: 'waiting-for-user', sources: [], result: { kind: 'guidance', targetId: 'ap-1', instruction: 'STALE INSTRUCTION', explanation: 'Old page', sourceIds: [], expectedOutcome: 'navigation' } }), { status: 201 });
    };
  });
  await page.goto('http://127.0.0.1:4320/connector');
  await page.locator('#task').fill('energy bill');
  await page.locator('#inspect').click();
  await page.locator('#start').click();
  await expect.poll(() => page.evaluate(() => globalThis.requestStarted)).toBe(true);
  await page.evaluate(() => { globalThis.currentSnapshot = { ...globalThis.currentSnapshot, pageId: 'page-b' }; globalThis.releaseResponse(); });
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#status')).toContainText('page changed');
  await expect(page.locator('#instruction')).not.toContainText('STALE INSTRUCTION');
  await expect(page.locator('#highlight')).toBeDisabled();
});
