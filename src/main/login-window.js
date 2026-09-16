"use strict";

const path = require("node:path");
const { BrowserWindow, Menu, WebContentsView } = require("electron");
const { isAllowedNavigation } = require("./allowed");
const { isAuthUrl, isSignedInLanding } = require("./auth");
const { editMenuTemplate, attachEditContextMenu } = require("./edit-menu");
const { PRODUCT_NAME } = require("./brand");

const SIGN_IN_URL = "https://x.com/i/flow/login";
const TOOLBAR_H = 48;

function attachLoginGuards(contents, { onBlocked, onUrl }) {
  const blockIfNeeded = (event, url) => {
    if (isAllowedNavigation(url)) {
      onUrl?.(url);
      return;
    }
    onBlocked?.(url);
    event.preventDefault();
  };

  contents.on("will-navigate", blockIfNeeded);
  contents.on("will-redirect", blockIfNeeded);
  contents.on("did-navigate", (_event, url) => onUrl?.(url));
  contents.on("did-navigate-in-page", (_event, url) => onUrl?.(url));

  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      contents.loadURL(url);
      onUrl?.(url);
    } else {
      onBlocked?.(url);
    }
    return { action: "deny" };
  });
}

function layoutView(win, view) {
  if (!win || win.isDestroyed()) return;
  const [width, height] = win.getContentSize();
  view.setBounds({
    x: 0,
    y: TOOLBAR_H,
    width,
    height: Math.max(80, height - TOOLBAR_H),
  });
}

function createLoginWindow({ partition, userAgent, onComplete }) {
  let settled = false;
  let seenAuth = false;
  let closeTimer = null;

  const win = new BrowserWindow({
    width: 560,
    height: 780,
    minWidth: 420,
    minHeight: 520,
    title: `Sign in — ${PRODUCT_NAME}`,
    backgroundColor: "#050505",
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/login-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });

  const view = new WebContentsView({
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      javascript: true,
    },
  });

  if (userAgent) {
    view.webContents.setUserAgent(userAgent);
  }

  win.contentView.addChildView(view);
  layoutView(win, view);

  const finish = (reason) => {
    if (settled) return;
    settled = true;
    clearTimeout(closeTimer);
    try {
      if (!win.isDestroyed()) win.close();
    } catch {
      // already closing
    }
    onComplete?.(reason);
  };

  const onUrl = (url) => {
    if (!url || url === "about:blank") return;
    if (isAuthUrl(url)) {
      seenAuth = true;
      clearTimeout(closeTimer);
      closeTimer = null;
      return;
    }
    if (!seenAuth) return;
    if (!isSignedInLanding(url)) return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => finish("signed-in"), 700);
  };

  const onBlocked = (url) => {
    console.warn("[xvw] blocked login navigation:", url);
  };

  attachLoginGuards(view.webContents, { onBlocked, onUrl });
  attachEditContextMenu(view.webContents, win);

  // Dedicated Sign-in window: expose Edit (paste) even when the app menu is hidden.
  win.setMenu(
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [{ role: "close" }],
      },
      editMenuTemplate(),
    ])
  );

  win.on("resize", () => layoutView(win, view));
  win.on("closed", () => {
    if (!settled) {
      settled = true;
      onComplete?.("closed");
    }
  });

  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  // Do not attach before-input-event handlers here — Cmd/Ctrl+V must reach
  // the login form's password and text fields.

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
    view.webContents.focus();
  });

  win.loadFile(path.join(__dirname, "../renderer/login.html"));
  view.webContents.loadURL(SIGN_IN_URL);

  return {
    window: win,
    view,
    done: () => finish("done"),
  };
}

module.exports = {
  createLoginWindow,
  SIGN_IN_URL,
  TOOLBAR_H,
};
