"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateConfiguration } = require("app-builder-lib/out/util/config/config");

const debug = { isEnabled: false, add() {} };

describe("electron-builder config", () => {
  it("accepts the v26 linux.desktop.entry shape used by this repo", async () => {
    const pkg = require("../package.json");
    assert.equal(pkg.license, "MIT");
    assert.deepEqual(pkg.build.mac.target, ["dmg", "zip"]);
    assert.deepEqual(pkg.build.win.target, ["nsis", "zip"]);
    assert.deepEqual(pkg.build.linux.target, ["AppImage", "zip"]);
    assert.equal(pkg.build.linux.desktop.entry.Name, "Unofficial 𝕏 (Twitter) Video Liberator");
    assert.equal(pkg.build.linux.desktop.entry.MimeType, "x-scheme-handler/xvw;");
    await validateConfiguration(pkg.build, debug);
  });

  it("rejects the pre-v26 linux.desktop Name/MimeType object", async () => {
    const pkg = require("../package.json");
    const bad = structuredClone(pkg.build);
    bad.linux.desktop = {
      Name: "Unofficial 𝕏 (Twitter) Video Liberator",
      MimeType: "x-scheme-handler/xvw;",
    };
    await assert.rejects(() => validateConfiguration(bad, debug), /desktop/i);
  });
});
