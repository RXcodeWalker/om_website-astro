// =========================================================
//  PAGE TRANSITION SYSTEM  —  transitions.js
//
//  A frosted glass panel sweeps across the screen between pages.
//
//  EXIT (current page):
//    1. User clicks an internal link
//    2. Overlay rockets in from the RIGHT edge (380ms easeIn)
//    3. Page content gently recedes (scale + parallax)
//    4. sessionStorage flag set → navigate
//
//  ENTER (new page):
//    5. Script detects flag → overlay is already covering (no flash)
//    6. Two rAFs → overlay sweeps OUT to the LEFT (540ms easeOut)
//    7. New content slides in from a slight right offset
//
//  Skips: external links, anchors, mailto, new-tab, download,
//         middle-click, cmd/ctrl/shift-click
//  Respects: prefers-reduced-motion
// =========================================================

(function () {
  'use strict';

  const REDUCED  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FLAG     = 'btb_transition';
  const DUR_OUT  = 380;
  const DUR_IN   = 540;

  // ── 1. Inject CSS ─────────────────────────────────────
  const s = document.createElement('style');
  s.id = 'pt-css';
  s.textContent = `
    #pt-overlay {
      position: fixed;
      inset: 0;
      z-index: 50000;
      pointer-events: none;
      will-change: transform;
      overflow: hidden;
      backdrop-filter: blur(28px) saturate(190%);
      -webkit-backdrop-filter: blur(28px) saturate(190%);
      background: linear-gradient(
        108deg,
        rgba(255,255,255,0.16)  0%,
        rgba(255,255,255,0.08) 35%,
        rgba(255,255,255,0.04) 70%,
        rgba(255,255,255,0.02) 100%
      );
      border-top: 1px solid rgba(255,255,255,0.24);
      box-shadow:
        -3px  0   0   0  var(--accent-1, #4cc9f0),
        -44px 0  70px 0  color-mix(in srgb, var(--accent-1, #4cc9f0) 30%, transparent),
        -90px 0 130px 0  color-mix(in srgb, var(--accent-2, #8a4fff) 18%, transparent);
      transform: translateX(105%);
    }

    html[data-theme="dark"] #pt-overlay {
      background: linear-gradient(
        108deg,
        rgba(10,14,28,0.48)  0%,
        rgba(10,14,28,0.34) 35%,
        rgba(10,14,28,0.22) 70%,
        rgba(10,14,28,0.14) 100%
      );
      border-top-color: rgba(255,255,255,0.10);
    }

    /* Leading-edge blade: hard line + soft bloom */
    #pt-overlay::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 90px;
      background: linear-gradient(
        to right,
        color-mix(in srgb, var(--accent-1, #4cc9f0) 100%, white)  0px,
        color-mix(in srgb, var(--accent-2, #8a4fff) 100%, white)   2px,
        color-mix(in srgb, var(--accent-1, #4cc9f0)  55%, transparent)  6px,
        color-mix(in srgb, var(--accent-1, #4cc9f0)  20%, transparent) 24px,
        transparent 90px
      );
    }

    /* Noise */
    #pt-overlay::after {
      content: '';
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
      opacity: 0.04;
      mix-blend-mode: overlay;
    }

    @keyframes ptOut {
      from { transform: translateX(105%); }
      to   { transform: translateX(0); }
    }
    @keyframes ptIn {
      from { transform: translateX(0); }
      to   { transform: translateX(-108%); }
    }

    #pt-overlay.pt-out {
      animation: ptOut ${DUR_OUT}ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
    }
    #pt-overlay.pt-in {
      animation: ptIn ${DUR_IN}ms cubic-bezier(0, 0.55, 0.45, 1) forwards;
    }

    body.pt-leaving main {
      transform: translateX(-20px) scale(0.974);
      opacity: 0.6;
      transition:
        transform ${DUR_OUT}ms cubic-bezier(0.55, 0, 1, 0.45),
        opacity   ${DUR_OUT}ms ease;
      will-change: transform;
    }

    @keyframes ptContentIn {
      from { transform: translateX(20px) scale(0.974); opacity: 0.6; }
      to   { transform: translateX(0)    scale(1);     opacity: 1; }
    }
    body.pt-entering main {
      animation: ptContentIn ${DUR_IN}ms cubic-bezier(0, 0.55, 0.45, 1) forwards;
    }

    @media (prefers-reduced-motion: reduce) {
      #pt-overlay { display: none !important; }
      body.pt-leaving main,
      body.pt-entering main { animation: none !important; transition: none !important; transform: none !important; opacity: 1 !important; }
    }
  `;
  document.head.appendChild(s);

  // ── 2. Create overlay ─────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'pt-overlay';

  const arriving = sessionStorage.getItem(FLAG) === '1';
  if (arriving) {
    overlay.style.transform = 'translateX(0)';
    sessionStorage.removeItem(FLAG);
  }
  document.body.appendChild(overlay);
  syncColors();

  // ── 3. Enter animation ────────────────────────────────
  if (arriving && !REDUCED) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.add('pt-entering');
        overlay.style.transform = '';
        overlay.classList.add('pt-in');
        overlay.addEventListener('animationend', () => {
          overlay.classList.remove('pt-in');
          document.body.classList.remove('pt-entering');
        }, { once: true });
      });
    });
  }

  // ── 4. Intercept clicks ───────────────────────────────
  document.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (e.defaultPrevented) return;
    const link = e.target.closest('a[href]');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    const href = link.getAttribute('href');
    if (!isInternal(href)) return;
    if (overlay.classList.contains('pt-out')) return;
    e.preventDefault();
    exit(href);
  });

  // ── 5. Exit ───────────────────────────────────────────
  function exit(href) {
    syncColors();
    if (typeof playSound === 'function') playSound('whoosh');
    document.body.classList.add('pt-leaving');
    if (REDUCED) { sessionStorage.setItem(FLAG, '1'); location.href = href; return; }
    overlay.classList.add('pt-out');
    overlay.addEventListener('animationend', () => {
      sessionStorage.setItem(FLAG, '1');
      location.href = href;
    }, { once: true });
  }

  // ── 6. Helpers ────────────────────────────────────────
  function isInternal(href) {
    if (!href || href === '#' || href.startsWith('#')) return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
    if (/^https?:\/\//i.test(href)) {
      try { return new URL(href, location.href).origin === location.origin; }
      catch { return false; }
    }
    return true;
  }

  function syncColors() {
    const cs = getComputedStyle(document.documentElement);
    overlay.style.setProperty('--accent-1', cs.getPropertyValue('--accent-1').trim() || '#4cc9f0');
    overlay.style.setProperty('--accent-2', cs.getPropertyValue('--accent-2').trim() || '#8a4fff');
  }

  new MutationObserver(syncColors)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'data-theme'] });

})();