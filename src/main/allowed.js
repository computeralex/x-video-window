"use strict";

/**
 * Top-level navigation allowlist for the X webview.
 * Media/CDN hosts are included so video actually plays; a few auth/captcha
 * hosts are included so the user can sign in with their own account.
 */

const SUFFIXES = [
  "x.com",
  "twitter.com",
  "twimg.com",
  "t.co",
  "pscp.tv",
  "periscope.tv",
  "pscp.cloud",
  "twitter.co",
  "twitpic.com",
  "hcaptcha.com",
];

const EXACT_HOSTS = new Set([
  "accounts.google.com",
  "appleid.apple.com",
  "idmsa.apple.com",
  "challenges.cloudflare.com",
  "js.hcaptcha.com",
  "newassets.hcaptcha.com",
]);

function hostnameOf(urlString) {
  try {
    return new URL(urlString).hostname.replace(/\.$/, "").toLowerCase();
  } catch {
    return "";
  }
}

function hostMatches(host, suffix) {
  return host === suffix || host.endsWith(`.${suffix}`);
}

function isAllowedHost(host) {
  if (!host) return false;
  if (EXACT_HOSTS.has(host)) return true;
  return SUFFIXES.some((suffix) => hostMatches(host, suffix));
}

function isAllowedNavigation(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  if (url.protocol === "about:") {
    return url.pathname === "blank";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return false;
  }

  return isAllowedHost(url.hostname.replace(/\.$/, "").toLowerCase());
}

module.exports = {
  isAllowedHost,
  isAllowedNavigation,
  hostnameOf,
  SUFFIXES,
  EXACT_HOSTS,
};
