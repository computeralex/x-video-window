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
const { loadStore, saveStore, sanitizeBounds } = require("./store");

const SIGN_IN_URL = "https://x.com/i/flow/login";
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
let state = null;
let storePath = null;
let saveTimer = null;
const guardedGuests = new WeakSet();

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
}

function chromeUserAgent() {
  return session.defaultSession
    .getUserAgent()
    .replace(/\sElectron\/\S+/g, "")
    .replace(/\sx-video-window\/\S+/gi, "");
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
    lastUrl: state?.lastUrl || "",
  };
}

async function injectGuest(contents) {
  if (!contents || contents.isDestroyed()) return;
  try {
    await contents.insertCSS(injectCss);
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
    if (!isAllowedNavigation(url)) event.preventDefault();
  });

  contents.on("will-redirect", (event, url) => {
    if (!isAllowedNavigation(url)) event.preventDefault();
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

  contents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === "media" || permission === "fullscreen");
  });
}

function resolveOpen(text) {
  const parsed = parseXUrl(text);
  if (!parsed.ok) return parsed;
  if (!isAllowedNavigation(parsed.loadUrl)) {
    return { ok: false, error: "That link is not allowed in this app." };
  }
  state.lastUrl = parsed.loadUrl;
  persistSoon();
  return parsed;
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
          click: () => {
            const result = resolveOpen(SIGN_IN_URL);
            if (result.ok && mainWindow) {
              mainWindow.webContents.send("open-load-url", result);
            }
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
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
            if (guestContents && !guestContents.isDestroyed()) {
              guestContents.executeJavaScript(
                `window.__xvwSetCompact(${item.checked ? "true" : "false"})`,
                true
              );
            }
            sendState();
          },
        },
        {
          label: "Fill video",
          accelerator: "F8",
          click: async () => {
            if (!guestContents || guestContents.isDestroyed()) return;
            try {
              await guestContents.executeJavaScript(
                `(() => { const v = document.querySelector("video"); const r = v && (v.requestFullscreen || v.webkitRequestFullscreen); if (r) r.call(v); })()`,
                true
              );
            } catch {
              // ignore
            }
          },
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
  if (input.key === "F1") {
    mainWindow.webContents.send("toggle-help");
    event.preventDefault();
  }
  if (input.key === "F11") {
    mainWindow.webContents.send("toggle-toolbar");
    event.preventDefault();
  }
  if (ctrl && input.key.toLowerCase() === "l") {
    mainWindow.webContents.send("focus-url");
    event.preventDefault();
  }
  if (input.key === "F8") {
    mainWindow.webContents.send("fill-video");
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
    title: "X Video Window",
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

  mainWindow.on("resize", persistSoon);
  mainWindow.on("move", persistSoon);
  mainWindow.on("close", persistNow);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
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
    if (guestContents && !guestContents.isDestroyed()) {
      try {
        await guestContents.executeJavaScript(
          `window.__xvwSetCompact(${state.compact ? "true" : "false"})`,
          true
        );
      } catch {
        // ignore
      }
    }
    return state.compact;
  });

  ipcMain.handle("remember-url", (_event, url) => {
    if (typeof url === "string" && isAllowedNavigation(url)) {
      state.lastUrl = url;
      persistSoon();
    }
  });

  ipcMain.handle("fill-video", async () => {
    if (!guestContents || guestContents.isDestroyed()) {
      return { ok: false, error: "Open a post first." };
    }
    try {
      const ok = await guestContents.executeJavaScript(
        `(() => {
          const video = document.querySelector("video");
          if (!video) return false;
          const req = video.requestFullscreen || video.webkitRequestFullscreen;
          if (!req) return false;
          req.call(video);
          return true;
        })()`,
        true
      );
      if (!ok) {
        return {
          ok: false,
          error: "No video yet. Start playback, then click Fill.",
        };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not fill the video." };
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

app.whenReady().then(() => {
  app.setName("X Video Window");
  storePath = path.join(app.getPath("userData"), "window-state.json");
  state = loadStore(storePath);

  const xSession = session.fromPartition(PARTITION);
  xSession.setUserAgent(chromeUserAgent());
  xSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === "media" || permission === "fullscreen");
  });

  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event, webPreferences, params) => {
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      webPreferences.javascript = true;
      delete webPreferences.preload;
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
