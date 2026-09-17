"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { upsertPosition } = require("./playback");

function emptyStore() {
  return { version: 1, positions: {} };
}

function loadPlaybackStore(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const positions =
      parsed && parsed.positions && typeof parsed.positions === "object" ? parsed.positions : {};
    return { version: 1, positions };
  } catch {
    return emptyStore();
  }
}

function savePlaybackStore(filePath, store) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = {
    version: 1,
    positions: store?.positions && typeof store.positions === "object" ? store.positions : {},
  };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function rememberPosition(store, key, record) {
  const next = {
    version: 1,
    positions: upsertPosition(store?.positions, key, record),
  };
  return next;
}

module.exports = {
  emptyStore,
  loadPlaybackStore,
  savePlaybackStore,
  rememberPosition,
};
