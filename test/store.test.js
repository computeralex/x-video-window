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

  it("defaults Focus/compact on when the key is omitted, and persists an explicit off", () => {
    const omitted = path.join(os.tmpdir(), `xvw-state-omit-${Date.now()}.json`);
    fs.writeFileSync(omitted, JSON.stringify({ bounds: { width: 800, height: 600 } }), "utf8");
    assert.equal(loadStore(omitted).compact, true);
    fs.unlinkSync(omitted);

    const off = path.join(os.tmpdir(), `xvw-state-off-${Date.now()}.json`);
    saveStore(off, { bounds: { width: 800, height: 600 }, compact: false, lastUrl: "" });
    assert.equal(loadStore(off).compact, false);
    const saved = JSON.parse(fs.readFileSync(off, "utf8"));
    assert.equal(saved.compact, false);
    fs.unlinkSync(off);
  });

  it("drops bounds that sit on no display", () => {
    const displays = [{ workArea: { x: 0, y: 0, width: 1280, height: 800 } }];
    const off = sanitizeBounds({ x: -8000, y: -8000, width: 700, height: 500 }, displays);
    assert.equal(off.width, 700);
    assert.equal(off.x, undefined);
  });

  it("drops auth/onboarding lastUrl so login is not restored on boot", () => {
    const file = path.join(os.tmpdir(), `xvw-state-auth-${Date.now()}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify({
        bounds: { width: 800, height: 600 },
        lastUrl: "https://x.com/i/jf/onboarding/web?mode=login",
      }),
      "utf8"
    );
    const loaded = loadStore(file);
    assert.equal(loaded.lastUrl, "");
    saveStore(file, { ...loaded, lastUrl: "https://x.com/i/flow/login" });
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(saved.lastUrl, "");
    fs.unlinkSync(file);
  });
});
