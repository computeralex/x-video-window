/* Injected into the X webview. Idempotent. Do not hide login / OAuth pages. */
(function xVideoWindowFocus() {
  if (window.__xvwFocusInstalled) {
    window.__xvwApplyFocus && window.__xvwApplyFocus();
    return;
  }
  window.__xvwFocusInstalled = true;
  if (typeof window.__xvwCompact !== "boolean") {
    window.__xvwCompact = document.documentElement.dataset.xvwFocus !== "off";
  }

  const STYLE_ID = "xvw-runtime-style";

  function isAuthPath(pathname) {
    return (
      /\/i\/jf(?:\/|$)/.test(pathname) ||
      /\/i\/flow\//.test(pathname) ||
      /\/onboarding(?:\/|$)/.test(pathname) ||
      /\/(?:login|logout|signup|signin)(?:\/|$)/.test(pathname) ||
      /[?&]mode=(?:login|signup)\b/i.test(location.search) ||
      /accounts\.google\.com/.test(location.hostname) ||
      /appleid\.apple\.com/.test(location.hostname) ||
      /hcaptcha\.com/.test(location.hostname)
    );
  }

  function isWatchPath(pathname) {
    const p = pathname || "";
    return (
      /\/i\/broadcasts(?:\/|$)/i.test(p) ||
      /\/i\/spaces(?:\/|$)/i.test(p) ||
      /\/i\/live(?:\/|$)/i.test(p) ||
      /\/broadcasts(?:\/|$)/i.test(p) ||
      /\/(?:i\/(?:web\/)?status|[^/]+\/status)\/\d+(?:\/video\/\d+)?/i.test(p)
    );
  }

  function css(compact, auth) {
    if (auth) {
      return "header[role='banner'] { display: revert !important; }";
    }

    const replies = compact
      ? `
      [data-testid="cellInnerDiv"]:nth-child(n+2),
      [aria-label="Timeline: Conversation"] > div > div > div:nth-child(n+2),
      [data-testid="inlinePrompt"],
      [href$="/analytics"] {
        display: none !important;
      }
    `
      : "";

    const theater = compact
      ? `
      html.xvw-theater aside:not(:has(video)),
      html.xvw-theater nav:not(:has(video)),
      html.xvw-theater [class*="layout-width-right"]:not(:has(video)),
      html.xvw-theater [class*="layout-width-rail"]:not(:has(video)),
      html.xvw-theater [class*="xlarge:flex"]:not(:has(video)),
      html.xvw-theater [class*="layout-width-two-column"] > :not(:has(video)),
      html.xvw-theater [class*="layout-width-two-column"] ~ :not(:has(video)),
      html.xvw-theater button[aria-label="Follow"],
      html.xvw-theater button[aria-label="Following"],
      html.xvw-theater button[aria-label*="Reply" i],
      html.xvw-theater button[aria-label*="Repost" i],
      html.xvw-theater button[aria-label*="Like" i],
      html.xvw-theater button[aria-label*="Bookmark" i],
      html.xvw-theater button[aria-label*="Share" i],
      html.xvw-theater button[aria-label="Back"],
      html.xvw-theater a[aria-label="Back"],
      html.xvw-theater h2,
      html.xvw-theater [aria-label="View count"],
      html.xvw-theater [aria-label="See all the replies"],
      html.xvw-theater [aria-label*="Post your reply" i],
      html.xvw-theater [href$="/quotes"],
      html.xvw-theater .xvw-hide-chrome {
        display: none !important;
      }
      html.xvw-theater {
        --layout-width-two-column: 100vw;
        --layout-width-primary: 100vw;
        --layout-width-right: 0px;
        --layout-min-right: 0px;
      }
      html.xvw-theater [class*="layout-width-two-column"],
      html.xvw-theater [class*="layout-width-primary"],
      html.xvw-theater [class*="max-w-[600px]"],
      html.xvw-theater main[role="main"] {
        max-width: none !important;
        width: 100% !important;
        flex: 1 1 auto !important;
      }
    `
      : "";

    return `
      header[role="banner"],
      [data-testid="sidebarColumn"],
      [data-testid="BottomBar"],
      [data-testid="sheetDialog"] {
        display: none !important;
      }
      main[role="main"],
      [data-testid="primaryColumn"] {
        max-width: 100% !important;
        width: 100% !important;
        border: none !important;
        margin: 0 auto !important;
      }
      [data-testid="primaryColumn"] > div > div:first-child:has(h2) {
        display: none !important;
      }
      [data-testid="videoPlayer"],
      [data-testid="videoComponent"] {
        max-width: none !important;
      }
      ${replies}
      ${theater}
    `;
  }

  function ensureStyle() {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    const next = css(window.__xvwCompact !== false, isAuthPath(location.pathname));
    if (el.textContent !== next) el.textContent = next;
  }

  function hideDiscoverMore(root) {
    if (window.__xvwCompact === false || isAuthPath(location.pathname)) return;
    const headings = root.querySelectorAll("span, h2, h3");
    headings.forEach((node) => {
      const text = (node.textContent || "").trim();
      if (
        /^(Discover more|More posts|You might like|Who to follow|What's happening|See all the replies|Continue to X|Log in or sign up for X|New to X\?|Relevant people|Don’t miss what’s happening|Don't miss what’s happening|Scan to get the app)$/i.test(
          text
        )
      ) {
        const cell = node.closest('[data-testid="cellInnerDiv"]') || node.closest("section");
        if (cell && !cell.querySelector("video")) {
          cell.style.setProperty("display", "none", "important");
        }
      }
    });
  }

  function hideRightRail() {
    if (isAuthPath(location.pathname)) return;
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (sidebar) sidebar.style.setProperty("display", "none", "important");

    const main = document.querySelector("main[role='main']");
    if (!main) return;
    const row = main.querySelector(":scope > div > div");
    if (!row) return;
    const cols = Array.from(row.children);
    if (cols.length < 2) return;
    const last = cols[cols.length - 1];
    // Status VOD split: the right column IS the tweet article. Hide it
    // whenever it does not contain the player.
    if (last && !last.querySelector("video")) {
      last.style.setProperty("display", "none", "important");
    }
  }

  function pickVideo() {
    const videos = Array.from(document.querySelectorAll("video"));
    if (!videos.length) return null;
    videos.sort((a, b) => {
      const ap = a.paused ? 0 : 1;
      const bp = b.paused ? 0 : 1;
      if (ap !== bp) return bp - ap;
      return b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight;
    });
    return videos[0];
  }

  function isPlayerControl(el) {
    if (!el || el.nodeType !== 1) return false;
    const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`.toLowerCase();
    if (/mute|unmute|volume|play|pause|seek|scrub|fullscreen|full screen/.test(label)) {
      return true;
    }
    return Boolean(
      el.querySelector &&
        el.querySelector(
          "[aria-label='Unmute'], [aria-label='Mute'], [aria-label='Play'], [aria-label='Pause'], [aria-label='Seek slider'], [aria-label*='olume'], [aria-label*='ull screen'], [aria-label*='ullscreen']"
        )
    );
  }

  function clearTheaterMarks() {
    document.documentElement.classList.remove("xvw-theater");
    document.querySelectorAll(".xvw-hide-chrome").forEach((n) => n.classList.remove("xvw-hide-chrome"));
    document.querySelectorAll(".xvw-player-root").forEach((n) => n.classList.remove("xvw-player-root"));
    document.querySelectorAll(".xvw-fill-box").forEach((n) => n.classList.remove("xvw-fill-box"));
    document.querySelectorAll(".xvw-neutralize").forEach((n) => n.classList.remove("xvw-neutralize"));
    document.querySelectorAll("video.xvw-video").forEach((n) => n.classList.remove("xvw-video"));
    document.querySelectorAll(".xvw-hide-meta").forEach((n) => n.classList.remove("xvw-hide-meta"));
  }

  function findPlayerRoot(video) {
    if (!video) return null;
    return (
      video.closest('[class*="aspect-video"], [data-testid="videoPlayer"], [data-testid="videoComponent"]') ||
      video.parentElement ||
      video
    );
  }

  function hideNonVideoBranches(video) {
    const root = findPlayerRoot(video) || video;
    if (!root) return;
    const keep = new Set();
    // Start at <video> so the media element itself is never marked hidden.
    // querySelector("video") does not match the element it is called on.
    let node = video;
    while (node && node !== document.documentElement) {
      keep.add(node);
      node.classList.remove("xvw-hide-chrome");
      node = node.parentElement;
    }
    node = root;
    while (node && node !== document.documentElement) {
      keep.add(node);
      node.classList.remove("xvw-hide-chrome");
      node = node.parentElement;
    }
    keep.forEach((el) => {
      for (const child of Array.from(el.children || [])) {
        if (keep.has(child)) continue;
        if (child.tagName === "VIDEO" || child.tagName === "CANVAS") continue;
        if (child.querySelector && child.querySelector("video, canvas")) continue;
        if (isPlayerControl(child)) continue;
        child.classList.add("xvw-hide-chrome");
      }
    });
  }

  function hidePostChrome() {
    document.querySelectorAll("aside, nav").forEach((el) => {
      if (el.querySelector && el.querySelector("video")) return;
      if (isPlayerControl(el)) return;
      el.classList.add("xvw-hide-chrome");
    });
    document.querySelectorAll("button").forEach((el) => {
      if (el.closest("video") || (el.querySelector && el.querySelector("video"))) return;
      if (isPlayerControl(el)) return;
      const label = `${el.getAttribute("aria-label") || ""} ${el.innerText || ""}`;
      if (/Scan to get the app|Continue to X|See all the replies|Post your reply|View quotes|Relevant/i.test(label)) {
        el.classList.add("xvw-hide-chrome");
      }
    });
    const video = pickVideo();
    if (video) hideNonVideoBranches(video);
  }

  function applyTheater() {
    if (window.__xvwCompact === false || isAuthPath(location.pathname) || !isWatchPath(location.pathname)) {
      clearTheaterMarks();
      return false;
    }
    // Hide tweet chrome, including the logged-in xlarge sibling column.
    // Do not pin or restyle <video> — that blanks the Mac media layer.
    document.documentElement.classList.add("xvw-theater");
    hidePostChrome();
    return true;
  }

  function apply() {
    ensureStyle();
    if (isAuthPath(location.pathname)) {
      clearTheaterMarks();
      return;
    }
    hideDiscoverMore(document);
    hideRightRail();
    applyTheater();
  }

  window.__xvwApplyFocus = apply;
  window.__xvwSetCompact = function setCompact(value) {
    window.__xvwCompact = Boolean(value);
    document.documentElement.dataset.xvwFocus = window.__xvwCompact ? "on" : "off";
    apply();
  };
  window.__xvwFillVideo = function fillVideo() {
    const video = pickVideo();
    if (!video) return { ok: false, error: "No video yet. Start playback, then click Fill." };
    // OS fullscreen is BrowserWindow.setFullScreen in the main process.
    // Guest requestFullscreen is unreliable inside an Electron webview
    // (especially Linux / X's overlay player). Theater fills the window.
    apply();
    return { ok: true, mode: "theater" };
  };

  function mediaSnapshot() {
    const video = pickVideo();
    if (!video) return null;
    const duration = Number(video.duration);
    const live = !Number.isFinite(duration) || duration <= 0;
    return {
      currentTime: Number(video.currentTime) || 0,
      duration: live ? 0 : duration,
      paused: Boolean(video.paused),
      muted: Boolean(video.muted),
      volume: Number.isFinite(video.volume) ? video.volume : 1,
      live,
      href: location.href,
    };
  }

  window.__xvwMediaSnapshot = mediaSnapshot;

  window.__xvwProbeMedia = function probeMedia() {
    const video = pickVideo();
    const r = video ? video.getBoundingClientRect() : null;
    const tweet = document.querySelector('[class*="font-chirp"][class*="whitespace-pre-wrap"]');
    const aside = document.querySelector("aside");
    const seek = document.querySelector("[aria-label='Seek slider'], [aria-label*='Seek']");
    const mute = document.querySelector("[aria-label='Mute'], [aria-label='Unmute']");
    return {
      href: location.href,
      theater: document.documentElement.classList.contains("xvw-theater"),
      compact: window.__xvwCompact !== false,
      inner: { w: innerWidth, h: innerHeight },
      tweetHidden: !tweet || getComputedStyle(tweet).display === "none" || tweet.getBoundingClientRect().height < 2,
      asideHidden: !aside || getComputedStyle(aside).display === "none" || aside.getBoundingClientRect().height < 2,
      xlargePane: (() => {
        const pane = document.querySelector('[class*="xlarge:flex"]');
        if (!pane) return { present: false, hidden: true, w: 0 };
        const r = pane.getBoundingClientRect();
        const hidden = getComputedStyle(pane).display === "none" || r.width < 2;
        return { present: true, hidden, w: Math.round(r.width), text: (pane.innerText || "").replace(/\s+/g, " ").trim().slice(0, 80) };
      })(),
      xHover: { seek: Boolean(seek), mute: Boolean(mute) },
      video: video && {
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        currentTime: Number(video.currentTime) || 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        paused: Boolean(video.paused),
        muted: Boolean(video.muted),
        pos: getComputedStyle(video).position,
        transform: getComputedStyle(video).transform,
        opacity: getComputedStyle(video).opacity,
        visibility: getComputedStyle(video).visibility,
      },
    };
  };

  window.__xvwMediaCommand = function mediaCommand(cmd) {
    const video = pickVideo();
    if (!video || !cmd) return { ok: false };
    if (cmd.togglePlay) {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    }
    if (cmd.play) video.play().catch(() => {});
    if (cmd.pause) video.pause();
    const duration = Number(video.duration);
    const canSeek = Number.isFinite(duration) && duration > 0;
    if (canSeek && typeof cmd.seek === "number") {
      video.currentTime = Math.min(Math.max(0, cmd.seek), Math.max(0, duration - 0.25));
    }
    if (canSeek && typeof cmd.jump === "number") {
      video.currentTime = Math.min(Math.max(0, video.currentTime + cmd.jump), Math.max(0, duration - 0.25));
    }
    if (typeof cmd.muted === "boolean") video.muted = cmd.muted;
    if (cmd.toggleMute) video.muted = !video.muted;
    if (typeof cmd.volume === "number") {
      video.volume = Math.min(1, Math.max(0, cmd.volume));
      if (video.volume > 0) video.muted = false;
    }
    return Object.assign({ ok: true }, mediaSnapshot());
  };

  window.__xvwRestoreTime = function restoreTime(seconds) {
    const video = pickVideo();
    if (!video) return { ok: false, error: "no-video" };
    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      if (video.readyState < 1) return { ok: false, error: "not-ready" };
      return { ok: false, live: true };
    }
    const target = Number(seconds);
    if (!Number.isFinite(target) || target < 3 || target > duration - 2) {
      return { ok: false, skipped: true, duration };
    }

    // X often rebuilds <video> and snaps currentTime back to 0 after the
    // first seek. Hold the target briefly and re-apply until it sticks.
    window.__xvwResumeTarget = target;
    window.__xvwResumeUntil = Date.now() + 12000;

    function applyResume() {
      if (!window.__xvwResumeTarget || Date.now() > (window.__xvwResumeUntil || 0)) return false;
      const v = pickVideo();
      if (!v) return false;
      const d = Number(v.duration);
      if (!Number.isFinite(d) || d <= 0) return false;
      const now = Number(v.currentTime) || 0;
      if (Math.abs(now - window.__xvwResumeTarget) > 0.85) {
        try {
          v.currentTime = window.__xvwResumeTarget;
        } catch {
          return false;
        }
      }
      return Math.abs((Number(v.currentTime) || 0) - window.__xvwResumeTarget) <= 1.75;
    }

    if (!window.__xvwResumeHooked) {
      window.__xvwResumeHooked = true;
      const onMedia = () => applyResume();
      document.addEventListener("loadedmetadata", onMedia, true);
      document.addEventListener("loadeddata", onMedia, true);
      document.addEventListener("canplay", onMedia, true);
      document.addEventListener("playing", onMedia, true);
      document.addEventListener("seeked", onMedia, true);
      window.setInterval(onMedia, 300);
    }

    const ok = applyResume();
    return { ok, currentTime: video.currentTime, duration, target };
  };

  console.log("[xvw] focus script running", location.pathname);

  let timer = 0;
  function schedule() {
    if (timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      apply();
    }, 250);
  }

  const obs = new MutationObserver(schedule);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", apply);
  apply();
})();
