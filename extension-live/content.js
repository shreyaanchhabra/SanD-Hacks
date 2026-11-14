(() => {
  if (globalThis.__accessPatchLive) return;
  globalThis.__accessPatchLive = true;
  let pageId = crypto.randomUUID(), revision = 1, lastURL = location.href, signature = '';
  let ids = new WeakMap(), counter = 0, targets = new Map(), highlighted, timer;
  const forbidden = 'input,textarea,select,option,script,style,[role="textbox"],[contenteditable]:not([contenteditable="false"])';
  const visible = el => !el.closest('[hidden],[aria-hidden="true"],[inert]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
  const clean = (value, limit = 160) => value.replace(/\s+/g, ' ').trim().slice(0, limit);
  function safeText(el, limit = 160) {
    if (!el || el.closest(forbidden) || !visible(el)) return '';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let value = '', node;
    while ((node = walker.nextNode()) && value.length < limit * 2) {
      const parent = node.parentElement;
      if (parent && !parent.closest(forbidden) && visible(parent)) value += ` ${node.textContent}`;
    }
    return clean(value, limit);
  }
  function label(el) {
    const labelled = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).slice(0, 3).map(id => safeText(document.getElementById(id))).join(' ');
    const associated = Array.from(el.labels || []).map(label => safeText(label)).join(' ');
    const fieldLike = el.matches('input,select,textarea,[role="textbox"]');
    return clean(labelled || el.getAttribute('aria-label') || associated || (fieldLike ? '' : safeText(el))); 
  }
  function restore() {
    clearInterval(timer);
    if (!highlighted) return;
    for (const [property, previous] of Object.entries(highlighted.before)) {
      if (highlighted.node.style.getPropertyValue(property) === highlighted.applied[property]) {
        if (previous.value) highlighted.node.style.setProperty(property, previous.value, previous.priority);
        else highlighted.node.style.removeProperty(property);
      }
    }
    highlighted = undefined;
  }
  function snapshot() {
    if (!/^https?:$/.test(location.protocol)) throw new Error('Only ordinary HTTP/HTTPS pages are supported.');
    if (location.href !== lastURL) { restore(); pageId = crypto.randomUUID(); revision = 1; signature = ''; ids = new WeakMap(); counter = 0; lastURL = location.href; }
    const elements = [], instructions = [];
    targets = new Map();
    const candidates = document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],[role="link"],[role="textbox"]');
    for (const el of candidates) {
      if (elements.length >= 50) break;
      if (!visible(el) || el.closest('[contenteditable]:not([contenteditable="false"])') || el.matches(':disabled,[aria-disabled="true"],input[type="password"],input[type="hidden"]')) continue;
      const name = label(el); if (!name) continue;
      if (!ids.has(el)) ids.set(el, `ap-${++counter}`);
      const id = ids.get(el);
      const kind = el.matches('a,[role="link"]') ? 'link' : el.matches('button,input[type="submit"],input[type="button"],[role="button"]') ? 'button' : 'field';
      const role = el.getAttribute('role') || (kind === 'field' ? (el.tagName === 'SELECT' ? 'combobox' : 'textbox') : kind);
      elements.push({ id, role: clean(role), name, kind, protected: kind === 'field' || !!el.required });
      targets.set(id, el);
      const help = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).slice(0, 2).map(id => safeText(document.getElementById(id), 250)).filter(Boolean).join(' ').slice(0, 250);
      if (help) instructions.push({ elementId: id, text: help });
    }
    const data = { pageId, url: `${location.origin}/`, title: clean(document.title) || 'Untitled page', headings: Array.from(document.querySelectorAll('h1,h2,h3')).filter(visible).map(el => safeText(el)).filter(Boolean).slice(0, 8), elements, instructions };
    // Destination and control semantics participate locally in invalidation, never in outbound context.
    const semantics = Array.from(targets.values()).map(el => [el.getAttribute('href'), el.getAttribute('type'), el.getAttribute('formaction')]);
    const nextSignature = JSON.stringify([data, semantics]);
    if (signature && signature !== nextSignature) { revision++; restore(); }
    signature = nextSignature;
    return { ...data, revision };
  }
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    try {
      if (message.type === 'snapshot') respond({ ok: true, snapshot: snapshot() });
      else if (message.type === 'restore') { restore(); respond({ ok: true }); }
      else if (message.type === 'highlight') {
        const current = snapshot();
        if (message.pageId !== current.pageId || message.revision !== current.revision) throw new Error('The page changed. Inspect it again before highlighting.');
        const node = targets.get(message.targetId); if (!node?.isConnected) throw new Error('Target no longer exists. Inspect the page again.');
        restore();
        const before = {}; for (const property of ['outline', 'outline-offset']) before[property] = { value: node.style.getPropertyValue(property), priority: node.style.getPropertyPriority(property) };
        node.style.setProperty('outline', '3px solid #2457d6', 'important'); node.style.setProperty('outline-offset', '3px', 'important');
        highlighted = { node, before, applied: { outline: node.style.getPropertyValue('outline'), 'outline-offset': node.style.getPropertyValue('outline-offset') } };
        timer = setInterval(() => { if (!node.isConnected) restore(); else snapshot(); }, 600);
        respond({ ok: true });
      } else respond({ ok: false, error: 'Unknown operation' });
    } catch (error) { respond({ ok: false, error: error.message }); }
  });
})();
