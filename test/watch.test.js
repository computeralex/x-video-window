"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isWatchPath } = require("../src/main/watch");
const { isAuthPath } = require("../src/main/auth");

describe("isWatchPath", () => {
  it("matches broadcasts, spaces, and status videos", () => {
    assert.equal(isWatchPath("/i/broadcasts/1AxRnZbVpjaxl"), true);
    assert.equal(isWatchPath("/i/spaces/1YqGoAeNyoLG"), true);
    assert.equal(isWatchPath("/i/status/1949680387330027593"), true);
    assert.equal(isWatchPath("/SpaceX/status/1949680387330027593"), true);
    assert.equal(isWatchPath("/i/web/status/1814440131505598541"), true);
  });

  it("does not treat home or auth paths as watch pages", () => {
    assert.equal(isWatchPath("/home"), false);
    assert.equal(isWatchPath("/i/flow/login"), false);
    assert.equal(isWatchPath("/i/jf/onboarding/web"), false);
    assert.equal(isAuthPath("/i/jf/onboarding/web", "?mode=login"), true);
    assert.equal(isAuthPath("/i/broadcasts/1AxRnZbVpjaxl", ""), false);
  });
});
