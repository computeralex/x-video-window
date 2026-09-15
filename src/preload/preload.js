"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("xvw", {
  platform: process.platform,
  getState: () => ipcRenderer.invoke("get-state"),
  openUrl: (url) => ipcRenderer.invoke("open-url", url),
  pasteAndOpen: () => ipcRenderer.invoke("paste-and-open"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("set-always-on-top", value),
  setCompact: (value) => ipcRenderer.invoke("set-compact", value),
  rememberUrl: (url) => ipcRenderer.invoke("remember-url", url),
  windowControl: (action) => ipcRenderer.invoke("window-control", action),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("state", listener);
    return () => ipcRenderer.removeListener("state", listener);
  },
  onOpenLoadUrl: (callback) => {
    ipcRenderer.on("open-load-url", (_event, result) => callback(result));
  },
  onToggleHelp: (callback) => {
    ipcRenderer.on("toggle-help", () => callback());
  },
});
