"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  app,
  BrowserWindow,
  Menu,
  clipboard,
  ipcMain,
  session,
  screen,
  nativeTheme,
  shell,
} = require("electron");

const { parseXUrl } = require("./parse-url");
const { isAllowedNavigation } = require("./allowed");
const { isAuthUrl, persistedLastUrl } = require("./auth");
const { loadStore, saveStore, sanitizeBounds } = require("./store");
const { createLoginWindow } = require("./login-window");
const { applySessionPermissions } = require("./permissions");
const { editMenuTemplate } = require("./edit-menu");
const {
  CUSTOM_SCHEME,
  parseIncoming,
  parseIncomingArg,
  firstIncomingFromArgv,
} = require("./incoming-url");
const { PRODUCT_NAME } = require("./brand");
const {
  mediaKeyFromUrl,
  resumeSeconds,
  shouldPersistPosition,
  shouldHoldExistingResume,
} = require("./playback");
const {
  loadPlaybackStore,
  savePlaybackStore,
  rememberPosition,
} = require("./playback-store");

const PARTITION = "persist:x-session";

nativeTheme.themeSource = "dark";
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
if (process.platform === "win32") {
  app.setAppUserModelId("com.computeralex.xvideowindow");
}

const injectCss = fs.readFileSync(path.join(__dirname, "../inject/focus.css"), "utf8");
const injectJs = fs.readFileSync(path.join(__dirname, "../inject/focus.js"), "utf8");

let mainWindow = null;
let guestContents = null;
let loginSession = null;
let state = null;
let storePath = null;
let saveTimer = null;
let pendingIncoming = null;
let maximizeFallback = false;
let playbackPath = null;
let playback = { version: 1, positions: {} };
let playbackTimer = null;
let resumeLock = null;
const guardedGuests = new WeakSet();
const insertedCssKeys = new WeakMap();

function persistSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 200);
}

function persistNow() {
  if (!state || !storePath) return;
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) {
    const bounds = mainWindow.getBounds();
    state.bounds = bounds;
  }
  saveStore(storePath, state);
  persistPlaybackNow();
}

function persistPlaybackSoon() {
  clearTimeout(playbackTimer);
  playbackTimer = setTimeout(persistPlaybackNow, 250);
}

function persistPlaybackNow() {
  if (!playbackPath) return;
  savePlaybackStore(playbackPath, playback);
}

function rememberMediaPosition(href, snapshot, opts = {}) {
  const key = mediaKeyFromUrl(href || snapshot?.href);
  if (!key) return { ok: false };
  const record = {
    seconds: Number(snapshot?.currentTime) || 0,
    duration: Number(snapshot?.duration) || 0,
    live: Boolean(snapshot?.live),
    updatedAt: Date.now(),
  };
  if (
    !opts.force &&
    resumeLock &&
    resumeLock.key === key &&
    shouldHoldExistingResume(resumeLock, record.seconds)
  ) {
    return { ok: true, saved: false, key, held: true };
  }
  if (
    resumeLock &&
    resumeLock.key === key &&
    !shouldHoldExistingResume(resumeLock, record.seconds)
  ) {
    resumeLock.released = true;
  }
  if (!shouldPersistPosition(record)) {
    return { ok: true, saved: false, key };
  }
  playback = rememberPosition(playback, key, record);
  if (opts.force) persistPlaybackNow();
  else persistPlaybackSoon();
  return { ok: true, saved: true, key };
}

function lookupResume(href) {
  const key = mediaKeyFromUrl(href);
  if (!key) return { ok: false, seconds: 0 };
  const record = playback.positions[key];
  const seconds = resumeSeconds(record, record?.duration);
  if (seconds) {
    resumeLock = { key, seconds, until: Date.now() + 15000, released: false };
  }
  return { ok: Boolean(seconds), key, seconds, live: Boolean(record?.live) };
}

function chromeUserAgent() {
  const base = session.defaultSession.getUserAgent();
  const chrome = (base.match(/Chrome\/[\d.]+/) || ["Chrome/134.0.0.0"])[0];
  const safari = (base.match(/Safari\/[\d.]+/) || ["Safari/537.36"])[0];
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ${chrome} ${safari}`;
}

function sendState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("state", publicState());
  }
}

function publicState() {
  return {
    alwaysOnTop: Boolean(state?.alwaysOnTop),
    compact: state?.compact !== false,
    lastUrl: persistedLastUrl(state?.lastUrl),
    fullscreen: isAppFullscreen(),
  };
}

function isAppFullscreen() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  return Boolean(mainWindow.isFullScreen() || maximizeFallback);
}

function applyGuestTheater() {
  if (!guestContents || guestContents.isDestroyed()) return;
  guestContents
    .executeJavaScript(
      `window.__xvwFillVideo ? window.__xvwFillVideo() : true`,
      true
    )
    .catch(() => {});
}

function sendFullscreen(on) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("fullscreen-changed", Boolean(on));
  }
  sendState();
}

function setAppFullscreen(on) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, error: "Window is not ready." };
  }

  const want = Boolean(on);
  if (!want) {
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    if (maximizeFallback) {
      maximizeFallback = false;
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
    }
    sendFullscreen(false);
    return { ok: true, fullscreen: false, mode: "os" };
  }

  // Native window fullscreen — reliable with the X webview. Guest
  // requestFullscreen is flaky in Electron webviews (Linux especially).
  mainWindow.setFullScreen(true);
  applyGuestTheater();

  if (mainWindow.isFullScreen()) {
    sendFullscreen(true);
    return { ok: true, fullscreen: true, mode: "os" };
  }

  // Some WMs apply fullscreen asynchronously; treat the request as success
  // unless we can already see it failed and maximize as an in-window theater.
  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isFullScreen()) {
      sendFullscreen(true);
      return;
    }
    maximizeFallback = true;
    mainWindow.maximize();
    applyGuestTheater();
    sendFullscreen(true);
  }, 400);

  return { ok: true, fullscreen: true, mode: "os" };
}

function toggleAppFullscreen() {
  return setAppFullscreen(!isAppFullscreen());
}

function deliverIncoming(parsed) {
  if (!parsed?.ok || !parsed.loadUrl) return false;
  if (isAuthUrl(parsed.loadUrl)) return false;
  if (state) {
    state.lastUrl = parsed.loadUrl;
    persistSoon();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("open-load-url", parsed);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return true;
  }
  pendingIncoming = parsed;
  return true;
}

function registerProtocolClient() {
  if (process.defaultApp) {
    const appPath = path.resolve(process.argv[1] || ".");
    app.setAsDefaultProtocolClient(CUSTOM_SCHEME, process.execPath, [appPath]);
  } else {
    app.setAsDefaultProtocolClient(CUSTOM_SCHEME);
  }
}

async function removeFocusCss(contents) {
  const keys = insertedCssKeys.get(contents) || [];
  for (const key of keys) {
    try {
      await contents.removeInsertedCSS(key);
    } catch {
      // already gone
    }
  }
  insertedCssKeys.set(contents, []);
}

async function injectGuest(contents) {
  if (!contents || contents.isDestroyed()) return;
  const url = contents.getURL();
  if (!url || url === "about:blank" || isAuthUrl(url)) {
    await removeFocusCss(contents);
    return;
  }
  try {
    await removeFocusCss(contents);
    const key = await contents.insertCSS(injectCss);
    insertedCssKeys.set(contents, key ? [key] : []);
    const compact = state?.compact !== false;
    await contents.executeJavaScript(
      `${injectJs}\nwindow.__xvwSetCompact(${compact ? "true" : "false"});`,
      true
    );
  } catch {
    // Guest may have navigated away mid-inject.
  }
}

function attachGuestGuards(contents) {
  if (!contents || guardedGuests.has(contents)) {
    guestContents = contents || guestContents;
    return;
  }
  guardedGuests.add(contents);
  guestContents = contents;

  contents.on("destroyed", () => {
    if (guestContents === contents) guestContents = null;
  });

  contents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url)) {
      console.warn("[xvw] blocked navigation:", url);
      event.preventDefault();
    }
  });

  contents.on("will-redirect", (event, url) => {
    if (!isAllowedNavigation(url)) {
      console.warn("[xvw] blocked redirect:", url);
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      contents.loadURL(url);
    }
    return { action: "deny" };
  });

  contents.on("dom-ready", () => {
    injectGuest(contents);
  });
  contents.on("did-stop-loading", () => {
    injectGuest(contents);
  });
  contents.on("before-input-event", handleAccelerators);
  applySessionPermissions(contents.session);
}

function resolveOpen(text) {
  const parsed = parseXUrl(text);
  if (!parsed.ok) return parsed;
  if (!isAllowedNavigation(parsed.loadUrl)) {
    return { ok: false, error: "That link is not allowed in this app." };
  }
  if (!isAuthUrl(parsed.loadUrl)) {
    state.lastUrl = parsed.loadUrl;
    persistSoon();
  }
  return parsed;
}

function openSignInWindow() {
  if (loginSession?.window && !loginSession.window.isDestroyed()) {
    loginSession.window.focus();
    return { ok: true };
  }

  loginSession = createLoginWindow({
    partition: PARTITION,
    userAgent: chromeUserAgent(),
    onComplete: (reason) => {
      loginSession = null;
      if (reason === "signed-in" || reason === "done") {
        mainWindow?.webContents.send("signin-complete");
      }
    },
  });
  return { ok: true };
}

function createMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            role: "appMenu",
            label: app.name,
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open Video…",
          accelerator: "CmdOrCtrl+L",
          click: () => mainWindow?.webContents.send("open-video-prompt"),
        },
        {
          label: "Open from Clipboard",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            const result = resolveOpen(clipboard.readText());
            if (result.ok && mainWindow) {
              mainWindow.webContents.send("open-load-url", result);
            }
          },
        },
        {
          label: "Sign in to X",
          click: () => openSignInWindow(),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    editMenuTemplate(),
    {
      label: "View",
      submenu: [
        {
          label: "Always on Top",
          type: "checkbox",
          checked: Boolean(state.alwaysOnTop),
          accelerator: "CmdOrCtrl+Shift+T",
          click: (item) => {
            if (!mainWindow) return;
            state.alwaysOnTop = item.checked;
            mainWindow.setAlwaysOnTop(item.checked);
            persistSoon();
            sendState();
          },
        },
        {
          label: "Focus video (hide X chrome)",
          type: "checkbox",
          checked: state.compact !== false,
          click: (item) => {
            state.compact = item.checked;
            persistSoon();
            if (guestContents && !guestContents.isDestroyed() && !isAuthUrl(guestContents.getURL())) {
              guestContents.executeJavaScript(
                `window.__xvwSetCompact && window.__xvwSetCompact(${item.checked ? "true" : "false"})`,
                true
              );
            }
            sendState();
          },
        },
        {
          label: "Toggle Fullscreen",
          click: () => toggleAppFullscreen(),
        },
        { type: "separator" },
        { role: "reload" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }],
    },
    {
      role: "help",
      submenu: [
        {
          label: "How to use",
          click: () => mainWindow?.webContents.send("toggle-help"),
        },
        {
          label: "X on the web",
          click: () => shell.openExternal("https://x.com"),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function handleAccelerators(event, input) {
  if (input.type !== "keyDown" || !mainWindow || mainWindow.isDestroyed()) return;
  const ctrl = Boolean(input.control || input.meta);
  // Never steal clipboard shortcuts (Cmd/Ctrl+V/C/X/A) — needed for Sign in.
  if (ctrl && ["c", "v", "x", "a", "z", "y"].includes(String(input.key).toLowerCase())) {
    return;
  }
  if (input.key === "Escape" && isAppFullscreen()) {
    setAppFullscreen(false);
    event.preventDefault();
    return;
  }
  if (input.key === "F1") {
    mainWindow.webContents.send("toggle-help");
    event.preventDefault();
  }
  if (input.key === "F11") {
    mainWindow.webContents.send("toggle-toolbar");
    event.preventDefault();
  }
  if (ctrl && input.key.toLowerCase() === "l") {
    mainWindow.webContents.send("open-video-prompt");
    event.preventDefault();
  }
  if (input.key === "F8") {
    toggleAppFullscreen();
    event.preventDefault();
  }
}

function createWindow() {
  const displays = screen.getAllDisplays();
  const bounds = sanitizeBounds(state.bounds, displays);
  const iconPath = path.join(__dirname, "../../assets/icon.png");

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 480,
    minHeight: 320,
    backgroundColor: "#050505",
    show: false,
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    title: PRODUCT_NAME,
    frame: process.platform === "darwin",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      spellcheck: false,
    },
  });

  mainWindow.setAlwaysOnTop(Boolean(state.alwaysOnTop));

  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("before-input-event", handleAccelerators);

  mainWindow.on("enter-full-screen", () => {
    sendFullscreen(true);
    applyGuestTheater();
  });
  mainWindow.on("leave-full-screen", () => {
    maximizeFallback = false;
    sendFullscreen(false);
  });
  mainWindow.on("resize", persistSoon);
  mainWindow.on("move", persistSoon);
  mainWindow.on("close", () => {
    if (guestContents && !guestContents.isDestroyed()) {
      guestContents
        .executeJavaScript(
          `window.__xvwMediaSnapshot ? window.__xvwMediaSnapshot() : null`,
          true
        )
        .then((snap) => {
          if (snap) rememberMediaPosition(snap.href, snap);
          persistPlaybackNow();
        })
        .catch(() => {});
    }
    persistNow();
    if (loginSession?.window && !loginSession.window.isDestroyed()) {
      loginSession.window.close();
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (pendingIncoming) {
      const incoming = pendingIncoming;
      pendingIncoming = null;
      deliverIncoming(incoming);
    }
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

function registerIpc() {
  ipcMain.handle("get-state", () => publicState());

  ipcMain.handle("get-focus-assets", () => ({
    css: injectCss,
    js: injectJs,
    compact: state?.compact !== false,
  }));

  ipcMain.handle("open-sign-in", () => openSignInWindow());

  ipcMain.handle("login-done", () => {
    loginSession?.done();
  });

  ipcMain.handle("is-auth-url", (_event, url) => isAuthUrl(url));

  ipcMain.handle("open-url", (_event, text) => resolveOpen(text));

  ipcMain.handle("paste-and-open", () => resolveOpen(clipboard.readText()));

  ipcMain.handle("set-always-on-top", (_event, value) => {
    state.alwaysOnTop = Boolean(value);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(state.alwaysOnTop);
    }
    persistSoon();
    return state.alwaysOnTop;
  });

  ipcMain.handle("set-compact", async (_event, value) => {
    state.compact = Boolean(value);
    persistSoon();
    if (guestContents && !guestContents.isDestroyed() && !isAuthUrl(guestContents.getURL())) {
      try {
        await guestContents.executeJavaScript(
          `window.__xvwSetCompact && window.__xvwSetCompact(${state.compact ? "true" : "false"})`,
          true
        );
      } catch {
        // ignore
      }
    }
    return state.compact;
  });

  ipcMain.handle("remember-url", (_event, url) => {
    if (typeof url !== "string") return;
    if (!isAllowedNavigation(url) || isAuthUrl(url)) {
      if (isAuthUrl(state.lastUrl)) {
        state.lastUrl = "";
        persistSoon();
      }
      return;
    }
    state.lastUrl = url;
    persistSoon();
  });

  ipcMain.handle("toggle-fullscreen", () => toggleAppFullscreen());
  ipcMain.handle("set-fullscreen", (_event, value) => setAppFullscreen(Boolean(value)));

  ipcMain.handle("remember-playback", (_event, payload) => {
    const href = typeof payload?.href === "string" ? payload.href : "";
    return rememberMediaPosition(href, payload);
  });

  ipcMain.handle("get-playback", (_event, href) => lookupResume(href));

  ipcMain.handle("media-command", async (_event, cmd) => {
    if (!guestContents || guestContents.isDestroyed()) {
      return { ok: false, error: "No video yet." };
    }
    try {
      const result = await guestContents.executeJavaScript(
        `window.__xvwMediaCommand ? window.__xvwMediaCommand(${JSON.stringify(cmd || {})}) : { ok: false }`,
        true
      );
      if (result?.href) rememberMediaPosition(result.href, result, { force: true });
      return result || { ok: false };
    } catch {
      return { ok: false, error: "Could not control playback." };
    }
  });

  ipcMain.handle("window-control", (_event, action) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (action === "min") mainWindow.minimize();
    if (action === "max") {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
    if (action === "close") mainWindow.close();
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const incoming = firstIncomingFromArgv(argv);
    if (incoming) deliverIncoming(incoming);
    else if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  deliverIncoming(parseIncoming(url));
});

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  deliverIncoming(parseIncomingArg(filePath));
});

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;
  app.setName(PRODUCT_NAME);
  registerProtocolClient();
  storePath = path.join(app.getPath("userData"), "window-state.json");
  playbackPath = path.join(app.getPath("userData"), "playback.json");
  state = loadStore(storePath);
  playback = loadPlaybackStore(playbackPath);
  if (state.lastUrl !== persistedLastUrl(state.lastUrl)) {
    state.lastUrl = "";
  }
  const launchIncoming = firstIncomingFromArgv(process.argv);
  if (launchIncoming) {
    state.lastUrl = launchIncoming.loadUrl;
    pendingIncoming = launchIncoming;
  }
  persistNow();

  const xSession = session.fromPartition(PARTITION);
  xSession.setUserAgent(chromeUserAgent());
  applySessionPermissions(xSession);

  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event, webPreferences, params) => {
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      webPreferences.javascript = true;
      webPreferences.preload = path.join(__dirname, "../preload/guest-preload.js");
      webPreferences.partition = PARTITION;
      const src = params.src || "";
      if (src && src !== "about:blank" && !isAllowedNavigation(src)) {
        event.preventDefault();
      }
    });

    contents.on("did-attach-webview", (_attachEvent, guest) => {
      attachGuestGuards(guest);
    });

    if (contents.getType() === "webview") {
      attachGuestGuards(contents);
    }
  });

  registerIpc();
  createMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  persistNow();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", persistNow);
