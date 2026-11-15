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

  function setMascotPosition(left, top) {
    const maxLeft = Math.max(0, window.innerWidth - root.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - root.offsetHeight);
    root.style.left = `${Math.max(0, Math.min(maxLeft, left))}px`;
    root.style.top = `${Math.max(0, Math.min(maxTop, top))}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
  }

  chrome.storage.local.get("mascotPosition").then(({ mascotPosition }) => {
    if (!mascotPosition || !Number.isFinite(mascotPosition.x) || !Number.isFinite(mascotPosition.y)) return;
    setMascotPosition(mascotPosition.x * window.innerWidth, mascotPosition.y * window.innerHeight);
  });

  const mascot = document.createElement("exode-mascot");
  mascot.setAttribute("mascot", "ip-2016");
  mascot.setAttribute("click", "none");
  mascot.setAttribute("moments", "off");
  mascot.style.cssText = "display:block;width:100%;height:100%;pointer-events:auto";
  mascot.style.cursor = "grab";
  mascot.style.touchAction = "none";
  root.appendChild(mascot);

  let drag;
  let dizzyTimer;
  let suppressNextClick = false;
  let isDragging = false;
  let animationReady = false;
  const triggerDizzy = () => {
    if (!animationReady) {
      console.info("[Exode Drag] Dizzy trigger requested; animation engine is not ready yet.");
      return;
    }
    try {
      mascot.dispatchEvent(new CustomEvent("exode-extension-play", { detail: "dizzy" }));
      console.info("[Exode Drag] Dispatched dizzy expression to the ExodeUI runtime.", { dragging: isDragging });
    } catch (error) {
      console.error("[Exode Drag] Could not dispatch the dizzy expression.", error);
    }
  };
  mascot.addEventListener("ready", () => {
    animationReady = true;
    console.info("[Exode Drag] Mascot emitted its ready event.");
    if (isDragging) triggerDizzy();
  });
  mascot.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = root.getBoundingClientRect();
    drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, moved: false };
    console.info("[Exode Drag] Pointer down on mascot.", { pointerId: event.pointerId, pointerType: event.pointerType });
    mascot.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  mascot.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      isDragging = true;
      console.info("[Exode Drag] Drag started.");
      mascot.style.cursor = "grabbing";
      mascot.setAttribute("follow", "false");
      triggerDizzy();
      dizzyTimer = window.setInterval(triggerDizzy, 2700);
    }
    setMascotPosition(drag.left + dx, drag.top + dy);
  });
  const finishDrag = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    console.info("[Exode Drag] Drag ended.", { dragged: drag.moved, eventType: event.type });
    if (drag.moved) {
      const left = root.getBoundingClientRect().left;
      const top = root.getBoundingClientRect().top;
      chrome.storage.local.set({ mascotPosition: { x: left / window.innerWidth, y: top / window.innerHeight } });
      suppressNextClick = true;
      window.setTimeout(() => { suppressNextClick = false; }, 0);
    }
    drag = undefined;
    isDragging = false;
    window.clearInterval(dizzyTimer);
    dizzyTimer = undefined;
    mascot.style.cursor = "grab";
    mascot.removeAttribute("follow");
  };
  mascot.addEventListener("pointerup", finishDrag);
  mascot.addEventListener("pointercancel", finishDrag);

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

  let unlockedAudioContext;
  function showMascotMessage(message, { durationMs = 5000, userGesture = false } = {}) {
    const bubble = document.createElement("div");
    bubble.textContent = String(message);
    bubble.setAttribute("role", "status");
    bubble.setAttribute("aria-live", "polite");
    bubble.tabIndex = 0;
    bubble.title = "Select the message to hear it aloud";
    Object.assign(bubble.style, mascotMessageStyle);
    root.appendChild(bubble);

    let audio;
    let decodedAudio;
    if (userGesture && window.AudioContext) {
      try {
        unlockedAudioContext ??= new AudioContext();
        unlockedAudioContext.resume().then(() => {
          console.info("[Exode Voice] Audio context unlocked by mascot click.");
        }).catch(error => {
          console.warn("[Exode Voice] Could not unlock audio context.", error);
        });
      } catch (error) {
        console.warn("[Exode Voice] Audio context unavailable; will try HTML audio playback.", error);
      }
    };

    const playAudio = (reason = "user action") => {
      if (unlockedAudioContext && decodedAudio) {
        const source = unlockedAudioContext.createBufferSource();
        source.buffer = decodedAudio;
        source.connect(unlockedAudioContext.destination);
        source.start();
        console.info(`[Exode Voice] Playback started (${reason}) via unlocked audio context.`);
        return;
      }
      if (!audio) {
        console.info("[Exode Voice] Play requested before audio was ready.");
        return;
      }
      audio.play().then(() => {
        console.info(`[Exode Voice] Playback started (${reason}).`);
      }).catch(error => {
        console.warn(`[Exode Voice] Playback (${reason}) failed.`, {
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
        if (userGesture && unlockedAudioContext) {
          const binary = atob(result.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          unlockedAudioContext.decodeAudioData(bytes.buffer).then(buffer => {
            decodedAudio = buffer;
            console.info("[Exode Voice] Audio decoded in the unlocked context.");
            playAudio("mascot click");
          }).catch(error => {
            console.error("[Exode Voice] Could not decode audio in the unlocked context.", error);
          });
          return;
        }
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

  /* TEMP SAMPLE MESSAGE TRIGGER: DELETE THIS DEMO HANDLER LATER; KEEP THE HELPER AND STYLE. */
  mascot.addEventListener("click", () => {
    if (suppressNextClick) return;
    showMascotMessage("What's up, what can I do for you?", { userGesture: true });
  });
  /* END TEMP SAMPLE MESSAGE TRIGGER. */

  (document.body || document.documentElement).appendChild(root);

  const script = document.createElement("script");
  script.src = `${chrome.runtime.getURL("exode-mascot.js")}?v=${chrome.runtime.getManifest().version}`;
  script.dataset.base = chrome.runtime.getURL("files");
  script.defer = true;
  script.onload = () => script.remove();
  script.onerror = () => {
    console.error("[Exode Mascot] Runtime script failed to load.", { url: script.src });
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
})();
