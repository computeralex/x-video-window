"use strict";

const els = {
  toolbar: document.getElementById("toolbar"),
  edgeHot: document.getElementById("edge-hot"),
  form: document.getElementById("url-form"),
  input: document.getElementById("url-input"),
  openVideo: document.getElementById("open-video-btn"),
  openCancel: document.getElementById("open-cancel"),
  openOverlay: document.getElementById("open-overlay"),
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
  transport: document.getElementById("transport"),
  playBtn: document.getElementById("play-btn"),
  seek: document.getElementById("seek"),
  timeLabel: document.getElementById("time-label"),
  muteTransport: document.getElementById("mute-transport"),
  volume: document.getElementById("volume"),
  edgeHotBottom: document.getElementById("edge-hot-bottom"),
};

const state = {
  alwaysOnTop: false,
  compact: true,
  helpOpen: false,
  openPrompt: false,
  toolbarHidden: false,
  playing: false,
  chromePinned: false,
  fullscreen: false,
  media: {
    currentTime: 0,
    duration: 0,
    paused: true,
    muted: false,
    volume: 1,
    live: false,
    href: "",
  },
  seeking: false,
  restoredKey: "",
};

const CHROME_IDLE_MS = 1600;
let toastTimer = 0;
let chromeTimer = 0;

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

function setFullscreenUi(on) {
  state.fullscreen = Boolean(on);
  document.body.classList.toggle("fullscreen", state.fullscreen);
  setPressed(els.fill, state.fullscreen);
  els.fill.title = state.fullscreen ? "Exit fullscreen" : "Fullscreen";
  els.fill.setAttribute("aria-label", els.fill.title);
}

function setHelpOpen(open) {
  state.helpOpen = open;
  els.help.classList.toggle("hidden", !open);
  document.body.classList.toggle("help-open", open);
  if (open) document.body.classList.add("chrome-visible");
  else if (state.playing) bumpChrome();
}

function setOpenPrompt(open) {
  state.openPrompt = open;
  els.openOverlay.classList.toggle("hidden", !open);
  document.body.classList.toggle("open-prompt", open);
  if (open) {
    document.body.classList.add("chrome-visible");
    window.requestAnimationFrame(() => {
      els.input.focus();
      els.input.select();
    });
  } else if (state.playing) {
    bumpChrome();
  }
}

function layoutPlayer() {
  const stage = document.querySelector(".stage");
  if (!stage || !els.player) return;
  const width = Math.max(1, Math.floor(stage.clientWidth));
  const height = Math.max(1, Math.floor(stage.clientHeight));
  els.player.style.width = `${width}px`;
  els.player.style.height = `${height}px`;
}

function isPlaying() {
  return Boolean(els.player && !els.player.classList.contains("hidden"));
}

function formatTime(seconds) {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function updateTransport() {
  const media = state.media;
  const show = state.playing && Boolean(media.href);
  els.transport.classList.toggle("hidden", !show);
  els.transport.classList.toggle("live", Boolean(media.live));
  els.playBtn.textContent = media.paused ? "▶" : "❚❚";
  els.playBtn.title = media.paused ? "Play" : "Pause";
  els.playBtn.setAttribute("aria-label", els.playBtn.title);
  els.muteTransport.textContent = media.muted || media.volume === 0 ? "🔇" : "🔊";
  els.muteTransport.title = media.muted ? "Unmute" : "Mute";
  els.muteTransport.setAttribute("aria-label", els.muteTransport.title);
  if (!state.seeking) {
    const max = media.live ? 1 : Math.max(1, media.duration || 1);
    els.seek.max = "1000";
    els.seek.value = media.live ? "1000" : String(Math.round((media.currentTime / max) * 1000));
  }
  if (!document.activeElement || document.activeElement !== els.volume) {
    els.volume.value = String(Math.round((media.muted ? 0 : media.volume) * 100));
  }
  els.timeLabel.textContent = media.live
    ? "Live"
    : `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`;
}

function setPlayingUi() {
  state.playing = isPlaying();
  document.body.classList.toggle("playing", state.playing);
  if (!state.playing) {
    document.body.classList.add("chrome-visible");
    state.media = {
      currentTime: 0,
      duration: 0,
      paused: true,
      muted: false,
      volume: 1,
      live: false,
      href: "",
    };
    updateTransport();
    layoutPlayer();
    return;
  }
  bumpChrome();
  layoutPlayer();
  updateTransport();
}

function overlayBlocksChromeHide() {
  return state.helpOpen || state.openPrompt || document.activeElement === els.input;
}

function setChromeVisible(visible) {
  if (!state.playing || overlayBlocksChromeHide()) {
    document.body.classList.add("chrome-visible");
    return;
  }
  if (state.chromePinned && !visible) {
    document.body.classList.remove("chrome-visible");
    return;
  }
  document.body.classList.toggle("chrome-visible", visible);
}

function bumpChrome() {
  if (state.chromePinned && !overlayBlocksChromeHide()) {
    state.chromePinned = false;
  }
  setChromeVisible(true);
  window.clearTimeout(chromeTimer);
  chromeTimer = window.setTimeout(() => {
    if (!state.playing || overlayBlocksChromeHide()) return;
    setChromeVisible(false);
  }, CHROME_IDLE_MS);
}

function showPlayer(url) {
  els.empty.classList.add("hidden");
  els.player.classList.remove("hidden");
  if (url && url !== state.media.href) {
    state.restoredKey = "";
  }
  setPlayingUi();
  if (url && els.input) els.input.value = url;
  if (els.player.getAttribute("src") !== url) {
    els.player.setAttribute("src", url);
  }
}

async function applyMediaSnapshot(snap) {
  if (!snap || typeof snap !== "object") return;
  state.media = {
    currentTime: Number(snap.currentTime) || 0,
    duration: Number(snap.duration) || 0,
    paused: Boolean(snap.paused),
    muted: Boolean(snap.muted),
    volume: Number.isFinite(snap.volume) ? snap.volume : 1,
    live: Boolean(snap.live),
    href: snap.href || state.media.href,
  };
  updateTransport();
  if (snap.href) {
    window.xvw.rememberPlayback({
      href: snap.href,
      currentTime: state.media.currentTime,
      duration: state.media.duration,
      live: state.media.live,
    });
    maybeRestore(snap.href, snap);
  }
}

async function maybeRestore(href, snap) {
  if (!href || state.restoredKey === href) return;
  if (snap?.live) return;
  let resume;
  try {
    resume = await window.xvw.getPlayback(href);
  } catch {
    return;
  }
  if (!resume?.ok || !resume.seconds) {
    state.restoredKey = href;
    return;
  }
  if (snap && Number(snap.currentTime) >= resume.seconds - 1) {
    state.restoredKey = href;
    return;
  }
  state.restoredKey = href;
  const attempts = [150, 400, 900, 1600, 2400];
  for (const wait of attempts) {
    await new Promise((r) => setTimeout(r, wait));
    try {
      const result = await els.player.executeJavaScript(
        `window.__xvwRestoreTime ? window.__xvwRestoreTime(${JSON.stringify(resume.seconds)}) : { ok: false }`
      );
      if (result?.ok || result?.live) break;
    } catch {
      // guest may still be loading
    }
  }
}

async function mediaCommand(cmd) {
  try {
    const result = await window.xvw.mediaCommand(cmd);
    if (result?.ok) applyMediaSnapshot(result);
    return result;
  } catch {
    return { ok: false };
  }
}

async function openFromText(text) {
  const result = await window.xvw.openUrl(text);
  if (!result.ok) {
    showToast(result.error || "Could not open that link.");
    return false;
  }
  setOpenPrompt(false);
  showPlayer(result.loadUrl);
  return true;
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  openFromText(els.input.value);
});

els.openVideo.addEventListener("click", () => setOpenPrompt(true));
els.openCancel.addEventListener("click", () => setOpenPrompt(false));
els.openOverlay.addEventListener("click", (event) => {
  if (event.target === els.openOverlay) setOpenPrompt(false);
});

els.paste.addEventListener("click", async () => {
  const result = await window.xvw.pasteAndOpen();
  if (!result.ok) {
    showToast(result.error || "Clipboard does not contain an X link.");
    return;
  }
  setOpenPrompt(false);
  showPlayer(result.loadUrl);
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
  const result = await window.xvw.toggleFullscreen();
  if (!result?.ok) {
    showToast(result?.error || "Could not toggle fullscreen.");
    return;
  }
  setFullscreenUi(Boolean(result.fullscreen));
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

document.addEventListener("dragover", (event) => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
});

document.addEventListener("drop", (event) => {
  event.preventDefault();
  const uri = event.dataTransfer?.getData("text/uri-list") || "";
  const text = event.dataTransfer?.getData("text/plain") || "";
  const firstUri = uri.split(/\r?\n/).find((line) => line && !line.startsWith("#"));
  const candidate = firstUri || text;
  if (candidate) openFromText(candidate);
});

document.addEventListener("keydown", (event) => {
  const meta = event.metaKey || event.ctrlKey;

  if (event.key === "Escape") {
    if (state.helpOpen) {
      setHelpOpen(false);
      event.preventDefault();
    } else if (state.openPrompt) {
      setOpenPrompt(false);
      event.preventDefault();
    } else if (state.fullscreen) {
      window.xvw.setFullscreen(false);
      event.preventDefault();
    } else if (state.playing && !document.body.classList.contains("chrome-visible")) {
      bumpChrome();
      event.preventDefault();
    }
  }

  if (event.key === "F11") {
    if (state.playing) {
      state.chromePinned = true;
      document.body.classList.remove("chrome-visible");
    } else {
      state.toolbarHidden = !state.toolbarHidden;
      document.body.classList.toggle("toolbar-hidden", state.toolbarHidden);
    }
    event.preventDefault();
  }

  if (meta && event.key.toLowerCase() === "l") {
    setOpenPrompt(true);
    event.preventDefault();
  }

  if (event.key === "F1") {
    setHelpOpen(!state.helpOpen);
    event.preventDefault();
  }

  if (state.playing && !state.helpOpen && !state.openPrompt && document.activeElement !== els.input) {
    if (event.code === "Space") {
      mediaCommand({ togglePlay: true });
      event.preventDefault();
    }
    if (event.key === "ArrowLeft") {
      mediaCommand({ jump: -10 });
      event.preventDefault();
    }
    if (event.key === "ArrowRight") {
      mediaCommand({ jump: 10 });
      event.preventDefault();
    }
    if (event.key.toLowerCase() === "m" && !meta) {
      mediaCommand({ toggleMute: true });
      event.preventDefault();
    }
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
    const href =
      typeof els.player.getURL === "function" ? els.player.getURL() : els.player.getAttribute("src");
    if (href && href !== "about:blank") maybeRestore(href, { currentTime: 0, duration: 1, live: false });
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
    if (els.input) els.input.value = event.url;
    window.xvw.rememberUrl(event.url);
  }
  injectFocus();
});

els.player.addEventListener("did-navigate-in-page", (event) => {
  if (event.url && event.url !== "about:blank") {
    if (els.input) els.input.value = event.url;
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

  let initial = { alwaysOnTop: false, compact: true, lastUrl: "", fullscreen: false };
  try {
    initial = await window.xvw.getState();
  } catch {
    // Main process not ready yet; keep defaults.
  }
  setPressed(els.pin, Boolean(initial.alwaysOnTop));
  setPressed(els.compact, initial.compact !== false);
  setFullscreenUi(Boolean(initial.fullscreen));
  const restoreUrl = initial.lastUrl || "";
  if (restoreUrl && !(await window.xvw.isAuthUrl(restoreUrl))) {
    showPlayer(restoreUrl);
  }

  window.xvw.onState((next) => {
    if (typeof next.alwaysOnTop === "boolean") setPressed(els.pin, next.alwaysOnTop);
    if (typeof next.compact === "boolean") setPressed(els.compact, next.compact);
    if (typeof next.fullscreen === "boolean") setFullscreenUi(next.fullscreen);
  });

  window.xvw.onOpenLoadUrl((result) => {
    if (!result?.ok || !result.loadUrl) return;
    window.xvw.isAuthUrl(result.loadUrl).then((auth) => {
      if (!auth) {
        setOpenPrompt(false);
        showPlayer(result.loadUrl);
      }
    });
  });

  window.xvw.onToggleHelp(() => setHelpOpen(!state.helpOpen));
  window.xvw.onToggleToolbar(() => {
    if (state.playing) {
      state.chromePinned = true;
      document.body.classList.remove("chrome-visible");
    } else {
      state.toolbarHidden = !state.toolbarHidden;
      document.body.classList.toggle("toolbar-hidden", state.toolbarHidden);
    }
  });
  window.xvw.onOpenVideoPrompt(() => setOpenPrompt(true));
  window.xvw.onFullscreen((value) => setFullscreenUi(value));

  document.addEventListener("mousemove", (event) => {
    if (!state.playing) return;
    if (event.clientY <= 16 || event.clientY >= window.innerHeight - 28) bumpChrome();
  });
  els.toolbar.addEventListener("mousemove", () => {
    if (state.playing) bumpChrome();
  });
  els.transport.addEventListener("mousemove", () => {
    if (state.playing) bumpChrome();
  });
  els.edgeHot.addEventListener("mouseenter", () => bumpChrome());
  els.edgeHotBottom.addEventListener("mouseenter", () => bumpChrome());
  els.player.addEventListener("ipc-message", (event) => {
    if (event.channel === "xvw-activity") bumpChrome();
    if (event.channel === "xvw-media") applyMediaSnapshot(event.args?.[0]);
  });
  els.playBtn.addEventListener("click", () => mediaCommand({ togglePlay: true }));
  els.muteTransport.addEventListener("click", () => mediaCommand({ toggleMute: true }));
  els.seek.addEventListener("pointerdown", () => {
    state.seeking = true;
  });
  els.seek.addEventListener("input", () => {
    if (state.media.live || !state.media.duration) return;
    const next = (Number(els.seek.value) / 1000) * state.media.duration;
    els.timeLabel.textContent = `${formatTime(next)} / ${formatTime(state.media.duration)}`;
  });
  const commitSeek = () => {
    state.seeking = false;
    if (state.media.live || !state.media.duration) return;
    const next = (Number(els.seek.value) / 1000) * state.media.duration;
    mediaCommand({ seek: next });
  };
  els.seek.addEventListener("change", commitSeek);
  els.volume.addEventListener("input", () => {
    mediaCommand({ volume: Number(els.volume.value) / 100 });
  });
  els.input.addEventListener("focus", () => {
    document.body.classList.add("chrome-visible");
  });
  els.input.addEventListener("blur", () => {
    if (state.playing && !state.openPrompt) bumpChrome();
  });
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
