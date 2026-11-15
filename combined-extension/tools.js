(function () {
  if (window.top !== window.self || globalThis.__apMountTools) return;

  const state = { appearance: null, simplified: false, matches: [], current: -1, task: "" };
  const protectedWords = /error|invalid|required|deadline|due date|cost|fee|consent|privacy|security|official|help|cancel|back|return|recover/i;
  const groups = new WeakMap();
  let nextGroupId = 1;

  function make(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function visible(element) {
    if (!(element instanceof Element) || element.closest("#accesspatch-companion-root,#accesspatch-guide")) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function labelFor(element) {
    if (element.labels?.length) return element.labels[0].textContent.trim();
    if (element.getAttribute("aria-label")) return element.getAttribute("aria-label").trim();
    if (element.getAttribute("aria-labelledby")) {
      return element.getAttribute("aria-labelledby").split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
    }
    return (element.textContent || element.alt || "").replace(/\s+/g, " ").trim();
  }

  function searchables() {
    return [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,a,button,input,select,textarea,label,section,article")]
      .filter(visible)
      .map((element) => ({ element, text: labelFor(element).slice(0, 240), group: groupFor(element), priority: resultPriority(element) }))
      .filter((item) => item.text);
  }

  function groupFor(element) {
    const container = element.closest("section,article");
    const anchor = container?.querySelector("h1,h2,h3,h4,h5,h6") || container || element;
    if (!groups.has(anchor)) groups.set(anchor, `group-${nextGroupId++}`);
    return groups.get(anchor);
  }

  function resultPriority(element) {
    if (/^H[1-6]$/.test(element.tagName)) return 4;
    if (element.matches("a,button,input,select,textarea")) return 3;
    if (element.matches("label")) return 2;
    return 1;
  }

  function terms(value) {
    return value.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
  }

  function search(value) {
    clearHighlights();
    state.task = value.trim();
    const words = terms(state.task);
    if (!words.length) return [];
    const grouped = new Map();
    for (const item of searchables().map((candidate) => ({ ...candidate, score: words.reduce((score, word) => score + (itemTextIncludes(candidate.text, word) ? 2 : 0), 0) })).filter((candidate) => candidate.score > 0)) {
      const current = grouped.get(item.group);
      if (!current || item.score > current.score || (item.score === current.score && item.priority > current.priority)) grouped.set(item.group, item);
    }
    const ranked = [...grouped.values()].sort((left, right) => right.score - left.score || right.priority - left.priority);
    state.matches = ranked.map((item) => item.element);
    state.matches.forEach((element) => element.classList.add("apc-hit"));
    state.current = state.matches.length ? 0 : -1;
    state.matches[0]?.classList.add("apc-current");
    return ranked;
  }

  function itemTextIncludes(text, word) {
    return text.toLowerCase().includes(word);
  }

  function clearHighlights() {
    document.querySelectorAll(".apc-hit").forEach((element) => element.classList.remove("apc-hit", "apc-current"));
    state.matches = []; state.current = -1;
  }

  function importantImage(image) {
    if (!(image instanceof HTMLImageElement) || image.closest("#accesspatch-companion-root")) return false;
    if (image.closest("header,nav,footer,aside")) return false;
    const rect = image.getBoundingClientRect();
    return Boolean(image.alt?.trim() || image.closest("figure")?.querySelector("figcaption")?.textContent.trim() || rect.width >= 160 || rect.height >= 120 || image.naturalWidth >= 160 || image.naturalHeight >= 120);
  }

  function describeImages() {
    document.querySelectorAll(".apc-image-note").forEach((note) => note.remove());
    let count = 0;
    for (const image of document.images) {
      if (!importantImage(image)) continue;
      const caption = image.closest("figure")?.querySelector("figcaption")?.textContent.trim();
      const description = image.alt?.trim() || caption || "No text description is available for this important photo.";
      const inFigure = image.closest("figure");
      const hasCaption = Boolean(inFigure?.querySelector("figcaption"));
      const note = make(inFigure && !hasCaption ? "figcaption" : "p", `Image description: ${description}`, "apc-image-note");
      note.setAttribute("role", "note");
      if (inFigure) {
        inFigure.append(note);
      } else {
        const imageLink = image.closest("a");
        (imageLink || image).insertAdjacentElement("afterend", note);
      }
      count += 1;
    }
    return count;
  }

  function clearPresentationMarkers() {
    document.documentElement.classList.remove("apc-simplify", "apc-easy-read", "apc-low-vision");
    document.querySelectorAll("[data-apc-unrelated],[data-apc-secondary],[data-apc-low-surface]").forEach((element) => {
      element.removeAttribute("data-apc-unrelated");
      element.removeAttribute("data-apc-secondary");
      element.removeAttribute("data-apc-low-surface");
    });
  }

  function isProtected(element) {
    return protectedWords.test(element.textContent || "") || Boolean(element.querySelector("input,select,textarea,button,[contenteditable='true']"));
  }

  function applySimplification() {
    const chrome = document.querySelectorAll("header nav, footer, aside, [role='navigation'], [role='complementary'], [role='contentinfo'], [class*='breadcrumb'], [class*='social'], [class*='share'], [class*='newsletter'], [class*='cookie'], [class*='sidebar'], [id*='breadcrumb'], [id*='social'], [id*='share'], [id*='newsletter'], [id*='cookie'], [id*='sidebar']");
    chrome.forEach((element) => {
      if (visible(element) && !isProtected(element) && !element.querySelector(".apc-hit")) element.setAttribute("data-apc-secondary", "true");
    });
    const words = terms(state.task);
    if (!words.length) return;
    document.querySelectorAll("main section, main article, body > section").forEach((section) => {
      if (!visible(section) || isProtected(section)) return;
      const related = words.some((word) => itemTextIncludes(section.textContent, word)) || Boolean(section.querySelector(".apc-hit"));
      if (!related) section.setAttribute("data-apc-unrelated", "true");
    });
  }

  function isLightSurface(element) {
    if (!(element instanceof HTMLElement) || element.closest("#accesspatch-companion-root,#accesspatch-guide") || element.matches("img,svg,canvas,video,iframe")) return false;
    const color = getComputedStyle(element).backgroundColor.match(/rgba?\(([^)]+)\)/i);
    if (!color) return false;
    const channels = color[1].split(",").map(Number);
    if (channels.length < 3 || (channels[3] !== undefined && channels[3] < 0.15)) return false;
    const [red, green, blue] = channels;
    return (red * 0.2126 + green * 0.7152 + blue * 0.0722) > 150;
  }

  function applyLowVisionSurfaces() {
    [...document.body.querySelectorAll("*")].slice(0, 1200).forEach((element) => {
      if (isLightSurface(element)) element.setAttribute("data-apc-low-surface", "true");
    });
  }

  function refreshPresentation() {
    clearPresentationMarkers();
    if (state.simplified) {
      document.documentElement.classList.add("apc-simplify");
      applySimplification();
    }
    if (state.appearance) document.documentElement.classList.add(`apc-${state.appearance}`);
    if (state.appearance === "low-vision") applyLowVisionSurfaces();
  }

  function renderResults(list, results, status) {
    list.replaceChildren();
    results.slice(0, 8).forEach(({ element, text }, index) => {
      const item = make("li");
      const focus = make("button", `Show: ${text.slice(0, 90)}`);
      focus.addEventListener("click", () => {
        state.current = index;
        state.matches.forEach((candidate) => candidate.classList.remove("apc-current"));
        element.classList.add("apc-current");
        element.scrollIntoView({ block: "center", behavior: "smooth" });
        status.textContent = "The matching page item is highlighted. Choose it yourself when ready.";
      });
      item.append(focus);
      list.append(item);
    });
  }

  function buildPanel(container) {
    const root = make("div"); root.id = "accesspatch-companion-root"; root.dataset.apcUi = "true";
    const panel = make("aside", null, "apc-panel"); panel.setAttribute("aria-label", "AccessPatch companion tools");
    const header = make("div", null, "apc-panel-header");
    const title = make("h2", "AccessPatch tools");
    const collapse = make("button", "−", "apc-collapse");
    collapse.type = "button"; collapse.setAttribute("aria-label", "Collapse AccessPatch tools"); collapse.setAttribute("aria-expanded", "true");
    header.append(title, collapse);
    panel.append(header, make("p", "Find and adjust this page while keeping every website action in your hands."));
    const label = make("label", "Search the page");
    const input = document.createElement("input"); input.placeholder = "Example: tax, deadline, required documents"; label.append(input); panel.append(label);
    const status = make("p", "", "apc-status"); status.setAttribute("role", "status"); panel.append(status);
    const results = make("ol", null, "apc-results"); panel.append(results);
    const find = make("button", "Highlight matches", "primary");
    const simplify = make("button", "Simplify view");
    const easy = make("button", "Easy Read");
    const low = make("button", "Low Vision");
    const images = make("button", "Describe important photos");
    const restore = make("button", "Restore page");
    const hide = make("button", "Hide tools");
    const modeButtons = { simplify, easy, low };
    Object.values(modeButtons).forEach((button) => { button.type = "button"; button.setAttribute("aria-pressed", "false"); });
    panel.append(find, simplify, easy, low, images, restore, hide); root.append(panel); container.append(root);

    let dragStart = null;
    header.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      const rect = panel.getBoundingClientRect();
      dragStart = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      panel.style.left = `${rect.left}px`; panel.style.top = `${rect.top}px`;
      panel.style.right = "auto"; panel.style.bottom = "auto";
      header.setPointerCapture(event.pointerId);
    });
    header.addEventListener("pointermove", (event) => {
      if (!dragStart) return;
      const rect = panel.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - rect.width - 8, dragStart.left + event.clientX - dragStart.x));
      const top = Math.max(8, Math.min(window.innerHeight - rect.height - 8, dragStart.top + event.clientY - dragStart.y));
      panel.style.left = `${left}px`; panel.style.top = `${top}px`;
    });
    header.addEventListener("pointerup", () => { dragStart = null; });
    header.addEventListener("pointercancel", () => { dragStart = null; });
    collapse.addEventListener("click", () => {
      const collapsed = panel.classList.toggle("apc-collapsed");
      collapse.textContent = collapsed ? "+" : "−";
      collapse.setAttribute("aria-label", collapsed ? "Expand AccessPatch tools" : "Collapse AccessPatch tools");
      collapse.setAttribute("aria-expanded", String(!collapsed));
    });

    function setModeButtons() {
      const activeModes = { simplify: state.simplified, easy: state.appearance === "easy-read", low: state.appearance === "low-vision" };
      Object.entries(modeButtons).forEach(([mode, button]) => {
        button.classList.toggle("apc-selected", activeModes[mode]);
        button.setAttribute("aria-pressed", String(activeModes[mode]));
      });
    }

    function toggleSimplify() {
      state.simplified = !state.simplified;
      refreshPresentation();
      setModeButtons();
      status.textContent = state.simplified ? "Simplified view applied. Main content stays visible while safe secondary content is hidden." : "Simplified view is off.";
    }

    function toggleAppearance(mode, statusText) {
      state.appearance = state.appearance === mode ? null : mode;
      refreshPresentation();
      setModeButtons();
      status.textContent = state.appearance ? statusText : "The visual mode is off. Original colors and text sizing are restored.";
    }

    find.addEventListener("click", () => {
      const ranked = search(input.value);
      renderResults(results, ranked, status);
      if (state.simplified) refreshPresentation();
      status.textContent = ranked.length ? `${ranked.length} matching page item(s) highlighted.` : "No matching heading, link, field, or section was found.";
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      find.click();
    });
    simplify.addEventListener("click", toggleSimplify);
    easy.addEventListener("click", () => { toggleAppearance("easy-read", "Easy Read applied: larger text and spacing without changing the page layout."); });
    low.addEventListener("click", () => { toggleAppearance("low-vision", "Low Vision applied: dark surfaces, high contrast, and clearer links."); });
    images.addEventListener("click", () => { const count = describeImages(); status.textContent = count ? `Added text descriptions for ${count} important image(s).` : "No important images with available descriptions were found."; });
    restore.addEventListener("click", () => { clearHighlights(); state.appearance = null; state.simplified = false; refreshPresentation(); setModeButtons(); document.querySelectorAll(".apc-image-note").forEach((note) => note.remove()); status.textContent = "The page has been restored."; });
    header.remove(); hide.remove();
    return root;
  }

  globalThis.__apMountTools = container => buildPanel(container);
})();
