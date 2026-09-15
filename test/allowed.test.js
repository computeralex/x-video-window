"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedNavigation } = require("../src/main/allowed");

describe("isAllowedNavigation", () => {
  it("allows x.com, twitter.com, and media CDNs", () => {
    assert.equal(isAllowedNavigation("https://x.com/i/status/1"), true);
    assert.equal(isAllowedNavigation("https://twitter.com/login"), true);
    assert.equal(isAllowedNavigation("https://video.twimg.com/ext_tw_video/a.mp4"), true);
    assert.equal(isAllowedNavigation("https://abs.twimg.com/player.js"), true);
    assert.equal(isAllowedNavigation("https://t.co/abc"), true);
  });

  it("allows sign-in related hosts", () => {
    assert.equal(isAllowedNavigation("https://accounts.google.com/o/oauth2"), true);
    assert.equal(isAllowedNavigation("https://appleid.apple.com/auth/authorize"), true);
    assert.equal(isAllowedNavigation("https://newassets.hcaptcha.com/captcha"), true);
    assert.equal(isAllowedNavigation("https://www.recaptcha.net/recaptcha"), true);
    assert.equal(isAllowedNavigation("https://accounts.youtube.com/accounts/SetSID"), true);
  });

  it("blocks unrelated sites and dangerous schemes", () => {
    assert.equal(isAllowedNavigation("https://evil.example"), false);
    assert.equal(isAllowedNavigation("file:///etc/passwd"), false);
    assert.equal(isAllowedNavigation("javascript:alert(1)"), false);
    assert.equal(isAllowedNavigation("data:text/html,hi"), false);
  });
});
