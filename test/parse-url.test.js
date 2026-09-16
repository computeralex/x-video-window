"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseXUrl } = require("../src/main/parse-url");

describe("parseXUrl", () => {
  it("accepts x.com status URLs", () => {
    const r = parseXUrl("https://x.com/SpaceX/status/1949680387330027593");
    assert.equal(r.ok, true);
    assert.equal(r.kind, "status");
    assert.equal(r.id, "1949680387330027593");
    assert.equal(r.loadUrl, "https://x.com/i/status/1949680387330027593/video/1");
  });

  it("accepts twitter.com status URLs and tracking params", () => {
    const r = parseXUrl(
      "https://twitter.com/user/status/1234567890123456789?s=20&t=abc"
    );
    assert.equal(r.ok, true);
    assert.equal(r.loadUrl, "https://x.com/i/status/1234567890123456789/video/1");
  });

  it("accepts /i/status and /i/web/status links", () => {
    assert.equal(
      parseXUrl("https://x.com/i/status/1814440131505598541").loadUrl,
      "https://x.com/i/status/1814440131505598541/video/1"
    );
    assert.equal(
      parseXUrl("https://x.com/i/web/status/1814440131505598541").id,
      "1814440131505598541"
    );
  });

  it("accepts /video/1 suffixes and mobile hosts", () => {
    const r = parseXUrl(
      "https://mobile.twitter.com/foo/status/1112223334445556667/video/1"
    );
    assert.equal(r.ok, true);
    assert.equal(r.loadUrl, "https://x.com/i/status/1112223334445556667/video/1");
  });

  it("accepts legacy i/videos/tweet URLs", () => {
    const r = parseXUrl("https://twitter.com/i/videos/tweet/705235433198714880");
    assert.equal(r.ok, true);
    assert.equal(r.id, "705235433198714880");
  });

  it("extracts a URL from messy clipboard text", () => {
    const r = parseXUrl(
      'Watch this https://x.com/i/status/1814440131505598541?s=20 extra words'
    );
    assert.equal(r.ok, true);
    assert.equal(r.id, "1814440131505598541");
  });

  it("accepts protocol-less hosts and bare ids", () => {
    assert.equal(
      parseXUrl("x.com/a/status/999888777666555444").id,
      "999888777666555444"
    );
    assert.equal(parseXUrl("1814440131505598541").loadUrl, "https://x.com/i/status/1814440131505598541/video/1");
  });

  it("rejects non-X hosts", () => {
    const r = parseXUrl("https://example.com/status/1234567890");
    assert.equal(r.ok, false);
  });

  it("rejects empty input", () => {
    assert.equal(parseXUrl("").ok, false);
    assert.equal(parseXUrl("   ").ok, false);
  });

  it("allows login and broadcast pages on X", () => {
    const login = parseXUrl("https://x.com/i/flow/login");
    assert.equal(login.ok, true);
    assert.equal(login.kind, "page");
    const live = parseXUrl("https://x.com/i/broadcasts/1YqNPgeNyoLGv");
    assert.equal(live.ok, true);
  });

  it("unwraps xvw: share / protocol links", () => {
    const r = parseXUrl("xvw:https://x.com/i/status/1814440131505598541");
    assert.equal(r.ok, true);
    assert.equal(r.loadUrl, "https://x.com/i/status/1814440131505598541/video/1");
  });
});
