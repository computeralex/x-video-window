/* Injected into the X webview. Idempotent. Do not hide login / OAuth pages. */
(function xVideoWindowFocus() {
  if (window.__xvwFocusInstalled) {
    window.__xvwApplyFocus && window.__xvwApplyFocus();
    return;
  }
  window.__xvwFocusInstalled = true;
  if (typeof window.__xvwCompact !== "boolean") {
    window.__xvwCompact = true;
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
      /\/(?:i\/(?:web\/)?status|[^/]+\/status)\/\d+/i.test(p)
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
      html.xvw-theater,
      html.xvw-theater body,
      html.xvw-theater #react-root {
        height: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
        background: #000 !important;
      }
      html.xvw-theater .xvw-player-root {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 2147483000 !important;
        background: #000 !important;
      }
      html.xvw-theater .xvw-fill-box {
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        min-width: 0 !important;
        min-height: 0 !important;
        flex: 1 1 auto !important;
        transform: none !important;
      }
      html.xvw-theater .xvw-player-root video,
      html.xvw-theater video.xvw-video {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        object-fit: contain !important;
        background: #000 !important;
        z-index: 0 !important;
        transform: none !important;
      }
      /* X’s mute/volume/seek overlay is a sibling of <video>; keep it on top. */
      html.xvw-theater .xvw-player-root > :not(video) {
        z-index: 2 !important;
      }
      html.xvw-theater .xvw-hide-chrome,
      html.xvw-theater .xvw-hide-meta {
        display: none !important;
      }
      html.xvw-theater .xvw-neutralize {
        transform: none !important;
        filter: none !important;
        perspective: none !important;
        contain: none !important;
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
    if (last && !last.querySelector("article") && !last.querySelector("video")) {
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

  function findPlayerRoot(video) {
    const parent = video.parentElement;
    if (parent && isPlayerControl(parent)) return parent;
    const known = video.closest(
      '[data-testid="videoPlayer"], [data-testid="videoComponent"], [data-testid="previewInterstitial"]'
    );
    if (known) return known;
    let el = parent;
    let candidate = el || video;
    for (let i = 0; i < 10 && el && el !== document.body; i++) {
      const testid = el.getAttribute("data-testid") || "";
      if (/video/i.test(testid)) return el;
      candidate = el;
      if (el.getAttribute("data-testid") === "primaryColumn") break;
      if (el.getAttribute("role") === "main") break;
      el = el.parentElement;
    }
    return candidate;
  }

  function clearTheaterMarks() {
    document.documentElement.classList.remove("xvw-theater");
    document.querySelectorAll(".xvw-player-root").forEach((n) => n.classList.remove("xvw-player-root"));
    document.querySelectorAll(".xvw-fill-box").forEach((n) => n.classList.remove("xvw-fill-box"));
    document.querySelectorAll(".xvw-hide-chrome").forEach((n) => n.classList.remove("xvw-hide-chrome"));
    document.querySelectorAll(".xvw-neutralize").forEach((n) => n.classList.remove("xvw-neutralize"));
    document.querySelectorAll("video.xvw-video").forEach((n) => n.classList.remove("xvw-video"));
    document.querySelectorAll(".xvw-hide-meta").forEach((n) => n.classList.remove("xvw-hide-meta"));
  }

  function hideNonVideoBranches(video) {
    const keep = new Set();
    let node = video;
    while (node) {
      keep.add(node);
      node = node.parentElement;
    }
    keep.forEach((el) => {
      for (const child of Array.from(el.children || [])) {
        if (keep.has(child)) continue;
        if (child.querySelector && child.querySelector("video")) continue;
        if (isPlayerControl(child)) continue;
        const style = window.getComputedStyle(child);
        if (style.position === "absolute" || style.position === "fixed") continue;
        child.classList.add("xvw-hide-chrome");
      }
    });
  }

  function hideDecorativeMeta(root) {
    if (!root) return;
    for (const child of Array.from(root.children || [])) {
      if (child.tagName === "VIDEO" || isPlayerControl(child)) continue;
      for (const section of Array.from(child.children || [])) {
        if (isPlayerControl(section)) continue;
        if (section.querySelector("button[aria-label], [aria-label='Seek slider'], [role='slider']")) {
          continue;
        }
        section.classList.add("xvw-hide-meta");
      }
    }
    root.querySelectorAll("a, span, div, p, h1, h2, h3").forEach((el) => {
      if (isPlayerControl(el)) return;
      if (el.closest("button") || el.closest("[role='slider']") || el.closest("[aria-label='Seek slider']")) {
        return;
      }
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      if (
        /^LIVE$/i.test(text) ||
        /^\d[\d.,]*\s*[KMB]?\s*views$/i.test(text) ||
        /^@\w+$/.test(text) ||
        /scan to get the app/i.test(text)
      ) {
        el.classList.add("xvw-hide-meta");
      }
    });
  }

  function applyTheater() {
    if (window.__xvwCompact === false || isAuthPath(location.pathname) || !isWatchPath(location.pathname)) {
      clearTheaterMarks();
      return false;
    }
    const video = pickVideo();
    if (!video) return false;
    const root = findPlayerRoot(video);
    if (!root) return false;

    document.documentElement.classList.add("xvw-theater");
    video.classList.add("xvw-video");
    root.classList.add("xvw-player-root");
    let el = video;
    while (el && el !== document.documentElement) {
      el.classList.add("xvw-fill-box");
      el.classList.add("xvw-neutralize");
      el = el.parentElement;
    }
    hideNonVideoBranches(video);
    hideDecorativeMeta(root);
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
    apply();
  };
  window.__xvwFillVideo = function fillVideo() {
    const video = pickVideo();
    if (!video) return { ok: false, error: "No video yet. Start playback, then click Fill." };
    apply();
    const req = video.requestFullscreen || video.webkitRequestFullscreen;
    if (req) {
      try {
        const ret = req.call(video);
        if (ret && typeof ret.then === "function") {
          ret.catch(() => {});
        }
        return { ok: true, mode: "fullscreen" };
      } catch {
        // Fall through to theater layout (video already expanded).
      }
    }
    return { ok: true, mode: "theater" };
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
