"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isAuthUrl, isAuthPath } = require("../src/main/auth");

describe("isAuthUrl", () => {
  it("treats X journey-framework onboarding login as auth", () => {
    assert.equal(
      isAuthUrl("https://x.com/i/jf/onboarding/web?mode=login"),
      true
    );
    assert.equal(isAuthUrl("https://x.com/i/jf/onboarding/web"), true);
  });

  it("treats classic flow login/signup as auth", () => {
    assert.equal(isAuthUrl("https://x.com/i/flow/login"), true);
    assert.equal(isAuthUrl("https://twitter.com/i/flow/login"), true);
    assert.equal(isAuthUrl("https://x.com/i/flow/signup"), true);
  });

  it("treats login, logout, signup, and account-access paths as auth", () => {
    assert.equal(isAuthUrl("https://x.com/login"), true);
    assert.equal(isAuthUrl("https://twitter.com/logout"), true);
    assert.equal(isAuthUrl("https://x.com/signup"), true);
    assert.equal(isAuthUrl("https://x.com/account/access"), true);
  });

  it("treats Google, Apple, and captcha hosts as auth", () => {
    assert.equal(isAuthUrl("https://accounts.google.com/o/oauth2/auth"), true);
    assert.equal(isAuthUrl("https://appleid.apple.com/auth/authorize"), true);
    assert.equal(isAuthUrl("https://idmsa.apple.com/IDMSWebAuth/signin"), true);
    assert.equal(isAuthUrl("https://newassets.hcaptcha.com/captcha/v1/x"), true);
    assert.equal(isAuthUrl("https://challenges.cloudflare.com/cdn-cgi/challenge"), true);
  });

  it("does not treat status or home pages as auth", () => {
    assert.equal(isAuthUrl("https://x.com/i/status/1814440131505598541"), false);
    assert.equal(isAuthUrl("https://x.com/Health00810/status/1814440131505598541"), false);
    assert.equal(isAuthUrl("https://twitter.com/user/status/1234567890123456789"), false);
    assert.equal(isAuthUrl("https://x.com/home"), false);
    assert.equal(isAuthUrl("about:blank"), false);
    assert.equal(isAuthUrl(""), false);
  });
});

describe("isSignedInLanding", () => {
  const { isSignedInLanding } = require("../src/main/auth");

  it("treats home and other non-auth x.com pages as post-login", () => {
    assert.equal(isSignedInLanding("https://x.com/home"), true);
    assert.equal(isSignedInLanding("https://x.com/"), true);
    assert.equal(isSignedInLanding("https://x.com/i/jf/onboarding/web?mode=login"), false);
    assert.equal(isSignedInLanding("https://accounts.google.com/o/oauth2/auth"), false);
  });
});

describe("persistedLastUrl", () => {
  const { persistedLastUrl } = require("../src/main/auth");

  it("strips auth URLs and keeps status URLs", () => {
    assert.equal(persistedLastUrl("https://x.com/i/jf/onboarding/web?mode=login"), "");
    assert.equal(persistedLastUrl("https://x.com/i/flow/login"), "");
    assert.equal(persistedLastUrl("https://x.com/i/status/1"), "https://x.com/i/status/1");
    assert.equal(persistedLastUrl(""), "");
  });
});

describe("isAuthPath", () => {
  it("matches /i/jf/ and /i/flow/ pathnames", () => {
    assert.equal(isAuthPath("/i/jf/onboarding/web", "?mode=login"), true);
    assert.equal(isAuthPath("/i/flow/login", ""), true);
    assert.equal(isAuthPath("/i/status/1", ""), false);
  });
});
