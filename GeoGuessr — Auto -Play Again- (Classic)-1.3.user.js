// ==UserScript==
// @name         GeoGuessr — Auto "Play Again" (Classic)
// @namespace    by ADRIANXU
// @version      1.3
// @description  Clicks the final Play Again button automatically. Ignores "Next" and "View results".
// @match        https://www.geoguessr.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_ENABLED = "gg_auto_play_again_enabled";
  const CLICK_DELAY_MS = 80; // tiny delay to let UI settle
  const COOLDOWN_MS = 5000;  // prevent double-firing on re-renders

  let enabled = GM_getValue(STORAGE_ENABLED, true);
  let lastClickAt = 0;
  let lastUrl = location.href;

  // ---------- UI toggle ----------
  GM_registerMenuCommand(`Auto Play Again: ${enabled ? "ON" : "OFF"}`, () => {
    enabled = !enabled; GM_setValue(STORAGE_ENABLED, enabled); updateBadge();
  });

  GM_addStyle(`
    .gg-autoplay-badge {
      position: fixed; right: 10px; bottom: 10px; z-index: 999999;
      background: rgba(0,0,0,.65); color: #fff; padding: 6px 10px;
      border-radius: 999px; font: 12px/1 system-ui, sans-serif; cursor: pointer;
    }
    .gg-autoplay-badge.off { background: rgba(128,0,0,.65); }
  `);

  function addBadge() {
    const b = document.createElement("div");
    b.className = "gg-autoplay-badge";
    b.onclick = () => { enabled = !enabled; GM_setValue(STORAGE_ENABLED, enabled); updateBadge(); };
    document.body.appendChild(b); updateBadge();
  }
  function updateBadge() {
    const b = document.querySelector(".gg-autoplay-badge");
    if (b) { b.textContent = `Auto "Play Again": ${enabled ? "ON" : "OFF"}`; b.classList.toggle("off", !enabled); }
  }
  addBadge();

  // ---------- helpers ----------
  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
  }

  function robustClick(el) {
    if (!el) return;
    el.focus();
    // simulate pointer/mouse + click for frameworks that listen to them
    const opts = { bubbles: true, cancelable: true };
    ["pointerdown","mousedown","mouseup","pointerup","click"].forEach(type =>
      el.dispatchEvent(new MouseEvent(type, opts))
    );
    // fallback
    if (typeof el.click === "function") el.click();
  }

  function findPlayAgainBtn() {
    const el = document.querySelector('button[data-qa="play-again-button"]');
    return isVisible(el) ? el : null;
  }

  function tryClickPlayAgain() {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastClickAt < COOLDOWN_MS) return;

    const playAgain = findPlayAgainBtn();
    if (playAgain) {
      lastClickAt = now;
      setTimeout(() => robustClick(playAgain), CLICK_DELAY_MS);
    }
  }

  function onUrlChange() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // reset cooldown on real route changes
      lastClickAt = 0;
    }
  }

  // ---------- observers ----------
  const mo = new MutationObserver(() => {
    onUrlChange();
    tryClickPlayAgain();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // light polling backup (sometimes SPA changes don’t mutate much)
  setInterval(() => {
    onUrlChange();
    tryClickPlayAgain();
  }, 400);
})();
