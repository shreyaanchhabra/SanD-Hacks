const $ = id => document.getElementById(id);
const BASE = 'http://127.0.0.1:4313';
let tabId, state, snapshot, busy = false, modes;
const key = () => `task-${tabId}`;
function buttons() {
  for (const el of document.querySelectorAll('button')) el.disabled = busy;
  $('start').disabled = busy || !snapshot || !!state;
  $('continue').disabled = busy || !snapshot || !state || state.status === 'paused';
  $('highlight').disabled = busy || state?.result.kind !== 'guidance' || state?.status === 'paused' || state.pageId !== snapshot?.pageId || state.revision !== snapshot?.revision;
  $('pause').disabled = busy || !state;
}
async function api(path, body) {
  const token = $('token').value.trim(); if (!token) throw new Error('Enter the local API token under connection settings.');
  const response = await fetch(`${BASE}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(45000) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed'); return data;
}
async function content(message) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  const result = await chrome.tabs.sendMessage(tabId, message);
  if (!result.ok) throw new Error(result.error); return result;
}
const currentStep = () => !!state && !!snapshot && state.pageId === snapshot.pageId && state.revision === snapshot.revision;
function render() {
  const result = currentStep() && state.status !== 'paused' ? state.result : undefined;
  $('task').readOnly = !!state;
  $('instruction').textContent = result?.instruction || result?.question || result?.reason || '';
  $('explanation').textContent = result?.explanation || '';
  $('answer').hidden = $('answer-label').hidden = result?.kind !== 'clarification';
  $('pause').textContent = state?.status === 'paused' ? 'Resume' : 'Pause';
  $('sources').replaceChildren();
  for (const source of (result ? state.sources : [])) {
    if (!/^https?:\/\//.test(source.url)) continue;
    const item = document.createElement('li'), link = document.createElement('a');
    link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `${source.synthetic ? 'Demo source' : 'Source'} · ${source.retrievedAt}`; item.append(link); $('sources').append(item);
  }
  buttons();
}
async function save() {
  await chrome.storage.session.set({ [key()]: { state, task: $('task').value } });
  try {
    const current = (await content({ type: 'snapshot' })).snapshot;
    if (current.pageId !== state.pageId || current.revision !== state.revision) snapshot = undefined;
  } catch { snapshot = undefined; }
  render();
  if (!currentStep()) { $('status').textContent = 'The page changed. Inspect and review it, then continue for updated guidance.'; $('preview').textContent = 'Inspect the changed page before sending new context.'; }
}
function action(id, fn) {
  $(id).addEventListener('click', async () => {
    busy = true; buttons();
    try { await fn(); } catch (error) { $('status').textContent = `Unable to continue: ${error.message}. Restricted pages and embedded frames may not be supported.`; }
    finally { busy = false; buttons(); }
  });
}
async function connect() {
  const health = await api('/api/health'); modes = health.modes;
  await chrome.storage.session.set({ localToken: $('token').value.trim() });
  $('modes').textContent = Object.entries(modes).map(([name, mode]) => `${name}: ${mode}`).join(' · ');
  $('status').textContent = modes.Gemini === 'mock' ? 'Connected in demo mode. General page guidance requires Gemini mode.' : 'Connected. Review the page context before sharing with Gemini.';
}
action('connect', connect);
action('inspect', async () => {
  const result = await content({ type: 'snapshot' }); snapshot = result.snapshot;
  $('preview').textContent = JSON.stringify(snapshot, null, 2);
  $('capture').textContent = `${snapshot.elements.length} labeled controls and ${snapshot.headings.length} headings captured locally. Review before sending.`;
  render();
  $('status').textContent = snapshot.elements.length ? 'Page context ready to review.' : 'No supported labeled controls found on this page.';
});
async function ensureReviewedPage() {
  if (!snapshot) throw new Error('Inspect this page first');
  const current = (await content({ type: 'snapshot' })).snapshot;
  if (JSON.stringify(current) !== JSON.stringify(snapshot)) { snapshot = undefined; $('preview').textContent = 'The page changed. Inspect and review it again.'; throw new Error('The page changed since your review'); }
}
action('start', async () => {
  await ensureReviewedPage();
  if (!$('task').value.trim()) throw new Error('Enter a task first');
  await connect();
  state = await api('/api/tasks', { task: $('task').value.trim(), snapshot });
  await save(); if (currentStep()) $('status').textContent = `Guidance: ${state.status}. You perform the website actions.`;
});
action('continue', async () => {
  await ensureReviewedPage();
  const type = state.status === 'clarifying' ? 'clarification-answered' : snapshot.pageId !== state.pageId ? 'navigation-observed' : 'user-confirmed';
  const event = { eventId: crypto.randomUUID(), stepId: state.stepId, pageId: state.pageId, revision: state.revision, type, snapshot };
  if (type === 'clarification-answered') { event.answer = $('answer').value.trim(); if (!event.answer) throw new Error('Enter your clarification first'); }
  state = await api(`/api/tasks/${state.runId}/events`, event);
  $('answer').value = ''; await save(); if (currentStep()) $('status').textContent = `Guidance: ${state.status}.`;
});
action('highlight', async () => { await content({ type: 'highlight', pageId: state.pageId, revision: state.revision, targetId: state.result.targetId }); $('status').textContent = 'Target outlined on the original page. Nothing was clicked.'; });
action('restore', async () => { await content({ type: 'restore' }); $('status').textContent = 'Highlight removed.'; });
action('pause', async () => {
  state = await api(`/api/tasks/${state.runId}/${state.status === 'paused' ? 'resume' : 'pause'}`, {});
  await save(); await content({ type: 'restore' }); $('status').textContent = state.status;
});
action('reset', async () => {
  state = undefined; snapshot = undefined; $('preview').textContent = 'No snapshot yet.'; $('capture').textContent = 'Inspect the page for your new task.';
  await chrome.storage.session.remove(key()); render(); await content({ type: 'restore' }); $('status').textContent = 'Ready for a new task.';
});
(async () => {
  $('origin').textContent = `Backend setting: ALLOWED_EXTENSION_ORIGIN=chrome-extension://${chrome.runtime.id}`;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); tabId = tab?.id;
  const stored = await chrome.storage.session.get(['localToken', key()]);
  $('token').value = stored.localToken || ''; state = stored[key()]?.state; $('task').value = stored[key()]?.task || '';
  render();
  if (state) $('status').textContent = 'Previous step restored. Inspect this page before continuing or highlighting.';
})().catch(error => { $('status').textContent = error.message; });

setInterval(async () => {
  if (busy || !state || !snapshot) return;
  try {
    const current = (await chrome.tabs.sendMessage(tabId, { type: 'snapshot' })).snapshot;
    if (!current || current.pageId !== snapshot.pageId || current.revision !== snapshot.revision) { snapshot = undefined; render(); $('status').textContent = 'The page changed. Inspect it again before continuing.'; }
  } catch { snapshot = undefined; render(); $('status').textContent = 'The page changed or is unavailable. Inspect it again.'; }
}, 800);
