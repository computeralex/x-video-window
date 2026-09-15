"use strict";

/**
 * Isolated guest preload: only pings the embedder when the user moves
 * the mouse over the X page so the cinema toolbar can appear.
 */
const { ipcRenderer } = require("electron");

function ping() {
  try {
    ipcRenderer.sendToHost("xvw-activity");
  } catch {
    // embedder may not be listening yet
  }
}

window.addEventListener("mousemove", ping, { passive: true });
window.addEventListener("mousedown", ping, { passive: true });
window.addEventListener("wheel", ping, { passive: true });
window.addEventListener("keydown", ping, { passive: true });
