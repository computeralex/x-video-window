"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("xvw", {
  platform: process.platform,
  getState: () => ipcRenderer.invoke("get-state"),
  getFocusAssets: () => ipcRenderer.invoke("get-focus-assets"),
  openUrl: (url) => ipcRenderer.invoke("open-url", url),
  openSignIn: () => ipcRenderer.invoke("open-sign-in"),
  isAuthUrl: (url) => ipcRenderer.invoke("is-auth-url", url),
  pasteAndOpen: () => ipcRenderer.invoke("paste-and-open"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("set-always-on-top", value),
  setCompact: (value) => ipcRenderer.invoke("set-compact", value),
  rememberUrl: (url) => ipcRenderer.invoke("remember-url", url),
  toggleFullscreen: () => ipcRenderer.invoke("toggle-fullscreen"),
  setFullscreen: (value) => ipcRenderer.invoke("set-fullscreen", value),
  windowControl: (action) => ipcRenderer.invoke("window-control", action),
  rememberPlayback: (payload) => ipcRenderer.invoke("remember-playback", payload),
  getPlayback: (href) => ipcRenderer.invoke("get-playback", href),
  mediaCommand: (cmd) => ipcRenderer.invoke("media-command", cmd),
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
  onToggleToolbar: (callback) => {
    ipcRenderer.on("toggle-toolbar", () => callback());
  },
  onOpenVideoPrompt: (callback) => {
    ipcRenderer.on("open-video-prompt", () => callback());
  },
  onFullscreen: (callback) => {
    ipcRenderer.on("fullscreen-changed", (_event, value) => callback(value));
  },
  onSignInComplete: (callback) => {
    ipcRenderer.on("signin-complete", () => callback());
  },
});
