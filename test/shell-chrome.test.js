"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../src/renderer/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(__dirname, "../src/renderer/renderer.js"), "utf8");
const styles = fs.readFileSync(path.join(__dirname, "../src/renderer/styles.css"), "utf8");

describe("shell chrome", () => {
  it("has a labeled Focus control and Back/Forward, not a Liberator scrubber", () => {
    assert.match(html, />\s*Focus\s*</);
    assert.match(html, /id="compact-btn"/);
    assert.match(html, /id="back-btn"/);
    assert.match(html, /id="forward-btn"/);
    assert.doesNotMatch(html, /id="transport"/);
    assert.doesNotMatch(html, /id="seek"/);
    assert.doesNotMatch(html, /id="mute-transport"/);
    assert.doesNotMatch(html, /edge-hot-bottom/);
    assert.doesNotMatch(styles, /\.transport/);
    assert.doesNotMatch(renderer, /updateTransport/);
    assert.match(renderer, /canGoForward/);
  });
});
