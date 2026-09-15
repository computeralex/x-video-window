# X Video Window

A small desktop player for **X (Twitter) videos**. Paste a post link into a freely resizable window, optionally keep it always-on-top, and sign in with your own X account when a video is private.

X’s browser UI keeps the player in a fixed layout. This app is a dedicated window: drag any edge, watch the video, ignore the timeline.

## Features

- Paste `x.com` or `twitter.com` status / video / **broadcast** links (also `/i/status/…`, `/i/broadcasts/…`, `/video/1`, and legacy `/i/videos/tweet/…` URLs)
- Cinema-style player: video is edge-to-edge; **no permanent URL bar**. A slim toolbar (Open video, Sign in, pin, fullscreen, Focus) appears on hover or the top edge and hides after a short idle
- **Open video** opens a small overlay to paste/type a link; ⌘/Ctrl+O opens the clipboard without showing a bar
- Optional **Always on top**
- **Fullscreen** uses the OS window (`BrowserWindow.setFullScreen`). Guest `requestFullscreen` on the `<video>` is not used — it is unreliable inside Electron’s X webview. Esc or the fullscreen button exits. Focus theater still fills the video when the window grows
- **Sign in** opens a dedicated window (not the video webview) using the same local session, so X’s login UI is not covered by player CSS. Paste works in that window (Edit → Paste, right-click Paste, or ⌘/Ctrl+V) including the password field
- Focus mode hides X’s sidebar, chat rail, left nav, and reply thread so status videos and live broadcasts fill the player. Hover the video for mute/volume/play — you do not turn Focus off to unmute
- **Share / Open With**: custom `xvw:` URL scheme, CLI / second-instance arguments, drag-and-drop of an X URL, and macOS `public.url` Open With (see below)
- Stays on X-related sites (and the hosts needed for login, captcha, and video CDNs)

## Install and run

You need [Node.js 18+](https://nodejs.org/) (20 LTS is a good choice).

```bash
git clone https://github.com/computeralex/x-video-window.git
cd x-video-window
npm install
npm start
```

1. Copy a public X video post URL.
2. Click **Open video** and paste it, or press **⌘/Ctrl+O** to open the clipboard.
3. Resize the window while the video plays. The address bar is not kept on screen.
4. For private or restricted videos, click **Sign in** and complete login in the dedicated window (same session as the player). You can paste into the email and password fields from the Edit menu or ⌘/Ctrl+V.

macOS users: `npm start` is the fastest way to try it. A packaged `.app` / `.dmg` is described below.

## Build a downloadable app

Package installers from the same repo. Run these on the OS you want to ship (macOS builds of `.dmg` / `.app` need a Mac).

```bash
npm install

# current platform
npm run build

# explicit targets
npm run build:mac      # .dmg and .zip  (run on macOS)
npm run build:win      # NSIS installer and .zip
npm run build:linux    # AppImage and .zip

# unpackaged directory only (faster smoke check)
npm run pack
```

Artifacts land in `dist/`.

### macOS notes

- Unsigned local builds: right-click the app → **Open** the first time (Gatekeeper).
- Apple silicon and Intel: electron-builder produces a build for the machine you compile on. On Apple silicon you can also pass `--universal` if you need both architectures: `npx electron-builder --mac --universal --publish never`.

## Open from X: Share via, Open With, and `xvw:`

The packaged Mac app registers the **`xvw:`** URL scheme and advertises itself as a viewer of `public.url` so **Open With → X Video Window** can appear for links. The first launch also calls `app.setAsDefaultProtocolClient('xvw')`.

Linux packages register `x-scheme-handler/xvw` the same way. This Linux VM can exercise argv / second-instance / `xvw:` parsing; it cannot show the macOS Share sheet.

### What you will (and will not) see in Share via

X’s **Share via** list, and Safari/Chrome’s share sheets on macOS, show **Share Extensions** (`.appex`) plus a few system services. This is a vanilla Electron app: it does **not** ship a signed native Share Extension, so **X Video Window usually will not appear as a named target** in X’s Share via sheet.

That is an OS limit, not a missing click handler. The practical paths:

1. **Share via → Copy link**, then in this app **Open video** or **⌘O**. Fastest, always works.
2. **Open With**: after installing the `.app`, right-click an `x.com` / `twitter.com` link (or a `.webloc`) → **Open With → X Video Window**. You can keep the browser as the http(s) default — this app does **not** claim `http`/`https` globally (that would fight Safari/Chrome).
3. **Shortcuts share action** (closest to “Share via → this app”):
   - Open **Shortcuts** → New Shortcut.
   - Add **Receive** → URLs (or Safari web pages).
   - Add **Open URLs** with URL `xvw:` + the shortcut input (or a **Run Shell Script**: `open "xvw:$1"`).
   - Shortcut details → **Show in Share Sheet**.
   - From X or the browser: **Share via** → your shortcut. Requires the packaged app to have registered `xvw:` once.
4. **Drag** an X URL onto the player window.
5. **Terminal / scripts**: `open 'xvw:https://x.com/i/broadcasts/…'` or launch with a URL argument.

Dev / Linux (no Share sheet):

```bash
# first launch, or when the app is already running (second instance forwards the URL)
npx electron . --no-sandbox --url=https://x.com/i/broadcasts/1AxRnZbVpjaxl
npx electron . --no-sandbox 'xvw:https://x.com/i/status/1814440131505598541'
```

## How it works

Status links are normalized to `https://x.com/i/status/{id}` — X’s own focused post view, loaded in a persistent webview so login cookies work like a normal browser.

**Sign in** opens a separate BrowserWindow on `https://x.com/i/flow/login` with the same `persist:x-session` partition and **no** focus CSS. That avoids X’s onboarding overlay being crushed by the player’s chrome-hiding styles. The window has a standard Edit menu so clipboard paste reaches the login fields. After you land on the home timeline (or click Done), the login window closes and the player reloads.

The player then injects CSS/JS to hide timeline chrome. That is more reliable than scraping CDN `.mp4` URLs, and it still works when you are signed in. Embed widgets (`platform.twitter.com`) are intentionally not the primary path: they are flaky with `x.com` URLs and do not use your logged-in session for restricted posts.

**Fullscreen** is the Electron `BrowserWindow` (`setFullScreen(true)`), not the webview’s Fullscreen API. On macOS that is the native green-button / Mission Control fullscreen space; on Linux it is `_NET_WM_STATE_FULLSCREEN`. If a window manager ignores that, the app maximizes as an in-window theater. Focus theater (`object-fit: contain`) keeps the video filling the window either way.

Your session lives in Electron’s `persist:x-session` partition under this app’s user-data directory, not in Chrome/Safari.

Auth URLs are never stored as `lastUrl`, so a failed login page is not restored on the next launch.

## Keyboard

| Shortcut | Action |
| --- | --- |
| ⌘/Ctrl+L | Open video overlay |
| ⌘/Ctrl+O | Open the X link on the clipboard (no bar) |
| ⌘/Ctrl+V | Paste (Open video field, and Sign-in email/password fields) |
| ⌘/Ctrl+Shift+T | Toggle always on top |
| F8 | Toggle OS fullscreen |
| Esc | Close overlay/help, exit fullscreen, or show the toolbar |
| F1 | Help |
| F11 | Lock the toolbar hidden (move to the top edge to show it again) |

## Security

The shell UI runs with `contextIsolation`, no `nodeIntegration`, and a sandboxed preload. The X webview cannot reach Node. Top-level navigation is limited to X/Twitter, media CDNs (`twimg.com`, `t.co`, …), and the sign-in/captcha hosts those pages need (Google/Apple OAuth, hCaptcha, Cloudflare challenges).

This is not a downloader and not a login bypass.

## Development

```bash
npm test      # URL parsing, allowlist, window-state helpers
npm start     # run the Electron app
```

Layout:

```
src/main/        Electron main process (window, session, IPC, incoming URLs)
src/preload/     contextBridge API
src/renderer/    cinema chrome, Open video overlay, help
src/inject/      CSS/JS injected into the X page
assets/          app icon
test/            node:test unit tests
```

## License

[MIT](LICENSE)
