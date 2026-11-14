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

  /* TEMP DEMO: DELETE THIS WELCOME MESSAGE DEMO LATER. */
  const websiteName = document.title.trim() || location.hostname;
  const welcome = document.createElement("div");
  welcome.textContent = `Welcome to ${websiteName}`;
  welcome.style.cssText = [
    "position:absolute",
    "right:0",
    "bottom:calc(100% + 8px)",
    "width:max-content",
    "max-width:260px",
    "box-sizing:border-box",
    "padding:10px 14px",
    "border:2px solid #41403e",
    "border-radius:3px 7px 4px 6px",
    "background:#fffdf5",
    "color:#41403e",
    "font:600 15px/1.4 'Comic Sans MS','Segoe Print',cursive",
    "box-shadow:4px 4px 0 rgba(65,64,62,.28)",
    "transform:rotate(-1deg)",
    "overflow-wrap:anywhere",
    "pointer-events:none"
  ].join(";");
  root.appendChild(welcome);
  window.setTimeout(() => welcome.remove(), 5000);
  /* END TEMP DEMO: DELETE THIS WELCOME MESSAGE DEMO LATER. */

  (document.body || document.documentElement).appendChild(root);

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("exode-mascot.js");
  script.dataset.base = chrome.runtime.getURL("files");
  script.defer = true;
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
})();
