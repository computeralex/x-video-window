"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "../src/inject/focus.css"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "../src/inject/focus.js"), "utf8");
const preload = fs.readFileSync(path.join(__dirname, "../src/preload/guest-preload.js"), "utf8");

describe("Focus theater assets", () => {
  it("hides tweet chrome only on nodes that do not contain the player", () => {
    for (const source of [css, js, preload]) {
      assert.match(source, /layout-width-right/);
      assert.match(source, /aside:not\(:has\(video\)\)/);
      assert.match(source, /aria-label="Follow"/);
      assert.match(source, /aria-label="Like"/);
    }
    assert.match(js, /hidePostChrome/);
    assert.match(css, /--layout-width-two-column:\s*100vw/);
  });

  it("does not pin the player or restyle <video> (Mac media-layer blackout)", () => {
    for (const source of [css, js, preload]) {
      assert.doesNotMatch(source, /\.xvw-player-root\s*\{[^}]*position:\s*fixed/s);
      assert.doesNotMatch(source, /html\.xvw-theater \[class\*="aspect-video"\]/);
      assert.doesNotMatch(source, /html\.xvw-theater video \{/);
      assert.doesNotMatch(source, /\.xvw-player-root video/);
    }
    assert.doesNotMatch(js, /classList\.add\("xvw-video"\)/);
    assert.doesNotMatch(js, /classList\.add\("xvw-neutralize"\)/);
    assert.doesNotMatch(js, /classList\.add\("xvw-player-root"\)/);
    assert.doesNotMatch(js, /classList\.add\("xvw-fill-box"\)/);
    assert.doesNotMatch(js, /unpinIfBlanked/);
    assert.doesNotMatch(js, /hideNonVideoBranches/);
    assert.doesNotMatch(css, /z-index:\s*2147483000/);
    assert.doesNotMatch(preload, /z-index:\s*2147483000/);
  });

  it("defaults compact/Focus on in the injected script unless the user turned it off", () => {
    assert.match(js, /dataset\.xvwFocus !== "off"/);
    assert.match(preload, /dataset\.xvwFocus === "off"/);
  });
});
