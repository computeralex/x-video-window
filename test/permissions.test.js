"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedPermission } = require("../src/main/permissions");
const { editMenuTemplate, editContextTemplate } = require("../src/main/edit-menu");

describe("isAllowedPermission", () => {
  it("allows media, fullscreen, and clipboard for the X session", () => {
    assert.equal(isAllowedPermission("media"), true);
    assert.equal(isAllowedPermission("fullscreen"), true);
    assert.equal(isAllowedPermission("clipboard-read"), true);
    assert.equal(isAllowedPermission("clipboard-sanitized-write"), true);
  });

  it("denies unrelated permissions", () => {
    assert.equal(isAllowedPermission("geolocation"), false);
    assert.equal(isAllowedPermission("notifications"), false);
    assert.equal(isAllowedPermission("openExternal"), false);
  });
});

describe("editMenuTemplate", () => {
  it("includes the standard edit roles including paste", () => {
    const roles = editMenuTemplate()
      .submenu.filter((item) => item.role)
      .map((item) => item.role);
    assert.deepEqual(roles, [
      "undo",
      "redo",
      "cut",
      "copy",
      "paste",
      "pasteAndMatchStyle",
      "selectAll",
    ]);
  });
});

describe("editContextTemplate", () => {
  it("offers paste on editable fields even when Chromium sets canPaste false", () => {
    const items = editContextTemplate(
      {
        isEditable: true,
        editFlags: { canPaste: false, canCut: false, canCopy: false, canSelectAll: true },
      },
      { isDestroyed: () => false, paste() {} }
    );
    const paste = items.find((item) => item.label === "Paste" || item.role === "paste");
    assert.ok(paste);
    assert.equal(typeof paste.click, "function");
  });
});
