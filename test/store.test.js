"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadStore, saveStore, sanitizeBounds } = require("../src/main/store");

describe("store", () => {
  it("round-trips window state", () => {
    const file = path.join(os.tmpdir(), `xvw-state-${Date.now()}.json`);
    saveStore(file, {
      bounds: { x: 10, y: 20, width: 800, height: 600 },
      alwaysOnTop: true,
      compact: false,
      lastUrl: "https://x.com/i/status/1",
    });
    const loaded = loadStore(file);
    assert.equal(loaded.alwaysOnTop, true);
    assert.equal(loaded.compact, false);
    assert.equal(loaded.lastUrl, "https://x.com/i/status/1");
    assert.equal(loaded.bounds.width, 800);
    fs.unlinkSync(file);
  });

  it("returns defaults for missing files", () => {
    const loaded = loadStore("/tmp/xvw-does-not-exist-123.json");
    assert.equal(loaded.alwaysOnTop, false);
    assert.equal(loaded.compact, true);
    assert.equal(loaded.bounds.width, 960);
  });

  it("drops bounds that sit on no display", () => {
    const displays = [{ workArea: { x: 0, y: 0, width: 1280, height: 800 } }];
    const off = sanitizeBounds({ x: -8000, y: -8000, width: 700, height: 500 }, displays);
    assert.equal(off.width, 700);
    assert.equal(off.x, undefined);
  });
});
