(() => {
  if (document.getElementById("exode-mascot-extension-root")) return;

  const root = document.createElement("div");
  root.id = "exode-mascot-extension-root";
  root.style.cssText = [
    "position:fixed",
    "right:20px",
    "bottom:20px",
    "z-index:2147483647",
    "width:160px",
    "height:160px",
    "pointer-events:none"
  ].join(";");

  const mascot = document.createElement("exode-mascot");
  mascot.setAttribute("mascot", "ip-2016");
  mascot.style.cssText = "display:block;width:100%;height:100%;pointer-events:auto";
  root.appendChild(mascot);
  (document.body || document.documentElement).appendChild(root);

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("exode-mascot.js");
  script.dataset.base = chrome.runtime.getURL("files");
  script.defer = true;
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
})();
