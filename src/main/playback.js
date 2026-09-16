"use strict";

/**
 * Per-video playback identity and resume rules.
 * Live streams (infinite duration / live keys without a finite duration)
 * do not persist a position — seeking is not meaningful there.
 */

const STATUS_RE = /\/(?:i\/(?:web\/)?status|[^/]+\/status)\/(\d{5,20})/i;
const VIDEO_TWEET_RE = /\/i\/videos(?:\/tweet)?\/(\d{5,20})/i;
const BROADCAST_RE = /\/(?:i\/)?broadcasts\/([^/?#]+)/i;
const SPACE_RE = /\/i\/spaces\/([^/?#]+)/i;
const LIVE_RE = /\/i\/live\/([^/?#]+)/i;

const MIN_RESUME_SECONDS = 3;
const END_GUARD_SECONDS = 2;
const MAX_POSITIONS = 200;

function mediaKeyFromUrl(urlString) {
  if (!urlString || typeof urlString !== "string") return "";
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return "";
  }
  const path = url.pathname || "";
  const status = path.match(STATUS_RE);
  if (status) return `status:${status[1]}`;
  const videoTweet = path.match(VIDEO_TWEET_RE);
  if (videoTweet) return `status:${videoTweet[1]}`;
  const broadcast = path.match(BROADCAST_RE);
  if (broadcast) return `broadcast:${broadcast[1]}`;
  const space = path.match(SPACE_RE);
  if (space) return `space:${space[1]}`;
  const live = path.match(LIVE_RE);
  if (live) return `live:${live[1]}`;
  return "";
}

function isLiveSnapshot({ live, duration } = {}) {
  if (live) return true;
  const d = Number(duration);
  return !Number.isFinite(d) || d <= 0;
}

function shouldPersistPosition({ seconds, duration, live } = {}) {
  if (isLiveSnapshot({ live, duration })) return false;
  const t = Number(seconds);
  const d = Number(duration);
  if (!Number.isFinite(t) || !Number.isFinite(d)) return false;
  if (t < MIN_RESUME_SECONDS) return false;
  if (t > d - END_GUARD_SECONDS) return false;
  return true;
}

function resumeSeconds(record, duration) {
  if (!record || isLiveSnapshot(record)) return 0;
  const t = Number(record.seconds);
  const d = Number(duration != null ? duration : record.duration);
  if (!shouldPersistPosition({ seconds: t, duration: d, live: false })) return 0;
  return Math.min(t, Math.max(0, d - END_GUARD_SECONDS));
}

const RESUME_NEAR_SECONDS = 1.5;
const RESUME_HOLD_NEAR_SECONDS = 2.5;

function alreadyAtResume(currentTime, savedSeconds, tolerance = RESUME_NEAR_SECONDS) {
  const current = Number(currentTime) || 0;
  const saved = Number(savedSeconds) || 0;
  return Math.abs(current - saved) <= tolerance;
}

/**
 * After a lookup, ignore autoplay-from-zero snapshots so they cannot
 * overwrite the disk position before restore has a chance to stick.
 */
function shouldHoldExistingResume(lock, incomingSeconds, now = Date.now()) {
  if (!lock || lock.released || !lock.key) return false;
  if (now >= (Number(lock.until) || 0)) return false;
  return !alreadyAtResume(incomingSeconds, lock.seconds, RESUME_HOLD_NEAR_SECONDS);
}

function upsertPosition(positions, key, record) {
  const next = { ...(positions || {}) };
  if (!key) return next;
  if (!shouldPersistPosition(record)) {
    delete next[key];
    return prunePositions(next);
  }
  next[key] = {
    seconds: Number(record.seconds),
    duration: Number(record.duration) || 0,
    updatedAt: Number(record.updatedAt) || Date.now(),
  };
  return prunePositions(next);
}

function prunePositions(positions) {
  const entries = Object.entries(positions || {});
  if (entries.length <= MAX_POSITIONS) return Object.fromEntries(entries);
  entries.sort((a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0));
  return Object.fromEntries(entries.slice(entries.length - MAX_POSITIONS));
}

module.exports = {
  MIN_RESUME_SECONDS,
  END_GUARD_SECONDS,
  MAX_POSITIONS,
  RESUME_NEAR_SECONDS,
  RESUME_HOLD_NEAR_SECONDS,
  mediaKeyFromUrl,
  isLiveSnapshot,
  shouldPersistPosition,
  resumeSeconds,
  alreadyAtResume,
  shouldHoldExistingResume,
  upsertPosition,
  prunePositions,
};
