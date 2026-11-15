(() => {
  if (document.getElementById("exode-mascot-extension-root")) return;

  const root = document.createElement("div");
  root.id = "exode-mascot-extension-root";
  root.style.cssText = [
    "position:fixed",
    "right:10px",
    "bottom:10px",
    "z-index:2147483647",
    "width:160px",
    "height:160px",
    "pointer-events:none"
  ].join(";");

  const mascot = document.createElement("exode-mascot");
  mascot.setAttribute("mascot", "ip-2016");
  mascot.style.cssText = "display:block;width:100%;height:100%;pointer-events:auto";
  root.appendChild(mascot);

  // Reusable PaperCSS-inspired message style and display helper.
  const snigletStylesheet = document.createElement("link");
  snigletStylesheet.rel = "stylesheet";
  snigletStylesheet.href = "https://fonts.googleapis.com/css2?family=Sniglet&display=swap";
  document.head.appendChild(snigletStylesheet);

  const mascotMessageStyle = {
    position: "absolute",
    right: "0",
    bottom: "calc(100% + 8px)",
    width: "max-content",
    maxWidth: "260px",
    boxSizing: "border-box",
    padding: "10px 14px",
    border: "2px solid #41403e",
    borderRadius: "3px 7px 4px 6px",
    background: "#fffdf5",
    color: "#41403e",
    font: "400 17px/1.5 'Sniglet',system-ui,sans-serif",
    boxShadow: "4px 4px 0 rgba(65,64,62,.28)",
    transform: "rotate(-1deg)",
    overflowWrap: "anywhere",
    pointerEvents: "none"
  };

  function showMascotMessage(message, { durationMs = 5000 } = {}) {
    const bubble = document.createElement("div");
    bubble.textContent = String(message);
    bubble.setAttribute("role", "status");
    bubble.setAttribute("aria-live", "polite");
    Object.assign(bubble.style, mascotMessageStyle);
    root.appendChild(bubble);

    let timeoutId;
    const dismiss = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      bubble.remove();
    };
    if (durationMs > 0) timeoutId = window.setTimeout(dismiss, durationMs);
    return { element: bubble, dismiss };
  }

  /* TEMP SAMPLE MESSAGE: DELETE THIS DEMO CALL LATER; KEEP THE HELPER AND STYLE. */
  const websiteName = document.title.trim() || location.hostname;
  showMascotMessage(`Welcome to ${websiteName}`);
  /* END TEMP SAMPLE MESSAGE. */

  (document.body || document.documentElement).appendChild(root);

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("exode-mascot.js");
  script.dataset.base = chrome.runtime.getURL("files");
  script.defer = true;
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
})();
