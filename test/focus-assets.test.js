"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "../src/inject/focus.css"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "../src/inject/focus.js"), "utf8");
const preload = fs.readFileSync(path.join(__dirname, "../src/preload/guest-preload.js"), "utf8");

describe("Focus theater assets", () => {
  it("hides the tweet sidebar, follow, replies, and engagement in default theater", () => {
    for (const source of [css, js, preload]) {
      assert.match(source, /layout-width-right/);
      assert.match(source, /aria-label="Reply"/);
      assert.match(source, /aria-label="Like"/);
      assert.match(source, /aria-label="Follow"/);
      assert.match(source, /aside/);
    }
    assert.match(js, /isKeepOverlay/);
    assert.match(js, /hidePostChrome/);
    assert.match(css, /transform: none/);
    assert.match(css, /contain: none/);
  });

  it("defaults compact/Focus on in the injected script unless the user turned it off", () => {
    assert.match(js, /dataset\.xvwFocus !== "off"/);
    assert.match(preload, /dataset\.xvwFocus === "off"/);
  });
});
