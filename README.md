# Unofficial 𝕏 (Twitter) Video Liberator

A desktop app that **overcomes X’s non-resizable, limited video player**. Paste an `x.com` / `twitter.com` post or broadcast into a freely resizable window, optionally keep it always-on-top, and sign in with your own X account when a video is private.

**[Quick start → ONBOARDING.md](ONBOARDING.md)** — open the app, log in, paste your video.

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
- Open a video with **Open video**, paste, ⌘/Ctrl+O (clipboard), drag-drop of a URL or `.webloc`, **Open With** after install, or a `xvw:` link
- Playback bar on hover (play/pause, seek, mute/volume) and resume on the same VOD the next time you open it
- Stays on X-related sites (and the hosts needed for login, captcha, and video CDNs)

## Install and run

New here? **[Open the app, log in, paste your video](ONBOARDING.md).**

### Packaged downloads

GitHub Actions builds installers on each `v*` tag (and on a manual Release workflow run). Grab them from [Releases](https://github.com/computeralex/x-video-window/releases):

| Platform | What you get |
| --- | --- |
| **macOS** | `.dmg` and `.zip`, each containing the `.app` |
| **Windows** | NSIS installer (`.exe`) and `.zip` |
| **Linux** | AppImage and `.zip` |

**macOS:** builds are **unsigned**. After you open the `.dmg`, drag the app to Applications, then right-click → **Open** the first time so Gatekeeper lets it run. Apple silicon and Intel each get the arch you build on; on Apple silicon you can pass `--universal` if you need both.

**Windows:** run the NSIS installer, or unzip and launch `x-video-window.exe`.

**Linux (AppImage):**

```bash
curl -fsSL https://raw.githubusercontent.com/computeralex/x-video-window/main/install.sh | bash
```

That script downloads the latest Linux AppImage from Releases, installs it to `~/.local/bin/x-video-window`, and writes a `.desktop` launcher (Name **Unofficial 𝕏 (Twitter) Video Liberator**, `x-scheme-handler/xvw`). **Reading the script before piping it to bash is wiser** — `curl -fsSL …/install.sh -o install.sh`, open it, then `bash install.sh`. It exits with a clear error if no Release AppImage exists yet.

There is no Homebrew formula.

### From source

You need [Node.js 18+](https://nodejs.org/) (20 LTS is a good choice).

```bash
git clone https://github.com/computeralex/x-video-window.git
cd x-video-window
npm install
npm start
```

That’s the whole loop: open the app, **Sign in** if you want your session, then **Open video** or **⌘/Ctrl+O** and paste a link. More detail is in [ONBOARDING.md](ONBOARDING.md).

## Build a downloadable app

Package installers from the same repo. Run these on the OS you want to ship (macOS `.dmg` / `.app` need a Mac). Tag `v*` (or run **Actions → Release**) to upload the same artifacts to a GitHub Release.

```bash
npm install

# current platform
npm run build

# explicit targets
npm run build:mac      # .dmg and .zip, each with the .app  (run on macOS)
npm run build:win      # NSIS installer and .zip
npm run build:linux    # AppImage and .zip

# unpackaged directory only (faster smoke check)
npm run pack
```

Artifacts land in `dist/` as `x-video-window-<version>-<os>-<arch>.<ext>`.

Packaged display name is **Unofficial 𝕏 (Twitter) Video Liberator**. `CFBundleName` is **𝕏 Video Liberator** so the Apple menu / Dock label can stay readable if the full name truncates.

## Open a video

Copy a post or broadcast URL from X, then:

- **Open video** and paste, or press **⌘/Ctrl+O** to load the clipboard
- Drag a URL (or a `.webloc`) onto the window
- **Open With** this app after you install the packaged build (it registers `xvw:`, `public.url`, and `.webloc`; it does not become your default browser)
- Pass a link on the command line: `open 'xvw:https://x.com/…'` or `npx electron . --url=https://x.com/…`

Optional: a Shortcuts action that runs `open "xvw:$1"` can send links here if you want that yourself. There is no system Share sheet integration and no Share Extension in this app.

## How it works

Status links are normalized to `https://x.com/i/status/{id}` — X’s own focused post view, loaded in a persistent webview so login cookies work like a normal browser.

**Sign in** opens a separate BrowserWindow on `https://x.com/i/flow/login` with the same `persist:x-session` partition and **no** focus CSS. That avoids X’s onboarding overlay being crushed by the player’s chrome-hiding styles. The window has a standard Edit menu so clipboard paste reaches the login fields. After you land on the home timeline (or click Done), the login window closes and the player reloads.

The player then injects CSS/JS to hide timeline chrome. That is more reliable than scraping CDN `.mp4` URLs, and it still works when you are signed in. Embed widgets (`platform.twitter.com`) are intentionally not the primary path: they are flaky with `x.com` URLs and do not use your logged-in session for restricted posts.

Hover the bottom of the window for play/pause, seek, and mute/volume (Focus stays on). Replay of the same post starts near where you left off; that position is saved under the app support directory (`playback.json`). **Live** broadcasts/spaces usually cannot seek — resume is skipped there.

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

[MIT](LICENSE). That is intentional. Electron is also MIT-licensed; there is no license conflict to resolve.
