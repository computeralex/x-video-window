"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  unwrapCustomScheme,
  parseIncoming,
  parseIncomingArg,
  firstIncomingFromArgv,
  looksLikeIncoming,
  extractUrlFromLinkFile,
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

  it("parses protocol and https watch links", () => {
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
      "Unofficial 𝕏 (Twitter) Video Liberator",
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

  it("reads Safari webloc and Internet Shortcut files (Open With)", () => {
    const webloc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>URL</key>
  <string>https://x.com/i/broadcasts/1AxRnZbVpjaxl?s=20</string>
</dict></plist>`;
    assert.equal(
      extractUrlFromLinkFile(webloc),
      "https://x.com/i/broadcasts/1AxRnZbVpjaxl?s=20"
    );
    const parsed = parseIncoming(webloc);
    assert.equal(parsed.ok, true);
    assert.match(parsed.loadUrl, /broadcasts\/1AxRnZbVpjaxl/);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xvw-webloc-"));
    const file = path.join(dir, "clip.webloc");
    fs.writeFileSync(file, webloc);
    const fromArg = parseIncomingArg(file);
    assert.equal(fromArg.ok, true);
    assert.match(fromArg.loadUrl, /broadcasts\/1AxRnZbVpjaxl/);
    const argv = firstIncomingFromArgv(["electron", ".", file]);
    assert.ok(argv);
    assert.match(argv.loadUrl, /broadcasts\/1AxRnZbVpjaxl/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
