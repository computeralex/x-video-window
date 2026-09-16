"use strict";

/**
 * Isolated guest preload: cinema activity pings plus media snapshots
 * so the shell can persist resume position and drive the transport bar.
 */
const { ipcRenderer } = require("electron");

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

const obs = new MutationObserver(watchVideos);
if (document.documentElement) {
  obs.observe(document.documentElement, { childList: true, subtree: true });
}
watchVideos();
window.setInterval(watchVideos, 2000);
