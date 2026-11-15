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
    maxWidth: "280px",
    boxSizing: "border-box",
    padding: "14px 22px",
    border: "3px solid #41403e",
    // PaperCSS's default border-style mixin uses asymmetric elliptical corners.
    borderTopLeftRadius: "255px 15px",
    borderTopRightRadius: "15px 225px",
    borderBottomRightRadius: "225px 15px",
    borderBottomLeftRadius: "15px 255px",
    background: "#ffffff",
    color: "#41403e",
    font: "400 17px/1.5 'Sniglet',system-ui,sans-serif",
    boxShadow: "10px 14px 22px rgba(65,64,62,.16)",
    overflowWrap: "anywhere",
    pointerEvents: "auto",
    cursor: "pointer"
  };

  function showMascotMessage(message, { durationMs = 5000 } = {}) {
    const bubble = document.createElement("div");
    bubble.textContent = String(message);
    bubble.setAttribute("role", "status");
    bubble.setAttribute("aria-live", "polite");
    bubble.tabIndex = 0;
    bubble.title = "Select the message to hear it aloud";
    Object.assign(bubble.style, mascotMessageStyle);
    root.appendChild(bubble);

    let audio;
    const playAudio = () => {
      if (!audio) {
        console.info("[Exode Voice] Play requested before audio was ready.");
        return;
      }
      audio.play().then(() => {
        console.info("[Exode Voice] Playback started from user action.");
      }).catch(error => {
        console.warn("[Exode Voice] Playback from user action failed.", {
          name: error.name,
          message: error.message
        });
      });
    };
    bubble.addEventListener("click", playAudio);
    bubble.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playAudio();
      }
    });
    console.info("[Exode Voice] Requesting speech from the extension service worker.");
    chrome.runtime.sendMessage({ type: "speak-mascot-message", text: bubble.textContent })
      .then(result => {
        if (result?.skipped) {
          console.info("[Exode Voice] No audio requested because voice is disabled.");
          return;
        }
        if (result?.error) {
          bubble.title = `Voice unavailable: ${result.error}`;
          console.warn("[Exode Voice] Speech request failed.", result.error);
          return;
        }
        if (!result?.audioBase64) {
          console.warn("[Exode Voice] Service worker returned no audio data.");
          return;
        }
        if (!bubble.isConnected) console.info("[Exode Voice] Audio arrived after the message was dismissed; attempting playback anyway.");
        audio = new Audio(`data:${result.contentType};base64,${result.audioBase64}`);
        audio.addEventListener("canplay", () => console.info("[Exode Voice] Audio is ready to play."), { once: true });
        audio.addEventListener("ended", () => console.info("[Exode Voice] Playback finished."), { once: true });
        audio.addEventListener("error", () => {
          console.error("[Exode Voice] Browser could not decode the returned audio.", {
            mediaErrorCode: audio.error?.code,
            mediaErrorMessage: audio.error?.message
          });
          bubble.title = "Audio could not be decoded. See the page console for details.";
        }, { once: true });
        audio.play().then(() => {
          console.info("[Exode Voice] Automatic playback started.");
        }).catch(error => {
          bubble.title = "Automatic playback was blocked. Select the message to play it aloud.";
          console.warn("[Exode Voice] Automatic playback failed.", {
            name: error.name,
            message: error.message
          });
        });
      })
      .catch(error => {
        bubble.title = "Voice request failed. See the page console for details.";
        console.error("[Exode Voice] Could not contact the extension service worker.", error);
      });

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
