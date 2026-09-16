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
  alreadyAtResume,
  shouldHoldExistingResume,
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

  it("compares currentTime to the saved resume with parentheses, not || precedence", () => {
    assert.equal(alreadyAtResume(8, 8), true);
    assert.equal(alreadyAtResume(8.4, 8), true);
    assert.equal(alreadyAtResume(1.2, 8), false);
    assert.equal(alreadyAtResume(0, 8), false);
    assert.equal(alreadyAtResume(19, 8), false);
    // The broken form `Number(t) || 0 - saved` treats 1.2 as already-there.
    const broken = Math.abs(Number(1.2) || 0 - 8) <= 1.5;
    assert.equal(broken, true);
    assert.equal(alreadyAtResume(1.2, 8), false);
  });

  it("holds the disk position against autoplay-from-zero until restore sticks", () => {
    const lock = { key: "status:1", seconds: 8, until: 10_000, released: false };
    assert.equal(shouldHoldExistingResume(lock, 0.4, 1000), true);
    assert.equal(shouldHoldExistingResume(lock, 14, 1000), true);
    assert.equal(shouldHoldExistingResume(lock, 8.1, 1000), false);
    assert.equal(shouldHoldExistingResume({ ...lock, released: true }, 14, 1000), false);
    assert.equal(shouldHoldExistingResume(lock, 14, 20_000), false);
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
