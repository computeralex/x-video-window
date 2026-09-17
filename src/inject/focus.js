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

    const theater = compact
      ? `
      html.xvw-theater aside:not(:has(video)),
      html.xvw-theater nav:not(:has(video)),
      html.xvw-theater [class*="layout-width-right"]:not(:has(video)),
      html.xvw-theater [class*="layout-width-rail"]:not(:has(video)),
      html.xvw-theater [class*="xlarge:flex"]:not(:has(video)),
      html.xvw-theater [class*="layout-width-two-column"] ~ :not(:has(video)),
      html.xvw-theater ul > li:not(:has(video)),
      html.xvw-theater article:not(:has(video)),
      html.xvw-theater article [class*="flex-col"][class*="gap-3"] > :not(:has(video)),
      html.xvw-theater article [class*="w-[calc(100%+16px)]"]:not(:has(video)),
      html.xvw-theater article [class*="border-t"]:not(:has(video)),
      html.xvw-theater [data-testid="sidebarColumn"]:not(:has(video)),
      html.xvw-theater [data-testid="BottomBar"],
      html.xvw-theater [data-testid="inlinePrompt"],
      html.xvw-theater [data-testid="tweetButtonInline"],
      html.xvw-theater [data-testid="cellInnerDiv"]:nth-child(n + 2):not(:has(video)),
      html.xvw-theater [aria-label="Timeline: Conversation"] > div > div > div:nth-child(n + 2):not(:has(video)),
      html.xvw-theater [data-testid="tweetText"]:not(:has(video)),
      html.xvw-theater [data-testid="User-Name"],
      html.xvw-theater [data-testid="caret"],
      html.xvw-theater [data-testid^="UserAvatar-Container"],
      html.xvw-theater [class*="font-chirp"][class*="whitespace-pre-wrap"],
      html.xvw-theater button[aria-label="Follow"],
      html.xvw-theater button[aria-label="Following"],
      html.xvw-theater button[aria-label*="Reply" i],
      html.xvw-theater button[aria-label*="Repost" i],
      html.xvw-theater button[aria-label*="Like" i],
      html.xvw-theater button[aria-label*="Bookmark" i],
      html.xvw-theater button[aria-label*="Share" i],
      html.xvw-theater button[aria-label="Back"],
      html.xvw-theater a[aria-label="Back"],
      html.xvw-theater h2:not(:has(video)),
      html.xvw-theater [aria-label="View count"],
      html.xvw-theater [aria-label="See all the replies"],
      html.xvw-theater [aria-label*="Post your reply" i],
      html.xvw-theater [href$="/analytics"],
      html.xvw-theater [href$="/quotes"] {
        display: none !important;
      }
      html.xvw-theater {
        --layout-width-right: 0px;
        --layout-min-right: 0px;
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

  function clearTheaterMarks() {
    document.documentElement.classList.remove("xvw-theater");
    document.querySelectorAll(".xvw-hide-chrome").forEach((n) => n.classList.remove("xvw-hide-chrome"));
    document.querySelectorAll(".xvw-player-root").forEach((n) => n.classList.remove("xvw-player-root"));
    document.querySelectorAll(".xvw-fill-box").forEach((n) => n.classList.remove("xvw-fill-box"));
    document.querySelectorAll(".xvw-neutralize").forEach((n) => n.classList.remove("xvw-neutralize"));
    document.querySelectorAll("video.xvw-video").forEach((n) => n.classList.remove("xvw-video"));
    document.querySelectorAll(".xvw-hide-meta").forEach((n) => n.classList.remove("xvw-hide-meta"));
  }

  function applyTheater() {
    if (window.__xvwCompact === false || isAuthPath(location.pathname) || !isWatchPath(location.pathname)) {
      clearTheaterMarks();
      return false;
    }
    // CSS selectors hide tweet chrome. Do not walk or restyle the player tree.
    document.documentElement.classList.add("xvw-theater");
    return true;
  }

  function apply() {
    ensureStyle();
    if (isAuthPath(location.pathname)) {
      clearTheaterMarks();
      return;
    }
    const wantTheater = window.__xvwCompact !== false && isWatchPath(location.pathname);
    const hasTheater = document.documentElement.classList.contains("xvw-theater");
    if (wantTheater === hasTheater) return;
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
        display: getComputedStyle(video).display,
        filter: getComputedStyle(video).filter,
        pointerEvents: getComputedStyle(video).pointerEvents,
      },
      dimAncestors: (() => {
        if (!video) return [];
        const bad = [];
        let n = video;
        let depth = 0;
        while (n && n.nodeType === 1 && depth < 24) {
          const s = getComputedStyle(n);
          const opacity = Number(s.opacity);
          const filter = s.filter || "none";
          const vis = s.visibility;
          const display = s.display;
          if (
            opacity < 0.99 ||
            (filter && filter !== "none") ||
            vis === "hidden" ||
            vis === "collapse" ||
            display === "none"
          ) {
            bad.push({
              tag: n.tagName,
              cls: String(n.className || "").slice(0, 80),
              opacity,
              filter,
              visibility: vis,
              display,
            });
          }
          n = n.parentElement;
          depth += 1;
        }
        return bad;
      })(),
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
