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

function unwrapCustomScheme(text) {
  const s = String(text == null ? "" : text).trim();
  if (!/^xvw:/i.test(s)) return s;
  let rest = s.replace(/^xvw:\/\//i, "").replace(/^xvw:/i, "");
  if (/^open\?/i.test(rest)) {
    try {
      const params = new URLSearchParams(rest.slice(rest.indexOf("?") + 1));
      const nested = params.get("url") || params.get("link") || params.get("text");
      if (nested) return nested;
    } catch {
      // keep rest
    }
  }
  return rest;
}

function extractCandidate(text) {
  const cleaned = stripWrapping(unwrapCustomScheme(text));
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
  // /video/1 is X’s media-expand path. Some sessions keep the lightbox;
  // others redirect to /{user}/status/{id}. Theater still applies there.
  return `https://x.com/i/status/${id}/video/1`;
}

function statusIdFromUrl(urlString) {
  const href = String(urlString || "");
  try {
    const path = new URL(href).pathname;
    const match = path.match(/\/(?:i\/(?:web\/)?status|[^/]+\/status)\/(\d{5,20})/i);
    return match ? match[1] : "";
  } catch {
    const match = href.match(/\/(?:i\/(?:web\/)?status|[^/]+\/status)\/(\d{5,20})/i);
    return match ? match[1] : "";
  }
}

function isStatusVideoPlayerUrl(urlString) {
  const href = String(urlString || "");
  try {
    return /\/(?:i\/(?:web\/)?status|[^/]+\/status)\/\d{5,20}\/video\/\d+/i.test(
      new URL(href).pathname
    );
  } catch {
    return /\/(?:i\/(?:web\/)?status|[^/]+\/status)\/\d{5,20}\/video\/\d+/i.test(href);
  }
}

function isXHomeUrl(urlString) {
  try {
    const path = new URL(urlString).pathname.replace(/\/+$/, "") || "/";
    return path === "/" || path === "/home" || path === "/i/timeline";
  } catch {
    return false;
  }
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
    const path = url.pathname;
    const userPost = /^\/(?!i\/)[^/]+\/status\/\d+/i.test(path);
    const loadPath = userPost
      ? path
      : /\/video\/\d+\/?$/i.test(path)
        ? path
        : `/i/status/${status[1]}/video/1`;
    return {
      ok: true,
      kind: "status",
      id: status[1],
      loadUrl: `https://x.com${loadPath}`,
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
  unwrapCustomScheme,
  hostAllowed,
  statusLoadUrl,
  statusIdFromUrl,
  isStatusVideoPlayerUrl,
  isXHomeUrl,
};
