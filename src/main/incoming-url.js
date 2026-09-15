"use strict";

/**
 * Incoming watch URLs from Share / Open With / protocol / CLI / drag-drop.
 *
 * Custom scheme: xvw:https://x.com/…  and  xvw://https://x.com/…
 * Query form:    xvw:open?url=https%3A%2F%2Fx.com%2F…
 * Link files:    Finder/Safari .webloc and Windows-style .url (Open With)
 *
 * macOS Share via lists Share Extensions (.appex), not ordinary apps.
 * This repo does not ship a signed appex (needs Xcode + Developer ID).
 * Practical first-class path: xvw: protocol + Open With + a Shortcuts
 * share-sheet wrapper (see README).
 */

const fs = require("node:fs");
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

function isLinkFilePath(raw) {
  return /\.(webloc|url)$/i.test(String(raw || "").trim());
}

function extractUrlFromLinkFile(text) {
  const src = String(text || "");
  const plist = src.match(/<key>\s*URL\s*<\/key>\s*<string>([^<]+)<\/string>/i);
  if (plist) return plist[1].trim();
  const ini = src.match(/^\s*URL\s*=\s*(\S+)/im);
  if (ini) return ini[1].trim();
  return "";
}

function looksLikeIncoming(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  if (/^--(?:url|open-url|open)=/i.test(s)) return true;
  if (/^xvw:/i.test(s)) return true;
  if (/^https?:\/\//i.test(s)) return true;
  if (isLinkFilePath(s)) return true;
  if (/(?:^|\/\/)(?:www\.)?(?:mobile\.)?(?:x\.com|twitter\.com)\//i.test(s)) return true;
  return false;
}

function parseIncoming(text) {
  const unwrapped = unwrapCustomScheme(text);
  if (/<key>\s*URL\s*<\/key>/i.test(unwrapped) || /\[InternetShortcut\]/i.test(unwrapped)) {
    const nested = extractUrlFromLinkFile(unwrapped);
    if (nested) return parseXUrl(nested);
  }
  return parseXUrl(unwrapped);
}

function parseIncomingArg(raw) {
  const s = String(raw || "").trim();
  if (isLinkFilePath(s)) {
    try {
      const fromFile = extractUrlFromLinkFile(fs.readFileSync(s, "utf8"));
      if (fromFile) return parseIncoming(fromFile);
    } catch {
      // fall through to parse the path as text
    }
  }
  return parseIncoming(s);
}

function firstIncomingFromArgv(argv) {
  for (const raw of argv || []) {
    if (raw == null) continue;
    const s = String(raw);
    if (s.startsWith("--")) {
      const match = s.match(/^--(?:url|open-url|open)=(.*)$/i);
      if (!match) continue;
      const parsed = parseIncomingArg(match[1]);
      if (parsed.ok) return parsed;
      continue;
    }
    if (!looksLikeIncoming(s)) continue;
    const parsed = parseIncomingArg(s);
    if (parsed.ok) return parsed;
  }
  return null;
}

module.exports = {
  CUSTOM_SCHEME,
  unwrapCustomScheme,
  extractUrlFromLinkFile,
  isLinkFilePath,
  looksLikeIncoming,
  parseIncoming,
  parseIncomingArg,
  firstIncomingFromArgv,
};
