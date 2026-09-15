"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("xvwLogin", {
  done: () => ipcRenderer.invoke("login-done"),
});
