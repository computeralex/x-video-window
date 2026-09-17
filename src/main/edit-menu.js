"use strict";

/**
 * Standard Edit submenu. On macOS Electron, Cmd+V in BrowserWindow inputs
 * does nothing unless these roles exist on the application menu.
 */
function editMenuTemplate() {
  return {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "pasteAndMatchStyle" },
      { role: "selectAll" },
    ],
  };
}

function editContextTemplate(params, contents) {
  if (params.isEditable) {
    const flags = params.editFlags || {};
    return [
      { role: "undo", enabled: flags.canUndo !== false },
      { role: "redo", enabled: flags.canRedo !== false },
      { type: "separator" },
      { role: "cut", enabled: Boolean(flags.canCut) },
      { role: "copy", enabled: Boolean(flags.canCopy) },
      {
        // Password fields often report canPaste=false; still paste into the guest.
        label: "Paste",
        accelerator: "CmdOrCtrl+V",
        click: () => {
          if (contents && !contents.isDestroyed()) contents.paste();
        },
      },
      { role: "pasteAndMatchStyle" },
      { role: "selectAll", enabled: flags.canSelectAll !== false },
    ];
  }
  if (params.selectionText) {
    return [{ role: "copy" }];
  }
  return [];
}

function attachEditContextMenu(contents, win) {
  contents.on("context-menu", (_event, params) => {
    const template = editContextTemplate(params, contents);
    if (!template.length) return;
    const { Menu } = require("electron");
    Menu.buildFromTemplate(template).popup({ window: win });
  });
}

module.exports = {
  editMenuTemplate,
  editContextTemplate,
  attachEditContextMenu,
};
