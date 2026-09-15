"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  unwrapCustomScheme,
  parseIncoming,
  firstIncomingFromArgv,
  looksLikeIncoming,
} = require("../src/main/incoming-url");

describe("incoming-url", () => {
  it("unwraps xvw: and xvw:// custom schemes", () => {
    assert.equal(
      unwrapCustomScheme("xvw:https://x.com/i/broadcasts/1AxRnZbVpjaxl?s=20"),
      "https://x.com/i/broadcasts/1AxRnZbVpjaxl?s=20"
    );
    assert.equal(
      unwrapCustomScheme("xvw://https://x.com/i/status/1814440131505598541"),
      "https://x.com/i/status/1814440131505598541"
    );
    assert.equal(
      unwrapCustomScheme("xvw:open?url=https%3A%2F%2Fx.com%2Fi%2Fstatus%2F1814440131505598541"),
      "https://x.com/i/status/1814440131505598541"
    );
  });

  it("parses Share / protocol / https watch links", () => {
    const broadcast = parseIncoming("xvw:https://x.com/i/broadcasts/1AxRnZbVpjaxl?s=20");
    assert.equal(broadcast.ok, true);
    assert.match(broadcast.loadUrl, /x\.com\/i\/broadcasts\/1AxRnZbVpjaxl/);

    const status = parseIncoming("https://x.com/SpaceX/status/1949680387330027593");
    assert.equal(status.ok, true);
    assert.equal(status.loadUrl, "https://x.com/i/status/1949680387330027593");
  });

  it("finds the first X URL in Electron argv (skips binary and app path)", () => {
    const parsed = firstIncomingFromArgv([
      "/usr/bin/electron",
      "/workspace",
      "--no-sandbox",
      "https://x.com/i/broadcasts/1AxRnZbVpjaxl?s=20",
    ]);
    assert.ok(parsed);
    assert.equal(parsed.ok, true);
    assert.match(parsed.loadUrl, /broadcasts\/1AxRnZbVpjaxl/);
  });

  it("accepts --url= and xvw: argv forms", () => {
    const flagged = firstIncomingFromArgv([
      "electron",
      ".",
      "--url=xvw:https://x.com/i/status/1814440131505598541",
    ]);
    assert.ok(flagged);
    assert.equal(flagged.loadUrl, "https://x.com/i/status/1814440131505598541");

    const scheme = firstIncomingFromArgv([
      "X Video Window",
      "xvw://https://twitter.com/user/status/1234567890123456789",
    ]);
    assert.ok(scheme);
    assert.equal(scheme.loadUrl, "https://x.com/i/status/1234567890123456789");
  });

  it("ignores argv without a watch URL", () => {
    assert.equal(firstIncomingFromArgv(["electron", ".", "--no-sandbox"]), null);
    assert.equal(looksLikeIncoming("/workspace"), false);
    assert.equal(looksLikeIncoming("--disable-gpu"), false);
  });
});
