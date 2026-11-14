import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../src/service.js';
import { planStep, mockPlanner } from '../src/planner.js';
import { startPage, formPage, sources } from '../src/fixtures.js';
import { snapshotSchema } from '../src/contracts.js';

const input = () => ({ task: 'Help with my energy bill', snapshot: startPage, sources, history: [] });
test('snapshot rejects entered values instead of forwarding them', () => {
  assert.equal(snapshotSchema.safeParse({ ...startPage, elements: [{ ...startPage.elements[0], value: 'SECRET' }] }).success, false);
});
test('mock planner chooses a supplied target and asks about ambiguous goals', async () => {
  const result = await planStep(input(), mockPlanner);
  assert.equal(result.kind, 'guidance');
  if (result.kind === 'guidance') assert.equal(result.targetId, 'energy-link');
  assert.equal((await planStep({ ...input(), task: 'help' }, mockPlanner)).kind, 'clarification');
});
test('unknown targets and fabricated sources produce safe fallback', async () => {
  const valid = await mockPlanner(input());
  for (const change of [{ targetId: 'invented' }, { sourceIds: ['fake'] }, { arbitraryScript: 'bad' }]) {
    assert.equal((await planStep(input(), async () => ({ ...valid as object, ...change }))).kind, 'unsupported');
  }
});
test('provider failure is bounded and does not expose errors', async () => {
  const result = await planStep(input(), async () => { throw new Error('SECRET'); });
  assert.equal(result.kind, 'unsupported');
  assert.ok(!JSON.stringify(result).includes('SECRET'));
});
test('Mastra suspends, resumes with a fresh page, and deduplicates events', async () => {
  const service = createService();
  const first = await service.start('Help with my energy bill', startPage);
  assert.equal(first.status, 'waiting-for-user');
  assert.equal(first.workflowStatus, 'suspended');
  const event = { eventId: 'e1', stepId: first.stepId, pageId: startPage.pageId, revision: 1, type: 'navigation-observed' as const, snapshot: formPage };
  const next = await service.event(first.runId, event);
  assert.equal(next.result.kind, 'guidance');
  if (next.result.kind === 'guidance') assert.equal(next.result.targetId, 'household-label');
  assert.notEqual(next.stepId, first.stepId);
  assert.deepEqual(await service.event(first.runId, event), next);
  await assert.rejects(service.event(first.runId, { ...event, eventId: 'e2' }), /stale/);
});
test('clarification answers update intent without pretending page progress', async () => {
  const service = createService();
  const first = await service.start('help', startPage);
  assert.equal(first.status, 'clarifying');
  const next = await service.event(first.runId, { eventId: 'answer', stepId: first.stepId, pageId: first.pageId, revision: first.revision, type: 'clarification-answered', answer: 'energy bill assistance' });
  assert.equal(next.status, 'waiting-for-user');
});
test('pause blocks progression until explicitly resumed', async () => {
  const service = createService();
  const first = await service.start('energy bill', startPage);
  assert.equal((await service.pause(first.runId)).status, 'paused');
  await assert.rejects(service.event(first.runId, { eventId: 'e1', stepId: first.stepId, pageId: first.pageId, revision: 1, type: 'user-confirmed' }), /paused/);
  assert.equal((await service.unpause(first.runId)).status, 'waiting-for-user');
});
test('unchanged page is not navigation and missing targets do not complete a task', async () => {
  const service = createService();
  const first = await service.start('energy bill', startPage);
  await assert.rejects(service.event(first.runId, { eventId: 'e1', stepId: first.stepId, pageId: first.pageId, revision: 1, type: 'navigation-observed', snapshot: startPage }), /new page/);
  assert.equal((await planStep({ ...input(), snapshot: { ...startPage, elements: [] } }, mockPlanner)).kind, 'unsupported');
});
test('cited source metadata reaches clients for visible attribution', async () => {
  const service = createService({ planner: async () => ({ kind: 'guidance', instruction: 'Read the energy instructions.', explanation: 'Synthetic example.', targetId: 'energy-link', sourceIds: ['demo-source'], expectedOutcome: 'navigation' }) });
  const first = await service.start('energy bill', startPage);
  assert.deepEqual(first.sources, sources);
});
test('same-page continuation receives the previous target and instruction', async () => {
  const service = createService({ planner: async input => {
    if (input.history.some(h => h.includes('household-label') && h.includes('Read the instructions'))) return { kind: 'unsupported', reason: 'The supported demonstration ends here.' };
    return mockPlanner(input);
  } });
  const first = await service.start('energy bill', formPage);
  const next = await service.event(first.runId, { eventId: 'read', stepId: first.stepId, pageId: first.pageId, revision: first.revision, type: 'user-confirmed' });
  assert.equal(next.result.kind, 'unsupported');
});
test('demo planner accepts live-generated target IDs without hardcoded DOM IDs', async () => {
  const live = { ...startPage, elements: [{ ...startPage.elements[0], id: 'ap-19' }] };
  const result = await planStep({ ...input(), snapshot: live }, mockPlanner);
  assert.equal(result.kind, 'guidance');
  if (result.kind === 'guidance') assert.equal(result.targetId, 'ap-19');
});
