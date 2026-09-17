"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "../src/inject/focus.css"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "../src/inject/focus.js"), "utf8");
const preload = fs.readFileSync(path.join(__dirname, "../src/preload/guest-preload.js"), "utf8");

function theaterBlock(source) {
  const idx = source.indexOf("html.xvw-theater");
  return idx === -1 ? "" : source.slice(idx);
}

describe("Focus theater assets", () => {
  it("hides only the logged-in tweet rail, never walking the player tree", () => {
    for (const source of [css, js, preload]) {
      assert.match(source, /layout-width-right/);
      assert.match(source, /self-stretch"\]\[class\*="xlarge:flex"\]/);
      assert.match(source, /layout-width-two-column"\] ~ \*/);
    }
    assert.doesNotMatch(js, /hidePostChrome/);
    assert.doesNotMatch(js, /hideNonVideoBranches/);
    assert.doesNotMatch(js, /hideDiscoverMore/);
    assert.doesNotMatch(js, /tagName === "VIDEO"/);
  });

  it("does not use :has(video) in theater CSS (Mac style-invalidation freeze)", () => {
    for (const source of [css, js, preload]) {
      assert.doesNotMatch(theaterBlock(source), /:has\(video\)/);
      assert.doesNotMatch(theaterBlock(source), /article:not/);
      assert.doesNotMatch(theaterBlock(source), /ul > li/);
      assert.doesNotMatch(theaterBlock(source), /aria-label\*="Like"/);
      assert.doesNotMatch(theaterBlock(source), /--layout-width-right/);
    }
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
    assert.doesNotMatch(css, /z-index:\s*2147483000/);
    assert.doesNotMatch(preload, /z-index:\s*2147483000/);
  });

  it("does not restyle video ancestors with flex/width/filter (Mac freeze+dim)", () => {
    for (const source of [css, js, preload]) {
      assert.doesNotMatch(source, /--layout-width-two-column:\s*100vw/);
      assert.doesNotMatch(source, /--layout-width-primary:\s*100vw/);
      assert.doesNotMatch(source, /flex:\s*1 1 auto/);
      assert.doesNotMatch(source, /html\.xvw-theater[^{]*\{[^}]*opacity\s*:/s);
      assert.doesNotMatch(source, /html\.xvw-theater[^{]*\{[^}]*filter\s*:/s);
    }
    assert.doesNotMatch(css, /\.xvw-hide-chrome/);
    assert.doesNotMatch(js, /classList\.add\("xvw-hide-chrome"\)/);
    assert.doesNotMatch(preload, /style\.textContent = `/);
  });

  it("defaults compact/Focus on in the injected script unless the user turned it off", () => {
    assert.match(js, /dataset\.xvwFocus !== "off"/);
    assert.match(preload, /dataset\.xvwFocus === "off"/);
  });
});
