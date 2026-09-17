"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "install.sh");

function runInstall(env) {
  return spawnSync("bash", [SCRIPT], {
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env, XVW_SKIP_XDG: "1", ...env },
  });
}

describe("install.sh", () => {
  it("installs the AppImage and writes a desktop entry", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xvw-install-"));
    const binDir = path.join(dir, "bin");
    const desktopDir = path.join(dir, "applications");
    const asset = path.join(dir, "x-video-window-1.0.0-linux-x64.AppImage");
    const payload = "FAKE-APPIMAGE\n";
    fs.writeFileSync(asset, payload);
    const release = path.join(dir, "release.json");
    fs.writeFileSync(
      release,
      JSON.stringify({
        tag_name: "v1.0.0",
        assets: [
          {
            name: "x-video-window-1.0.0-linux-x64.AppImage",
            browser_download_url: `file://${asset}`,
          },
        ],
      })
    );
    const result = runInstall({
      XVW_RELEASE_JSON: release,
      XVW_INSTALL_DIR: binDir,
      XVW_DESKTOP_DIR: desktopDir,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const dest = path.join(binDir, "x-video-window");
    assert.equal(fs.readFileSync(dest, "utf8"), payload);
    const mode = fs.statSync(dest).mode;
    assert.ok(mode & 0o111, "installed file should be executable");
    const desktop = fs.readFileSync(path.join(desktopDir, "x-video-window.desktop"), "utf8");
    assert.match(desktop, /Name=Unofficial 𝕏 \(Twitter\) Video Liberator/);
    assert.match(desktop, /MimeType=x-scheme-handler\/xvw;/);
    assert.match(desktop, new RegExp(`Exec=${dest} %u`));
  });

  it("fails clearly when the latest release has no AppImage", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xvw-install-empty-"));
    const release = path.join(dir, "release.json");
    fs.writeFileSync(release, JSON.stringify({ tag_name: "v0.0.1", assets: [] }));
    const result = runInstall({
      XVW_RELEASE_JSON: release,
      XVW_INSTALL_DIR: path.join(dir, "bin"),
      XVW_DESKTOP_DIR: path.join(dir, "applications"),
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no Linux AppImage/i);
  });

  it("fails clearly when GitHub has no release", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xvw-install-404-"));
    const result = runInstall({
      XVW_API_BASE: "http://127.0.0.1:1",
      XVW_INSTALL_DIR: path.join(dir, "bin"),
      XVW_DESKTOP_DIR: path.join(dir, "applications"),
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no GitHub Release found/i);
  });
});
