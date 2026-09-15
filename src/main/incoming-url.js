"use strict";

/**
 * Incoming watch URLs from Share / Open With / protocol / CLI / drag-drop.
 *
 * Custom scheme: xvw:https://x.com/…  and  xvw://https://x.com/…
 * Query form:    xvw:open?url=https%3A%2F%2Fx.com%2F…
 *
 * We do not claim http(s) as the default browser. macOS Share sheets list
 * Share Extensions; this app registers a protocol + public.url Open With
 * handler instead (see README).
 */

const { parseXUrl } = require("./parse-url");

const CUSTOM_SCHEME = "xvw";

function unwrapCustomScheme(text) {
  const s = String(text == null ? "" : text).trim();
  if (!/^xvw:/i.test(s)) return s;

  let rest = s.replace(/^xvw:\/\//i, "").replace(/^xvw:/i, "");
  if (/^open\?/i.test(rest)) {
    try {
      const query = rest.slice(rest.indexOf("?") + 1);
      const params = new URLSearchParams(query);
      const nested = params.get("url") || params.get("link") || params.get("text");
      if (nested) return nested;
    } catch {
      // keep rest
    }
  }
  return rest;
}

function looksLikeIncoming(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  if (/^--(?:url|open-url|open)=/i.test(s)) return true;
  if (/^xvw:/i.test(s)) return true;
  if (/^https?:\/\//i.test(s)) return true;
  if (/(?:^|\/\/)(?:www\.)?(?:mobile\.)?(?:x\.com|twitter\.com)\//i.test(s)) return true;
  return false;
}

function parseIncoming(text) {
  return parseXUrl(unwrapCustomScheme(text));
}

function firstIncomingFromArgv(argv) {
  for (const raw of argv || []) {
    if (raw == null) continue;
    const s = String(raw);
    if (s.startsWith("--")) {
      const match = s.match(/^--(?:url|open-url|open)=(.*)$/i);
      if (!match) continue;
      const parsed = parseIncoming(match[1]);
      if (parsed.ok) return parsed;
      continue;
    }
    if (!looksLikeIncoming(s)) continue;
    const parsed = parseIncoming(s);
    if (parsed.ok) return parsed;
  }
  return null;
}

module.exports = {
  CUSTOM_SCHEME,
  unwrapCustomScheme,
  looksLikeIncoming,
  parseIncoming,
  firstIncomingFromArgv,
};
