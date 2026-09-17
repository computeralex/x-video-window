"use strict";

/**
 * Session permissions for persist:x-session (player webview + Sign-in window).
 * Clipboard must be allowed so password managers / Cmd+V can fill login fields.
 */
const ALLOWED_PERMISSIONS = new Set([
  "media",
  "fullscreen",
  "clipboard-read",
  "clipboard-sanitized-write",
]);

function isAllowedPermission(permission) {
  return ALLOWED_PERMISSIONS.has(permission);
}

function applySessionPermissions(ses) {
  if (!ses) return;
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(isAllowedPermission(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) => isAllowedPermission(permission));
}

module.exports = {
  ALLOWED_PERMISSIONS,
  isAllowedPermission,
  applySessionPermissions,
};
