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
      /\/i\/flow\//.test(pathname) ||
      /\/(?:login|logout|signup|tos|privacy)/.test(pathname) ||
      /accounts\.google\.com/.test(location.hostname) ||
      /appleid\.apple\.com/.test(location.hostname) ||
      /hcaptcha\.com/.test(location.hostname)
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
      ${replies}
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
      if (/^(Discover more|More posts|You might like|Who to follow|What's happening|See all the replies|Continue to X|Log in or sign up for X|New to X\?|Relevant people|Don’t miss what’s happening|Don't miss what’s happening)$/i.test(text)) {
        const cell = node.closest('[data-testid="cellInnerDiv"]') || node.closest("section");
        if (cell) cell.style.setProperty("display", "none", "important");
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
    if (last && !last.querySelector("article")) {
      last.style.setProperty("display", "none", "important");
    }
  }

  function apply() {
    ensureStyle();
    hideDiscoverMore(document);
    hideRightRail();
  }

  window.__xvwApplyFocus = apply;
  window.__xvwSetCompact = function setCompact(value) {
    window.__xvwCompact = Boolean(value);
    apply();
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
  apply();
})();
