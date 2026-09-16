"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  mediaKeyFromUrl,
  isLiveSnapshot,
  shouldPersistPosition,
  resumeSeconds,
  upsertPosition,
} = require("../src/main/playback");
const {
  loadPlaybackStore,
  savePlaybackStore,
  rememberPosition,
} = require("../src/main/playback-store");

describe("mediaKeyFromUrl", () => {
  it("keys status, broadcast, and space URLs", () => {
    assert.equal(
      mediaKeyFromUrl("https://x.com/SpaceX/status/1949680387330027593"),
      "status:1949680387330027593"
    );
    assert.equal(
      mediaKeyFromUrl("https://x.com/i/status/1814440131505598541?s=20"),
      "status:1814440131505598541"
    );
    assert.equal(
      mediaKeyFromUrl("https://x.com/i/broadcasts/1AxRnZbVpjaxl?s=20"),
      "broadcast:1AxRnZbVpjaxl"
    );
    assert.equal(mediaKeyFromUrl("https://x.com/i/spaces/1YqGoAeNyoLG"), "space:1YqGoAeNyoLG");
  });

  it("returns empty for home or invalid URLs", () => {
    assert.equal(mediaKeyFromUrl("https://x.com/home"), "");
    assert.equal(mediaKeyFromUrl("not a url"), "");
  });
});

describe("resume rules", () => {
  it("skips live snapshots and start/end of VOD", () => {
    assert.equal(isLiveSnapshot({ live: true, duration: 0 }), true);
    assert.equal(isLiveSnapshot({ duration: Infinity }), true);
    assert.equal(shouldPersistPosition({ seconds: 40, duration: 180, live: false }), true);
    assert.equal(shouldPersistPosition({ seconds: 1, duration: 180, live: false }), false);
    assert.equal(shouldPersistPosition({ seconds: 179, duration: 180, live: false }), false);
    assert.equal(shouldPersistPosition({ seconds: 40, duration: 0, live: true }), false);
  });

  it("clamps a stored position for restore", () => {
    assert.equal(resumeSeconds({ seconds: 42, duration: 180 }, 180), 42);
    assert.equal(resumeSeconds({ seconds: 1, duration: 180 }, 180), 0);
    assert.equal(resumeSeconds({ seconds: 40, duration: 180, live: true }, 180), 0);
  });

  it("round-trips a VOD position on disk", () => {
    const file = path.join(os.tmpdir(), `xvw-playback-${Date.now()}.json`);
    let store = rememberPosition({ positions: {} }, "status:1949680387330027593", {
      seconds: 55,
      duration: 200,
      live: false,
      updatedAt: 100,
    });
    savePlaybackStore(file, store);
    store = loadPlaybackStore(file);
    assert.equal(store.positions["status:1949680387330027593"].seconds, 55);
    store = rememberPosition(store, "status:1949680387330027593", {
      seconds: 1,
      duration: 200,
      live: false,
    });
    assert.equal(store.positions["status:1949680387330027593"], undefined);
    const live = upsertPosition({}, "broadcast:1AxRnZbVpjaxl", {
      seconds: 10,
      duration: 0,
      live: true,
    });
    assert.equal(live["broadcast:1AxRnZbVpjaxl"], undefined);
    fs.unlinkSync(file);
  });
});
