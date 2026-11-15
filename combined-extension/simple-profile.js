(() => {
  if (globalThis.__apSimpleProfile) return;
  // Declarative host-page patches. Never query inside shadow roots.
  const patches = {
    generic: ['header nav', 'footer', 'aside', '[role="banner"]', '[role="complementary"]',
      '#onetrust-banner-sdk', '#CybotCookiebotDialog', '.cookie-banner', '#cookie-banner',
      '.cookie-consent', '#cookie-consent', '[role="dialog"][aria-label*="cookie" i]',
      '[role="dialog"][aria-label*="consent" i]', '.newsletter-popup'],
    'usa.gov': ['header nav', 'footer', '.usa-banner', 'aside'],
    // Semantic fallbacks until the live India portal permits inspection.
    'india.gov.in': ['header nav', 'footer', 'aside', '[role="banner"]', '[role="complementary"]']
  };
  const owned = ':is([data-apc-ui],[data-ap-ui],[id^="accesspatch"],[id^="exode-"],[id^="gleam"],[id^="ap-"],[class^="ap-"],[class*=" ap-"],[class^="apc-"],[class*=" apc-"]):not(html):not(body)';
  const main = 'main,[role="main"],article';
  const token = 'simple-' + crypto.randomUUID();
  const attr = 'data-apc-simple-hidden';
  const marked = new Map();
  let active = false, hadClass = false, classWasAbsent = false, observer, style;
  const selectors = () => [...new Set([...patches.generic, ...Object.entries(patches).filter(([site]) => location.hostname === site || location.hostname.endsWith('.' + site)).flatMap(([, list]) => list)])];
  function safe(node) {
    return node instanceof HTMLElement && node !== document.body && node !== document.documentElement &&
      !node.closest(owned) && !node.querySelector(owned) && !(globalThis.__apHighlightedElement?.() && node.contains(globalThis.__apHighlightedElement())) && !node.closest(main) && !node.querySelector(main) &&
      !node.matches('form,[role="alert"],[aria-live]') && !node.querySelector('[role="alert"],[aria-live="assertive"]');
  }
  const candidates = () => [...document.querySelectorAll(selectors().join(','))].filter(safe);
  function scan() {
    if (!active) return;
    for (const [node, original] of marked) if (!safe(node) || !node.matches(selectors().join(','))) {
      if (original === null) node.removeAttribute(attr); else node.setAttribute(attr, original);
      marked.delete(node);
    }
    for (const node of candidates()) if (!marked.has(node)) {marked.set(node, node.getAttribute(attr));node.setAttribute(attr, token);}
  }
  function apply() {
    if (active) return;
    active = true; hadClass = document.documentElement.classList.contains('ap-simple');classWasAbsent=!document.documentElement.hasAttribute('class');
    style = document.createElement('style');style.dataset.apcUi = 'true';
    // Exclusions also guard the interval before the mutation observer runs.
    style.textContent = `html.ap-simple [${attr}="${token}"]:not(${owned}):not(:is(${owned}) *):not(:has(${owned})):not(:is(${main})):not(:has(${main})){display:none!important}`;
    document.documentElement.append(style);document.documentElement.classList.add('ap-simple');scan();
    observer = new MutationObserver(scan);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','id','role','data-apc-ui','data-ap-ui']});
  }
  function restore() {
    if (!active) return;
    active = false;observer?.disconnect();style?.remove();
    for (const [node, original] of marked) if (node.getAttribute(attr) === token) {if (original === null) node.removeAttribute(attr); else node.setAttribute(attr, original);}
    marked.clear();if (!hadClass) document.documentElement.classList.remove('ap-simple');if(classWasAbsent&&!document.documentElement.className)document.documentElement.removeAttribute('class');
  }
  globalThis.__apSimpleProfile = {apply,restore,active:()=>active,withOriginalView(read){const disabled=style?.disabled;if(active&&style)style.disabled=true;try{return read();}finally{if(active&&style)style.disabled=disabled;}},count:()=>candidates().length,patches:Object.fromEntries(Object.entries(patches).map(([site,list])=>[site,list.map(selector=>({action:'hide',selector}))]))};
})();
