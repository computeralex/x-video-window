"use strict";

const els = {
  toolbar: document.getElementById("toolbar"),
  form: document.getElementById("url-form"),
  input: document.getElementById("url-input"),
  paste: document.getElementById("paste-btn"),
  signin: document.getElementById("signin-btn"),
  back: document.getElementById("back-btn"),
  pin: document.getElementById("pin-btn"),
  fill: document.getElementById("fill-btn"),
  compact: document.getElementById("compact-btn"),
  helpBtn: document.getElementById("help-btn"),
  help: document.getElementById("help"),
  helpClose: document.getElementById("help-close"),
  empty: document.getElementById("empty"),
  player: document.getElementById("player"),
  toast: document.getElementById("toast"),
  winControls: document.getElementById("win-controls"),
};

const state = {
  alwaysOnTop: false,
  compact: true,
  helpOpen: false,
  toolbarHidden: false,
};

let toastTimer = 0;

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.add("hidden"), 2800);
}

function setPressed(button, on) {
  button.setAttribute("aria-pressed", on ? "true" : "false");
  button.classList.toggle("on", on);
}

function setHelpOpen(open) {
  state.helpOpen = open;
  els.help.classList.toggle("hidden", !open);
  document.body.classList.toggle("help-open", open);
}

function layoutPlayer() {
  const stage = document.querySelector(".stage");
  if (!stage || !els.player) return;
  const width = Math.max(1, Math.floor(stage.clientWidth));
  const height = Math.max(1, Math.floor(stage.clientHeight));
  els.player.style.width = `${width}px`;
  els.player.style.height = `${height}px`;
}

function showPlayer(url, addressBarValue) {
  els.empty.classList.add("hidden");
  els.player.classList.remove("hidden");
  layoutPlayer();
  if (addressBarValue != null) {
    els.input.value = addressBarValue;
  }
  if (els.player.getAttribute("src") !== url) {
    els.player.setAttribute("src", url);
  }
}

async function openFromText(text) {
  const result = await window.xvw.openUrl(text);
  if (!result.ok) {
    showToast(result.error || "Could not open that link.");
    return false;
  }
  showPlayer(result.loadUrl, result.loadUrl);
  return true;
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  openFromText(els.input.value);
});

els.paste.addEventListener("click", async () => {
  const result = await window.xvw.pasteAndOpen();
  if (!result.ok) {
    showToast(result.error || "Clipboard does not contain an X link.");
    return;
  }
  showPlayer(result.loadUrl, result.loadUrl);
});

els.signin.addEventListener("click", async () => {
  const result = await window.xvw.openSignIn();
  if (!result?.ok) {
    showToast(result?.error || "Could not open sign-in.");
  }
});

els.back.addEventListener("click", () => {
  if (typeof els.player.goBack === "function" && els.player.canGoBack && els.player.canGoBack()) {
    els.player.goBack();
  }
});

els.pin.addEventListener("click", async () => {
  const next = !(els.pin.getAttribute("aria-pressed") === "true");
  const applied = await window.xvw.setAlwaysOnTop(next);
  setPressed(els.pin, Boolean(applied));
});

els.fill.addEventListener("click", async () => {
  try {
    const result = await els.player.executeJavaScript(
      `window.__xvwFillVideo ? window.__xvwFillVideo() : (() => {
        const video = document.querySelector("video");
        if (!video) return { ok: false };
        const req = video.requestFullscreen || video.webkitRequestFullscreen;
        if (!req) return { ok: true, mode: "theater" };
        req.call(video);
        return { ok: true, mode: "fullscreen" };
      })()`
    );
    if (!result || !result.ok) {
      showToast(result?.error || "No video yet. Start playback, then click Fill.");
    }
  } catch {
    showToast("Could not fill the video.");
  }
});

els.compact.addEventListener("click", async () => {
  const next = !(els.compact.getAttribute("aria-pressed") === "true");
  await window.xvw.setCompact(next);
  setPressed(els.compact, next);
  try {
    await els.player.executeJavaScript(`window.__xvwSetCompact(${next ? "true" : "false"})`);
  } catch {
    // not loaded
  }
});

els.helpBtn.addEventListener("click", () => setHelpOpen(true));
els.helpClose.addEventListener("click", () => setHelpOpen(false));
els.help.addEventListener("click", (event) => {
  if (event.target === els.help) setHelpOpen(false);
});

els.winControls.addEventListener("click", (event) => {
  const action = event.target?.dataset?.win;
  if (action) window.xvw.windowControl(action);
});

document.addEventListener("keydown", (event) => {
  const meta = event.metaKey || event.ctrlKey;

  if (event.key === "Escape") {
    if (state.helpOpen) {
      setHelpOpen(false);
      event.preventDefault();
    } else if (state.toolbarHidden) {
      document.body.classList.remove("toolbar-hidden");
      state.toolbarHidden = false;
      event.preventDefault();
    }
  }

  if (event.key === "F11") {
    state.toolbarHidden = !state.toolbarHidden;
    document.body.classList.toggle("toolbar-hidden", state.toolbarHidden);
    event.preventDefault();
  }

  if (meta && event.key.toLowerCase() === "l") {
    els.input.focus();
    els.input.select();
    event.preventDefault();
  }

  if (event.key === "F1") {
    setHelpOpen(!state.helpOpen);
    event.preventDefault();
  }
});

async function injectFocus() {
  try {
    const url =
      typeof els.player.getURL === "function"
        ? els.player.getURL()
        : els.player.getAttribute("src");
    if (!url || url === "about:blank") return;
    if (await window.xvw.isAuthUrl(url)) return;
    const assets = await window.xvw.getFocusAssets();
    if (!assets) return;
    await els.player.insertCSS(assets.css);
    const compact = assets.compact !== false;
    await els.player.executeJavaScript(
      `${assets.js}\nwindow.__xvwSetCompact(${compact ? "true" : "false"});`
    );
  } catch (err) {
    console.error("xvw: focus inject failed", err);
  }
}

els.player.addEventListener("dom-ready", () => {
  layoutPlayer();
  injectFocus();
});

els.player.addEventListener("did-navigate", (event) => {
  if (event.url && event.url !== "about:blank") {
    els.input.value = event.url;
    window.xvw.rememberUrl(event.url);
  }
  injectFocus();
});

els.player.addEventListener("did-navigate-in-page", (event) => {
  if (event.url && event.url !== "about:blank") {
    els.input.value = event.url;
    window.xvw.rememberUrl(event.url);
  }
  injectFocus();
});

els.player.addEventListener("did-fail-load", (event) => {
  if (event.errorCode && event.errorCode !== -3) {
    showToast("That page failed to load. Check the URL and your network.");
  }
});

async function boot() {
  window.addEventListener("resize", layoutPlayer);
  const stage = document.querySelector(".stage");
  if (stage && typeof ResizeObserver === "function") {
    new ResizeObserver(() => layoutPlayer()).observe(stage);
  }
  layoutPlayer();

  document.body.classList.toggle("mac", window.xvw.platform === "darwin");
  if (window.xvw.platform !== "darwin") {
    els.winControls.hidden = false;
  }

  let initial = { alwaysOnTop: false, compact: true, lastUrl: "" };
  try {
    initial = await window.xvw.getState();
  } catch {
    // Main process not ready yet; keep defaults.
  }
  setPressed(els.pin, Boolean(initial.alwaysOnTop));
  setPressed(els.compact, initial.compact !== false);
  const restoreUrl = initial.lastUrl || "";
  if (restoreUrl && !(await window.xvw.isAuthUrl(restoreUrl))) {
    showPlayer(restoreUrl, restoreUrl);
  }

  window.xvw.onState((next) => {
    if (typeof next.alwaysOnTop === "boolean") setPressed(els.pin, next.alwaysOnTop);
    if (typeof next.compact === "boolean") setPressed(els.compact, next.compact);
  });

  window.xvw.onOpenLoadUrl((result) => {
    if (!result?.ok || !result.loadUrl) return;
    window.xvw.isAuthUrl(result.loadUrl).then((auth) => {
      if (!auth) showPlayer(result.loadUrl, result.loadUrl);
    });
  });

  window.xvw.onToggleHelp(() => setHelpOpen(!state.helpOpen));
  window.xvw.onToggleToolbar(() => {
    state.toolbarHidden = !state.toolbarHidden;
    document.body.classList.toggle("toolbar-hidden", state.toolbarHidden);
  });
  window.xvw.onFocusUrl(() => {
    els.input.focus();
    els.input.select();
  });
  window.xvw.onFillVideo(() => els.fill.click());
  window.xvw.onSignInComplete(() => {
    showToast("Signed in. Session saved on this computer.");
    try {
      if (typeof els.player.reload === "function") els.player.reload();
    } catch {
      // no page loaded yet
    }
  });
}

boot();
