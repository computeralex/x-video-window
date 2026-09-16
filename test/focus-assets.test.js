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
    assert.match(css, /\.xvw-player-root/);
  });

  it("does not pin every aspect-video or blank the media layer with transform/filter", () => {
    assert.doesNotMatch(css, /html\.xvw-theater \[class\*="aspect-video"\]/);
    assert.doesNotMatch(preload, /\[class\*="aspect-video"\]/);
    assert.doesNotMatch(css, /html\.xvw-theater video \{/);
    assert.doesNotMatch(css, /\.xvw-player-root video/);
    assert.doesNotMatch(preload, /\.xvw-player-root video/);
    assert.doesNotMatch(js, /classList\.add\("xvw-video"\)/);
    assert.doesNotMatch(js, /classList\.add\("xvw-neutralize"\)/);
    assert.match(js, /unpinIfBlanked/);
  });

  it("defaults compact/Focus on in the injected script unless the user turned it off", () => {
    assert.match(js, /dataset\.xvwFocus !== "off"/);
    assert.match(preload, /dataset\.xvwFocus === "off"/);
  });
});
