import { test, expect } from '@playwright/test';
import path from 'node:path';
const script = path.resolve('../combined-extension/page-map.js');
async function setup(page) {
  await page.goto('http://127.0.0.1:4320');
  await page.evaluate(() => {
    globalThis.chrome = { runtime: { onMessage: { addListener(fn) { globalThis.messageHandler = fn; } } } };
    globalThis.ask = message => new Promise(resolve => globalThis.messageHandler(message, {}, resolve));
  });
  await page.addScriptTag({path:path.resolve('../combined-extension/fingerprint.js')});
  await page.addScriptTag({ path: script });
}
test('maps real controls, excludes values/editable and hidden text, and sanitizes URL', async ({ page }) => {
  await setup(page);
  const snapshot = await page.evaluate(() => globalThis.ask({ type: 'snapshot' }));
  expect(snapshot.ok).toBe(true);
  expect(snapshot.snapshot.elements.map(e => e.name)).toContain('Household');
  expect(snapshot.snapshot.elements.map(e => e.name)).toContain('Energy bill assistance');
  expect(JSON.stringify(snapshot)).not.toMatch(/PRIVATE_CANARY|PASSWORD_CANARY|HIDDEN_CANARY|EDITABLE_CANARY|QUERY_CANARY/);
  expect(snapshot.snapshot.url).toBe('http://127.0.0.1:4320/');
  expect(snapshot.snapshot.instructions).toEqual([]); // Filled-field help is withheld because it can echo answers.
});
test('highlights only current target, restores styling, never activates a control', async ({ page }) => {
  await setup(page);
  const first = await page.evaluate(() => globalThis.ask({ type: 'snapshot' }));
  const target = first.snapshot.elements.find(e => e.name === 'Energy bill assistance');
  const highlighted = await page.evaluate(({ snapshot, targetId }) => globalThis.ask({ type: 'highlight', pageId: snapshot.pageId, revision: snapshot.revision, targetId }), { snapshot: first.snapshot, targetId: target.id });
  expect(highlighted.ok).toBe(true);
  await expect(page.locator('#energy')).toHaveCSS('outline-style', 'solid');
  expect(await page.evaluate(() => globalThis.clicked)).toBeUndefined();
  await page.evaluate(() => globalThis.ask({ type: 'restore' }));
  await expect(page.locator('#energy')).toHaveCSS('outline-style', 'dotted');
  await page.locator('#energy').evaluate(el => el.textContent = 'Changed destination');
  const stale = await page.evaluate(({ snapshot, targetId }) => globalThis.ask({ type: 'highlight', pageId: snapshot.pageId, revision: snapshot.revision, targetId }), { snapshot: first.snapshot, targetId: target.id });
  expect(stale.ok).toBe(false);
});
test('newly entered values do not alter the snapshot or leak on rescan', async ({ page }) => {
  await setup(page);
  const first = await page.evaluate(() => globalThis.ask({ type: 'snapshot' }));
  await page.locator('#household').fill('NEW_PRIVATE_CANARY');
  const second = await page.evaluate(() => globalThis.ask({ type: 'snapshot' }));
  expect(second.snapshot).toEqual(first.snapshot);
  expect(JSON.stringify(second)).not.toContain('NEW_PRIVATE_CANARY');
});
test('changed link destination invalidates an old target even when its label stays the same', async ({ page }) => {
  await setup(page);
  const first = await page.evaluate(() => globalThis.ask({ type: 'snapshot' }));
  const target = first.snapshot.elements.find(e => e.name === 'Energy bill assistance');
  await page.locator('#energy').evaluate(el => el.setAttribute('href', 'https://different.example/'));
  const result = await page.evaluate(({ snapshot, targetId }) => globalThis.ask({ type: 'highlight', pageId: snapshot.pageId, revision: snapshot.revision, targetId }), { snapshot: first.snapshot, targetId: target.id });
  expect(result.ok).toBe(false);
});

test('live page snapshot flows through Mastra and targets the next page after user navigation', async ({ page }) => {
  const { createService } = await import('../../src/service.js');
  const service = createService();
  await setup(page);
  const firstSnapshot = (await page.evaluate(() => globalThis.ask({ type: 'snapshot' }))).snapshot;
  const first = await service.start('Help with my energy bill', firstSnapshot);
  expect(first.workflowStatus).toBe('suspended');
  expect(first.result.kind).toBe('guidance');
  await page.locator('#energy').click(); // This test simulates the user's action, not the extension.
  await page.waitForURL('**/form?**');
  await page.evaluate(() => {
    globalThis.chrome = { runtime: { onMessage: { addListener(fn) { globalThis.messageHandler = fn; } } } };
    globalThis.ask = message => new Promise(resolve => globalThis.messageHandler(message, {}, resolve));
  });
  await page.addScriptTag({path:path.resolve('../combined-extension/fingerprint.js')});
  await page.addScriptTag({ path: script });
  const nextSnapshot = (await page.evaluate(() => globalThis.ask({ type: 'snapshot' }))).snapshot;
  const next = await service.event(first.runId, { eventId: 'live-navigation', stepId: first.stepId, pageId: first.pageId, revision: first.revision, type: 'navigation-observed', snapshot: nextSnapshot });
  expect(next.result.kind).toBe('guidance');
  if (next.result.kind !== 'guidance') throw new Error('Expected guidance');
  expect(nextSnapshot.elements.find(e => e.id === next.result.targetId).name).toBe('Household');
  const highlighted = await page.evaluate(state => globalThis.ask({ type: 'highlight', pageId: state.pageId, revision: state.revision, targetId: state.result.targetId }), next);
  expect(highlighted.ok).toBe(true);
  await expect(page.locator('#household')).toHaveCSS('outline-style', 'solid');
  await expect(page.locator('#household')).toHaveValue('PRIVATE_CANARY');
});
test('custom textbox contents are never used as a control label', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => { const widget = document.createElement('div'); widget.setAttribute('role', 'textbox'); widget.textContent = 'CUSTOM_PRIVATE_CANARY'; document.body.append(widget); });
  const result = await page.evaluate(() => globalThis.ask({ type: 'snapshot' }));
  expect(JSON.stringify(result)).not.toContain('CUSTOM_PRIVATE_CANARY');
});
test('form context includes groups, constraints and associated errors without echoed answers',async({page})=>{
 await setup(page);
 await page.evaluate(()=>{
  const form=document.createElement('form');form.innerHTML='<fieldset><legend>Household details</legend><label for="count">People in household</label><input id="count" type="number" min="1" max="12" required aria-invalid="true" aria-errormessage="count-error" value="12345"><p id="count-error" role="alert">12345 exceeds the allowed maximum.</p><input type="submit" value="Continue application"></fieldset>';document.body.append(form);
 });
 const response=await page.evaluate(()=>globalThis.ask({type:'snapshot'}));
 const field=response.snapshot.elements.find(e=>e.name==='People in household');
 expect(field).toMatchObject({inputType:'number',required:true,groupLabel:'Household details',constraints:{min:'1',max:'12'},validation:{invalid:true}});
 expect(field.validation.messages[0]).toContain('validation error');expect(JSON.stringify(response)).not.toContain('12345');
 expect(response.snapshot.elements.some(e=>e.name==='Continue application'&&e.kind==='button')).toBe(true);
});
test('selected and short answers echoed in field messages stay local',async({page})=>{
 await setup(page);await page.evaluate(()=>{const form=document.createElement('form');form.innerHTML='<label for="diagnosis">Topic</label><select id="diagnosis" aria-invalid="true" aria-errormessage="select-error" aria-describedby="select-help"><option value="SELECTED_PRIVATE_CANARY">Private selected choice</option></select><p id="select-error">SELECTED_PRIVATE_CANARY is not accepted.</p><p id="select-help">SELECTED_PRIVATE_CANARY is the current answer.</p><label for="short-answer">Code</label><input id="short-answer" value="Z9" aria-invalid="true" aria-errormessage="short-error"><p id="short-error">Z9 is invalid.</p>';document.body.append(form);});
 const response=await page.evaluate(()=>globalThis.ask({type:'snapshot'}));
 expect(JSON.stringify(response)).not.toContain('SELECTED_PRIVATE_CANARY');expect(JSON.stringify(response)).not.toContain('Z9');
 expect(response.snapshot.elements.find(e=>e.name==='Topic').validation.invalid).toBe(true);
});
