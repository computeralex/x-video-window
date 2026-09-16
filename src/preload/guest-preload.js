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
  style.textContent = `
    html.xvw-theater, html.xvw-theater body, html.xvw-theater #react-root {
      overflow: hidden !important;
      height: 100% !important;
      max-height: 100% !important;
      background: #000 !important;
    }
    html.xvw-theater aside:not(:has(video)),
    html.xvw-theater nav:not(:has(video)),
    html.xvw-theater [class*="layout-width-right"]:not(:has(video)),
    html.xvw-theater [class*="layout-width-rail"]:not(:has(video)),
    html.xvw-theater [class*="font-chirp"][class*="whitespace-pre-wrap"],
    html.xvw-theater [data-testid="tweetText"],
    html.xvw-theater button[aria-label="Follow"],
    html.xvw-theater button[aria-label="Following"],
    html.xvw-theater button[aria-label="Reply"],
    html.xvw-theater button[aria-label="Repost"],
    html.xvw-theater button[aria-label="Like"],
    html.xvw-theater button[aria-label="Bookmark"],
    html.xvw-theater button[aria-label="Share"],
    html.xvw-theater [aria-label="View count"],
    html.xvw-theater [aria-label="See all the replies"] {
      display: none !important;
    }
    html.xvw-theater .xvw-player-root {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      max-height: none !important;
      z-index: 2147483000 !important;
      background: #000 !important;
    }
  `;
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
