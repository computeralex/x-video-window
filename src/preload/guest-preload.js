"use strict";

/**
 * Isolated guest preload: cinema chrome-hide plus media snapshots
 * so the shell can persist resume position.
 */
const { ipcRenderer } = require("electron");

const EARLY_STYLE_ID = "xvw-early-cinema";

function isAuthPath(pathname) {
  return (
    /\/i\/jf(?:\/|$)/.test(pathname) ||
    /\/i\/flow\//.test(pathname) ||
    /\/onboarding(?:\/|$)/.test(pathname) ||
    /\/(?:login|logout|signup|signin)(?:\/|$)/.test(pathname)
  );
}

function isWatchPath(pathname) {
  const p = String(pathname || "");
  return (
    /\/i\/broadcasts(?:\/|$)/i.test(p) ||
    /\/i\/spaces(?:\/|$)/i.test(p) ||
    /\/i\/live(?:\/|$)/i.test(p) ||
    /\/broadcasts(?:\/|$)/i.test(p) ||
    /\/(?:i\/(?:web\/)?status|[^/]+\/status)\/\d+/i.test(p)
  );
}

// Theater chrome hide. Never :has(video) (Mac style-invalidation freeze),
// never restyle <video> or its ancestors, never hide isolate overlay.
const THEATER_CSS = `
html.xvw-theater [class*="layout-width-two-column"] ~ *,
html.xvw-theater [class*="layout-width-right"],
html.xvw-theater [class*="layout-width-rail"],
html.xvw-theater [class*="self-stretch"][class*="xlarge:flex"],
html.xvw-theater [data-testid="sidebarColumn"],
html.xvw-theater aside,
html.xvw-theater [class*="font-chirp"][class*="whitespace-pre-wrap"],
html.xvw-theater .xvw-hide-chrome {
  display: none !important;
}
html.xvw-theater {
  --layout-width-primary: 100%;
  --layout-min-primary: 0px;
  --layout-width-two-column: 100%;
}
html.xvw-theater main[role="main"] {
  border: none !important;
  min-width: 0 !important;
}
html.xvw-theater [class*="max-w-[600px]"] {
  max-width: none !important;
}
`;

function ensureEarlyCinema() {
  if (typeof location === "undefined") return;
  if (isAuthPath(location.pathname)) {
    document.documentElement.classList.remove("xvw-theater");
    const stale = document.getElementById(EARLY_STYLE_ID);
    if (stale) stale.remove();
    return;
  }
  if (document.documentElement.dataset.xvwFocus === "off") {
    document.documentElement.classList.remove("xvw-theater");
    const stale = document.getElementById(EARLY_STYLE_ID);
    if (stale) stale.remove();
    return;
  }
  if (!isWatchPath(location.pathname)) return;
  document.documentElement.classList.add("xvw-theater");
  let style = document.getElementById(EARLY_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = EARLY_STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  if (style.textContent !== THEATER_CSS) style.textContent = THEATER_CSS;
}

function ping() {
  try {
    ipcRenderer.sendToHost("xvw-activity");
  } catch {
    // embedder may not be listening yet
  }
}

function pickVideo() {
  const videos = Array.from(document.querySelectorAll("video"));
  if (!videos.length) return null;
  videos.sort((a, b) => {
    const ap = a.paused ? 0 : 1;
    const bp = b.paused ? 0 : 1;
    if (ap !== bp) return bp - ap;
    return b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight;
  });
  return videos[0];
}

function snapshot() {
  const video = pickVideo();
  if (!video) return null;
  const duration = Number(video.duration);
  const live = !Number.isFinite(duration) || duration <= 0;
  return {
    currentTime: Number(video.currentTime) || 0,
    duration: live ? 0 : duration,
    paused: Boolean(video.paused),
    muted: Boolean(video.muted),
    volume: Number.isFinite(video.volume) ? video.volume : 1,
    live,
    href: location.href,
  };
}

function sendMedia() {
  const snap = snapshot();
  if (!snap) return;
  try {
    ipcRenderer.sendToHost("xvw-media", snap);
  } catch {
    // embedder may not be listening yet
  }
}

let attached = null;
let mediaTimer = 0;

function attach(video) {
  if (!video || attached === video) return;
  if (attached) {
    attached.removeEventListener("timeupdate", onTime);
    attached.removeEventListener("pause", sendMedia);
    attached.removeEventListener("play", sendMedia);
    attached.removeEventListener("volumechange", sendMedia);
    attached.removeEventListener("loadedmetadata", sendMedia);
    attached.removeEventListener("durationchange", sendMedia);
  }
  attached = video;
  video.addEventListener("timeupdate", onTime);
  video.addEventListener("pause", sendMedia);
  video.addEventListener("play", sendMedia);
  video.addEventListener("volumechange", sendMedia);
  video.addEventListener("loadedmetadata", sendMedia);
  video.addEventListener("durationchange", sendMedia);
  sendMedia();
}

function onTime() {
  if (mediaTimer) return;
  mediaTimer = window.setTimeout(() => {
    mediaTimer = 0;
    sendMedia();
  }, 700);
}

function watchVideos() {
  attach(pickVideo());
}

window.addEventListener("mousemove", ping, { passive: true });
window.addEventListener("mousedown", ping, { passive: true });
window.addEventListener("wheel", ping, { passive: true });
window.addEventListener("keydown", ping, { passive: true });
window.addEventListener("pagehide", sendMedia);
window.addEventListener("beforeunload", sendMedia);

const obs = new MutationObserver(() => {
  ensureEarlyCinema();
  watchVideos();
});
if (document.documentElement) {
  obs.observe(document.documentElement, { childList: true, subtree: true });
}
ensureEarlyCinema();
watchVideos();
window.addEventListener("DOMContentLoaded", ensureEarlyCinema);
window.setInterval(() => {
  ensureEarlyCinema();
  watchVideos();
}, 2000);
