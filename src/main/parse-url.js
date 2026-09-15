"use strict";

/**
 * Parse a pasted string into a URL we can load in the X webview.
 * Supports x.com / twitter.com status and video links, bare status IDs,
 * and other same-site pages (login, broadcasts) so sign-in still works.
 */

const STATUS_PATH =
  /\/(?:i\/(?:web\/)?status|[^/]+\/status)\/(\d{5,20})(?:\/(?:video|photo|analytics)\/\d+)?/i;
const VIDEO_TWEET_PATH = /\/i\/videos(?:\/tweet)?\/(\d{5,20})/i;
const BARE_ID = /^\d{5,20}$/;
const HOST_RE = /(?:^|\.)(?:x\.com|twitter\.com)$/i;

function stripWrapping(text) {
  return String(text)
    .trim()
    .replace(/^[\s<'"“”‘’[]+/, "")
    .replace(/[>'"“”‘’\])\s.,;]+$/g, "");
}

function extractCandidate(text) {
  const cleaned = stripWrapping(text);
  if (!cleaned) return "";

  const urlMatch = cleaned.match(/https?:\/\/[^\s<>"']+/i);
  if (urlMatch) {
    return stripWrapping(urlMatch[0]);
  }

  const wwwMatch = cleaned.match(
    /(?:www\.)?(?:mobile\.)?(?:x\.com|twitter\.com)\/[^\s<>"']+/i
  );
  if (wwwMatch) {
    return stripWrapping(wwwMatch[0]);
  }

  return cleaned.split(/\s+/)[0];
}

function hostAllowed(hostname) {
  const host = String(hostname || "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (host === "t.co") return true;
  return HOST_RE.test(host);
}

function statusLoadUrl(id) {
  return `https://x.com/i/status/${id}`;
}

function parseXUrl(input) {
  if (input == null) {
    return { ok: false, error: "Paste an X post or video link." };
  }

  const candidate = extractCandidate(input);
  if (!candidate) {
    return { ok: false, error: "Paste an X post or video link." };
  }

  if (BARE_ID.test(candidate)) {
    return {
      ok: true,
      kind: "status",
      id: candidate,
      loadUrl: statusLoadUrl(candidate),
    };
  }

  let raw = candidate;
  if (/^(www\.)?(mobile\.)?(x\.com|twitter\.com)\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return {
      ok: false,
      error: "That does not look like an X link. Paste an x.com or twitter.com URL.",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http(s) X links are supported." };
  }

  if (!hostAllowed(url.hostname)) {
    return {
      ok: false,
      error: "Only x.com and twitter.com links are supported.",
    };
  }

  const status = url.pathname.match(STATUS_PATH);
  if (status) {
    return {
      ok: true,
      kind: "status",
      id: status[1],
      loadUrl: statusLoadUrl(status[1]),
    };
  }

  const videoTweet = url.pathname.match(VIDEO_TWEET_PATH);
  if (videoTweet) {
    return {
      ok: true,
      kind: "status",
      id: videoTweet[1],
      loadUrl: statusLoadUrl(videoTweet[1]),
    };
  }

  url.protocol = "https:";
  return {
    ok: true,
    kind: "page",
    loadUrl: url.toString(),
  };
}

module.exports = {
  parseXUrl,
  extractCandidate,
  hostAllowed,
  statusLoadUrl,
};
