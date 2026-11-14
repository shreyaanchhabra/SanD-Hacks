import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', use: { headless: true }, webServer: { command: 'node tests/browser/fixture-server.mjs', url: 'http://127.0.0.1:4320', reuseExistingServer: false }, reporter: 'list' });
