"use strict";

/**
 * User-facing product name. Locked string — use this everywhere chrome,
 * menus, packaging, and docs show a name.
 *
 * Under the hood stays x-video-window / xvw: / persist:x-session.
 * macOS CFBundleName uses PRODUCT_SHORT_NAME only (menu/Dock truncation).
 */

const PRODUCT_NAME = "Unofficial 𝕏 (Twitter) Video Liberator";
const PRODUCT_SHORT_NAME = "𝕏 Video Liberator";

module.exports = {
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
};
