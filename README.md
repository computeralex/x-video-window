# X Video Window

A small desktop player for **X (Twitter) videos**. Paste a post link into a freely resizable window, optionally keep it always-on-top, and sign in with your own X account when a video is private.

X’s browser UI keeps the player in a fixed layout. This app is a dedicated window: drag any edge, watch the video, ignore the timeline.

## Features

- Paste `x.com` or `twitter.com` status / video / **broadcast** links (also `/i/status/…`, `/i/broadcasts/…`, `/video/1`, and legacy `/i/videos/tweet/…` URLs)
- Freely resizable window; last size and position are remembered — with Focus on, the playing video grows with the window (`object-fit: contain`)
- Optional **Always on top**
- **Fill** requests fullscreen on the `<video>`, or falls back to the same in-window theater layout used by Focus (works on broadcasts too)
- **Sign in** opens a dedicated window (not the video webview) using the same local session, so X’s login UI is not covered by player CSS. Paste works in that window (Edit → Paste, right-click Paste, or ⌘/Ctrl+V) including the password field
- Focus mode hides X’s sidebar, chat rail, left nav, and reply thread so status videos and live broadcasts fill the player. Playback controls (mute, volume, play, scrubber) stay on the video overlay — you do not turn Focus off to unmute
- Open from clipboard, Back, in-app help
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
2. Click **Paste** (or drop the URL in the bar and press **Open**).
3. Resize the window while the video plays.
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

## How it works

Status links are normalized to `https://x.com/i/status/{id}` — X’s own focused post view, loaded in a persistent webview so login cookies work like a normal browser.

**Sign in** opens a separate BrowserWindow on `https://x.com/i/flow/login` with the same `persist:x-session` partition and **no** focus CSS. That avoids X’s onboarding overlay being crushed by the player’s chrome-hiding styles. The window has a standard Edit menu so clipboard paste reaches the login fields. After you land on the home timeline (or click Done), the login window closes and the player reloads.

The player then injects CSS/JS to hide timeline chrome. That is more reliable than scraping CDN `.mp4` URLs, and it still works when you are signed in. Embed widgets (`platform.twitter.com`) are intentionally not the primary path: they are flaky with `x.com` URLs and do not use your logged-in session for restricted posts.

Your session lives in Electron’s `persist:x-session` partition under this app’s user-data directory, not in Chrome/Safari.

## Keyboard

| Shortcut | Action |
| --- | --- |
| ⌘/Ctrl+L | Focus the URL bar |
| ⌘/Ctrl+O | Open the X link on the clipboard |
| ⌘/Ctrl+V | Paste (URL bar, and Sign-in email/password fields) |
| ⌘/Ctrl+Shift+T | Toggle always on top |
| F8 | Fill video |
| F1 | Help |
| F11 | Hide / show the toolbar |
| Esc | Close help or show the toolbar again |

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
src/main/        Electron main process (window, session, IPC)
src/preload/     contextBridge API
src/renderer/    URL bar, empty state, help overlay
src/inject/      CSS/JS injected into the X page
assets/          app icon
test/            node:test unit tests
```

## License

[MIT](LICENSE)
