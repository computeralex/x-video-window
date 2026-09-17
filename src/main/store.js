"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { persistedLastUrl } = require("./auth");

const DEFAULTS = {
  bounds: { width: 960, height: 640, x: undefined, y: undefined },
  alwaysOnTop: false,
  compact: true,
  lastUrl: "",
};

function loadStore(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      bounds: { ...DEFAULTS.bounds, ...(parsed.bounds || {}) },
      alwaysOnTop: Boolean(parsed.alwaysOnTop),
      compact: parsed.compact !== false,
      lastUrl: persistedLastUrl(typeof parsed.lastUrl === "string" ? parsed.lastUrl : ""),
    };
  } catch {
    return { ...DEFAULTS, bounds: { ...DEFAULTS.bounds } };
  }
}

function saveStore(filePath, state) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = {
    bounds: state.bounds,
    alwaysOnTop: Boolean(state.alwaysOnTop),
    compact: state.compact !== false,
    lastUrl: persistedLastUrl(state.lastUrl),
  };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function sanitizeBounds(bounds, displays) {
  const width = clamp(Math.round(bounds?.width || DEFAULTS.bounds.width), 480, 4000);
  const height = clamp(Math.round(bounds?.height || DEFAULTS.bounds.height), 320, 3000);
  const x = Number.isFinite(bounds?.x) ? Math.round(bounds.x) : undefined;
  const y = Number.isFinite(bounds?.y) ? Math.round(bounds.y) : undefined;

  if (x == null || y == null || !displays?.length) {
    return { width, height };
  }

  const visible = displays.some((d) => {
    const area = d.workArea || d.bounds;
    return (
      x + width > area.x &&
      y + height > area.y &&
      x < area.x + area.width &&
      y < area.y + area.height
    );
  });

  if (!visible) {
    return { width, height };
  }

  return { width, height, x, y };
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

module.exports = {
  DEFAULTS,
  loadStore,
  saveStore,
  sanitizeBounds,
};
