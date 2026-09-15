"use strict";

/**
 * Pages where Focus mode should expand the playing video to the window.
 * Auth / onboarding paths are handled separately and must never match.
 */

function isWatchPath(pathname) {
  const p = String(pathname || "");
  if (/\/i\/broadcasts(?:\/|$)/i.test(p)) return true;
  if (/\/i\/spaces(?:\/|$)/i.test(p)) return true;
  if (/\/i\/live(?:\/|$)/i.test(p)) return true;
  if (/\/broadcasts(?:\/|$)/i.test(p)) return true;
  if (/\/(?:i\/(?:web\/)?status|[^/]+\/status)\/\d+/i.test(p)) return true;
  return false;
}

module.exports = { isWatchPath };
