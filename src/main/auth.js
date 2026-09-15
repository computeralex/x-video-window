"use strict";

/**
 * Detect X / Twitter auth, onboarding, OAuth, and captcha flows.
 * Focus CSS/JS must never run on these pages — it hides dialogs and
 * breaks Sign in (see /i/jf/onboarding/web?mode=login).
 */

const AUTH_HOSTS = new Set([
  "accounts.google.com",
  "appleid.apple.com",
  "idmsa.apple.com",
  "accounts.youtube.com",
  "challenges.cloudflare.com",
]);

const AUTH_HOST_SUFFIXES = ["hcaptcha.com", "recaptcha.net"];

const AUTH_PATH_RE =
  /\/i\/jf(?:\/|$)|\/i\/flow(?:\/|$)|\/onboarding(?:\/|$)|\/(?:login|logout|signin|sign-in|signup|sign-up)(?:\/|$)|\/account\/access(?:\/|$)|\/authenticate(?:\/|$)|\/oauth(?:2)?(?:\/|$)|\/i\/redirect(?:\/|$)|\/begin_password_reset(?:\/|$)|\/tos(?:\/|$)|\/privacy(?:\/|$)/i;

function hostnameOf(urlOrHost) {
  return String(urlOrHost || "")
    .replace(/\.$/, "")
    .toLowerCase();
}

function isAuthHost(hostname) {
  const host = hostnameOf(hostname);
  if (!host) return false;
  if (AUTH_HOSTS.has(host)) return true;
  return AUTH_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function isAuthPath(pathname, search) {
  const path = pathname || "";
  const query = search || "";
  if (AUTH_PATH_RE.test(path)) return true;
  if (/[?&]mode=(?:login|signup|register)\b/i.test(query)) return true;
  return false;
}

function isAuthUrl(urlString) {
  if (urlString == null || urlString === "" || urlString === "about:blank") {
    return false;
  }

  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  if (isAuthHost(url.hostname)) return true;
  return isAuthPath(url.pathname, url.search);
}

function isSignedInLanding(urlString) {
  if (!urlString || urlString === "about:blank") return false;
  if (isAuthUrl(urlString)) return false;

  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  const host = hostnameOf(url.hostname);
  const isX =
    host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com");
  return isX;
}

function persistedLastUrl(urlString) {
  if (typeof urlString !== "string" || !urlString) return "";
  if (isAuthUrl(urlString)) return "";
  return urlString;
}

module.exports = {
  isAuthUrl,
  isAuthPath,
  isAuthHost,
  isSignedInLanding,
  persistedLastUrl,
  AUTH_PATH_RE,
};
