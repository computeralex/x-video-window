# Unofficial 𝕏 (Twitter) Video Liberator

A desktop app that **overcomes X’s non-resizable, limited video player**. Paste an `x.com` / `twitter.com` post or broadcast into a freely resizable window, optionally keep it always-on-top, and sign in with your own X account when a video is private.

X’s browser UI keeps the player in a fixed layout. This app is a dedicated window: drag any edge, watch the video, ignore the timeline.

The npm package and git repo stay `x-video-window`. The custom URL scheme stays `xvw:`. The full product name is **Unofficial 𝕏 (Twitter) Video Liberator** (Unicode mathematical double-struck capital 𝕏). Packaged macOS menus use the short form **𝕏 Video Liberator** (`CFBundleName`) only if the full string is too long for the menu bar or Dock; Finder/window titles still prefer the full name. The on-disk executable stays `x-video-window`.

## Features

- Paste `x.com` or `twitter.com` status / video / **broadcast** links (also `/i/status/…`, `/i/broadcasts/…`, `/video/1`, and legacy `/i/videos/tweet/…` URLs)
- Cinema-style player: video is edge-to-edge; **no permanent URL bar**. A slim toolbar (Open video, Sign in, pin, fullscreen, Focus) appears on hover or the top edge and hides after a short idle
- **Open video** opens a small overlay to paste/type a link; ⌘/Ctrl+O opens the clipboard without showing a bar
- Optional **Always on top**
- **Fullscreen** uses the OS window (`BrowserWindow.setFullScreen`). Guest `requestFullscreen` on the `<video>` is not used — it is unreliable inside Electron’s X webview. Esc or the fullscreen button exits. Focus theater still fills the video when the window grows
- **Sign in** opens a dedicated window (not the video webview) using the same local session, so X’s login UI is not covered by player CSS. Paste works in that window (Edit → Paste, right-click Paste, or ⌘/Ctrl+V) including the password field
- Focus mode hides X’s sidebar, chat rail, left nav, and reply thread so status videos and live broadcasts fill the player. Hover the video for mute/volume/play — you do not turn Focus off to unmute
- **Share via from X**: system share sheets do not list Electron apps (that needs a signed `.appex`). First-class path: a one-time Shortcuts action named **Unofficial 𝕏 (Twitter) Video Liberator** so **Share via → Unofficial 𝕏 (Twitter) Video Liberator** opens `xvw:{url}`. Also: Open With (`.webloc` / `public.url`), `xvw:` protocol, argv, drag-drop, Copy link + ⌘O (see below)
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
- Packaged display name is **Unofficial 𝕏 (Twitter) Video Liberator**. `CFBundleName` is **𝕏 Video Liberator** so the Apple menu / Dock label can stay readable if the full name truncates.

## Share via from X (macOS) vs Open With

The goal is: you hit **Share via** on a post or broadcast in X (or Safari/Chrome Share) and this app receives the URL.

Apple’s share sheet only lists **Share Extensions** (`.appex`) and Shortcuts that opted into the sheet. A vanilla Electron `.app` cannot appear there as **Unofficial 𝕏 (Twitter) Video Liberator** without a signed native extension. Shipping that `.appex` needs Xcode, an Apple Developer identity, and a Mac build — this Linux environment cannot produce or sign one, so this repo does **not** embed an appex.

The first-class path we *do* ship (no Xcode):

### 1. Put this app on the Share sheet (one-time Shortcuts)

This is the practical equivalent of a Share Extension for Safari, Chrome, and X’s **Share via** when they open the system sheet.

1. Install the packaged Mac app and launch it once (registers `xvw:`).
2. Open **Shortcuts** → **+** → name it `Unofficial 𝕏 (Twitter) Video Liberator`.
3. **Receive** → URLs (and/or Safari web pages).
4. **Run Shell Script** (or **Open URLs**):

   ```bash
   open "xvw:$1"
   ```

   Pass the shortcut input as the argument. Input: URLs. Shell: `/bin/zsh`.
5. Shortcut details (ⓘ) → enable **Show in Share Sheet** and **Pin in Menu Bar** if you want.
6. From X or the browser: **Share via** → **Unofficial 𝕏 (Twitter) Video Liberator**. The running player loads the link (`open-url` / second-instance).

X’s *in-page* Share menu (Copy link, Send via Direct Message, …) is X’s own UI — it will not list this app. Use **Share via…** so the system sheet opens, or **Copy link** (below).

### 2. Open With (always available after install)

The packaged app registers `xvw:`, `public.url`, and `com.apple.web-internet-location` (`.webloc`). It does **not** steal `http`/`https` as your default browser.

| Place | What you see |
| --- | --- |
| X / Safari / Chrome **Share via** system sheet | Not the app name. Your **Unofficial 𝕏 (Twitter) Video Liberator** Shortcut is the share target. |
| Finder or browser **Open With** on a link / `.webloc` | **Unofficial 𝕏 (Twitter) Video Liberator** |
| Share via → **Copy link**, then this app | **Open video** or ⌘O |
| Drag an `x.com` URL onto the window | Loads it |
| `open 'xvw:https://x.com/…'` | Loads it |

Linux packages register `x-scheme-handler/xvw`. This VM can test argv / second-instance / `xvw:` / `.webloc` parsing; it cannot show the macOS Share sheet.

Dev / Linux:

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
