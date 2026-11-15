(() => {
  if (globalThis.__accessPatchLive) return;
  globalThis.__accessPatchLive = true;
  let pageId = crypto.randomUUID(), revision = 1, lastURL = location.href, signature = '';
  let ids = new WeakMap(), counter = 0, targets = new Map(), highlighted, timer;
  const forbidden = '[data-apc-ui],#accesspatch-guide,#accesspatch-companion-root,#exode-mascot-extension-root,input,textarea,select,option,script,style,[role="textbox"],[contenteditable]:not([contenteditable="false"])';
  const visible = el => !el.closest('[hidden],[aria-hidden="true"],[inert]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
  let privateTokens=[];
  const clean = (value, limit = 160) => {let output=String(value);for(const token of privateTokens)output=output.split(token).join('[private answer]');return output.replace(/\s+/g, ' ').trim().slice(0, limit);};
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
    const fieldLike = el.matches('input:not([type="submit"]):not([type="button"]):not([type="reset"]),select,textarea,[role="textbox"]');
    const buttonLabel=el.matches('input[type="submit"],input[type="button"],input[type="reset"]')?el.getAttribute('value'):'';
    return clean(labelled || el.getAttribute('aria-label') || associated || buttonLabel || (fieldLike ? '' : safeText(el)));
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
  globalThis.__apHighlightedElement=()=>highlighted?.node;
  function snapshot(){return globalThis.__apSimpleProfile?.withOriginalView?globalThis.__apSimpleProfile.withOriginalView(readSnapshot):readSnapshot();}
  function readSnapshot() {
    if (!/^https?:$/.test(location.protocol)) throw new Error('Only ordinary HTTP/HTTPS pages are supported.');
    if (location.href !== lastURL) { restore(); pageId = crypto.randomUUID(); revision = 1; signature = ''; ids = new WeakMap(); counter = 0; lastURL = location.href; }
    privateTokens=Array.from(document.querySelectorAll('input:not([type=submit]):not([type=button]):not([type=reset]):not([type=checkbox]):not([type=radio]),textarea')).map(el=>el.value).filter(value=>value&&value.length>=3).sort((a,b)=>b.length-a.length);
    const elements = [], instructions = [];
    targets = new Map();
    const candidates = Array.from(document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],[role="link"],[role="textbox"]')).sort((a,b)=>Number(!!b.closest('main,form,[role="main"]'))-Number(!!a.closest('main,form,[role="main"]')));
    for (const el of candidates) {
      if (elements.length >= 100) break;
      if (el.closest('[data-apc-ui],#accesspatch-guide,#accesspatch-companion-root,#exode-mascot-extension-root') || !visible(el) || el.closest('[contenteditable]:not([contenteditable="false"])') || el.matches(':disabled,[aria-disabled="true"],input[type="password"],input[type="hidden"]')) continue;
      const name = label(el); if (!name) continue;
      if (!ids.has(el)) ids.set(el, `ap-${++counter}`);
      const id = ids.get(el);
      const kind = el.matches('a,[role="link"]') ? 'link' : el.matches('button,input[type="submit"],input[type="button"],[role="button"]') ? 'button' : 'field';
      const role = el.getAttribute('role') || (kind === 'field' ? (el.tagName === 'SELECT' ? 'combobox' : el.type==='checkbox'?'checkbox':el.type==='radio'?'radio':'textbox') : kind);
      const field=kind==='field';const groupLabel=field?safeText(el.closest('fieldset')?.querySelector(':scope > legend')):'';
      const required=!!el.required||el.getAttribute('aria-required')==='true';
      const constraints={};if(field){for(const key of ['min','max'])if(el.getAttribute(key))constraints[key]=clean(el.getAttribute(key),80);for(const key of ['minLength','maxLength'])if(el[key]>=0)constraints[key]=el[key];}
      const invalid=el.getAttribute('aria-invalid')==='true';
      const errorIds=(el.getAttribute('aria-errormessage')||'').split(/\s+/).filter(Boolean).slice(0,3);
      const errors=invalid?['The page reports a validation error for this field. Review its original message.']:[];
      elements.push({ id, role: clean(role), name, kind, protected: field || required,...(field?{required,inputType:el.tagName==='SELECT'?'select':el.tagName==='TEXTAREA'?'textarea':el.getAttribute('type')||'text',...(groupLabel?{groupLabel}:{}),...(Object.keys(constraints).length?{constraints}:{}),validation:{invalid,messages:errors}}:{}) });
      targets.set(id, el);
      const help = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).slice(0, 2).map(id => safeText(document.getElementById(id), 250)).filter(Boolean).join(' ').slice(0, 250);
      const answered=el.matches('input[type=checkbox],input[type=radio]')?el.checked:el.matches('[role="textbox"]')?!!el.textContent.trim():!!el.value;
      if (help&&!answered&&!invalid) instructions.push({ elementId: id, text: help });
    }
    const data = { pageId, url: `${location.origin}/`, title: clean(document.title) || 'Untitled page', headings: Array.from(document.querySelectorAll('h1,h2,h3')).filter(visible).map(el => safeText(el)).filter(Boolean).slice(0, 8), elements, instructions };
    // Destination and control semantics participate locally in invalidation, never in outbound context.
    const semantics = Array.from(targets.values()).map(el => [el.getAttribute('href'), el.getAttribute('type'), el.getAttribute('formaction'),el.closest('form')?.getAttribute('action'),el.closest('form')?.getAttribute('method')]);
    data.structureFingerprint=AccessPatchFingerprint.hash(JSON.stringify(semantics));
    const nextSignature = JSON.stringify([data, semantics]);
    if (signature && signature !== nextSignature) { revision++; restore(); }
    signature = nextSignature;
    return { ...data, revision };
  }
  function request(message) {
    let output; const respond = result => { output = result; };
    try {
      if (message.type === 'snapshot') respond({ ok: true, snapshot: snapshot() });
      else if (message.type === 'reading-context') {
        const page=snapshot();
        // Reading excerpts can echo answers outside a form. Redact even short
        // values and selected option labels before exposing a review draft.
        const answers=[...document.querySelectorAll('input,textarea,select')].flatMap(el=>{
          if(el.matches('input[type=button],input[type=submit],input[type=reset]'))return [];
          if(el.matches('input[type=checkbox],input[type=radio]')&&!el.checked)return [];
          return el.matches('select')?[el.value,...Array.from(el.selectedOptions,option=>option.textContent)]:[el.value];
        }).filter(Boolean).sort((a,b)=>b.length-a.length);
        privateTokens=[...new Set([...privateTokens,...answers])];
        const paragraphs=[...document.querySelectorAll('main p,article p,[role="main"] p')].filter(el=>!el.closest('form,[role="alert"],[aria-live]')).map(el=>safeText(el,600)).filter(text=>text.length>40).slice(0,2);
        const text=(paragraphs.length?paragraphs.join('\n\n'):clean(page.instructions.map(item=>item.text).join('\n'),1400)).slice(0,1400);
        respond({ok:true,text,stamp:page.pageId+':'+page.revision+':'+AccessPatchFingerprint.hash(text)});
      }
      else if (message.type === 'restore') { restore(); respond({ ok: true }); }
      else if (message.type === 'target') {
        const current = snapshot();
        if (message.pageId !== current.pageId || message.revision !== current.revision) throw new Error('The page changed. Review it again.');
        const node = targets.get(message.targetId);
        if (!node?.isConnected || !visible(node)) throw new Error('Target is unavailable.');
        const rect = node.getBoundingClientRect();
        respond({ ok: true, bounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } });
      }
      else if (message.type === 'highlight') {
        const current = snapshot();
        if (message.pageId !== current.pageId || message.revision !== current.revision) throw new Error('The page changed. Inspect it again before highlighting.');
        const node = targets.get(message.targetId); if (!node?.isConnected) throw new Error('Target no longer exists. Inspect the page again.');
        restore();
        if (message.reveal) {
          const rect = node.getBoundingClientRect();
          if (rect.top < 0 || rect.bottom > innerHeight || rect.left < 0 || rect.right > innerWidth) node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        }
        const before = {}; for (const property of ['outline', 'outline-offset']) before[property] = { value: node.style.getPropertyValue(property), priority: node.style.getPropertyPriority(property) };
        node.style.setProperty('outline', '3px solid #2457d6', 'important'); node.style.setProperty('outline-offset', '3px', 'important');
        highlighted = { node, before, applied: { outline: node.style.getPropertyValue('outline'), 'outline-offset': node.style.getPropertyValue('outline-offset') } };
        timer = setInterval(() => { if (!node.isConnected) restore(); else snapshot(); }, 600);
        respond({ ok: true });
      } else respond({ ok: false, error: 'Unknown operation' });
    } catch (error) { respond({ ok: false, error: error.message }); }
    return output;
  }
  globalThis.__apMapper = request;
  chrome.runtime.onMessage.addListener((message, _sender, respond) => { if (['snapshot','highlight','restore','target'].includes(message.type)) respond(request(message)); });
})();
