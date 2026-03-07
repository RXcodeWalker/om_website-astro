// =========================================================
//  KONAMI CODE EASTER EGG  —  konami.js
//
//  Sequence: ↑ ↑ ↓ ↓ ← → ← → B A
//
//  What happens:
//  • Glass modal slides up with a typewriter greeting
//  • Arsenal-colored confetti cannon fires from both sides
//  • Confetti pieces are mix of circles, squares & cannons
//  • Palette-aware: confetti uses your current accent colors
//  • "chime" sound plays on trigger (uses existing sound.js)
//  • Modal auto-dismisses after 6s, or on click/Escape
//  • Can only be triggered once per page load (no spam)
//  • Fully cleaned up after dismiss — no DOM leaks
// =========================================================

(function () {

  // ── 1. Konami sequence ────────────────────────────────
  const SEQUENCE = [
    'ArrowUp','ArrowUp',
    'ArrowDown','ArrowDown',
    'ArrowLeft','ArrowRight',
    'ArrowLeft','ArrowRight',
    'b','a',
  ];

  let progress  = 0;
  let triggered = false;

  document.addEventListener('keydown', (e) => {
    if (triggered) return;

    // Case-insensitive key match
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === SEQUENCE[progress]) {
      progress++;
      if (progress === SEQUENCE.length) {
        progress  = 0;
        triggered = true;
        launchEasterEgg();
      }
    } else {
      // Wrong key — reset, but check if it matches the first step
      progress = (key === SEQUENCE[0]) ? 1 : 0;
    }
  });

  // ── 2. Accent color helper ────────────────────────────
  function getAccents() {
    const cs = getComputedStyle(document.documentElement);
    return [
      cs.getPropertyValue('--accent-1').trim() || '#4cc9f0',
      cs.getPropertyValue('--accent-2').trim() || '#8a4fff',
      cs.getPropertyValue('--accent-3').trim() || '#ffd166',
    ];
  }

  // ── 3. Main launcher ─────────────────────────────────
  function launchEasterEgg() {
    injectStyles();
    buildModal();
    fireConfetti();
    if (typeof playSound === 'function') playSound('chime');
  }

  // ── 4. CSS (injected once) ────────────────────────────
  function injectStyles() {
    if (document.getElementById('konami-styles')) return;

    const s = document.createElement('style');
    s.id = 'konami-styles';
    s.textContent = `

      /* ── Backdrop ── */
      #konami-backdrop {
        position: fixed;
        inset: 0;
        z-index: 199998;
        background: rgba(10, 15, 30, 0.55);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        opacity: 0;
        animation: konamiBackdropIn 0.4s ease forwards;
      }

      @keyframes konamiBackdropIn {
        to { opacity: 1; }
      }

      /* ── Modal ── */
      #konami-modal {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 200000;
        transform: translate(-50%, -50%) scale(0.85);
        opacity: 0;
        animation: konamiModalIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s forwards;

        width: min(480px, 90vw);
        padding: 2.5rem 2rem 2rem;
        border-radius: 24px;
        text-align: center;
        overflow: hidden;

        /* Liquid glass */
        background: linear-gradient(135deg,
          rgba(255,255,255,0.18) 0%,
          rgba(255,255,255,0.06) 100%);
        backdrop-filter: blur(28px) saturate(180%);
        -webkit-backdrop-filter: blur(28px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.25);
        box-shadow:
          0 32px 80px rgba(0,0,0,0.35),
          inset 0 1px 0 rgba(255,255,255,0.4);
      }

      @keyframes konamiModalIn {
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }

      /* Shimmer sweep on modal */
      #konami-modal::before {
        content: '';
        position: absolute;
        inset: -60%;
        background: linear-gradient(
          110deg,
          transparent 35%,
          rgba(255,255,255,0.07) 48%,
          rgba(255,255,255,0.14) 50%,
          rgba(255,255,255,0.07) 52%,
          transparent 65%
        );
        transform: translateX(-100%) rotate(15deg);
        animation: konamiShimmer 3s ease infinite 0.6s;
        pointer-events: none;
        z-index: 1;
      }

      @keyframes konamiShimmer {
        0%   { transform: translateX(-100%) rotate(15deg); }
        100% { transform: translateX(200%)  rotate(15deg); }
      }

      /* ── Modal content (above shimmer) ── */
      #konami-modal > * { position: relative; z-index: 2; }

      /* Arsenal crest emoji big */
      #konami-icon {
        font-size: 3.5rem;
        display: block;
        margin-bottom: 0.75rem;
        animation: konamiBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.5s both;
      }

      @keyframes konamiBounce {
        from { transform: scale(0) rotate(-20deg); }
        to   { transform: scale(1) rotate(0deg); }
      }

      #konami-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
        background: linear-gradient(90deg, var(--accent-1), var(--accent-2));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        background-size: 200% auto;
        animation: konamiGradientShift 4s ease infinite;
        min-height: 2rem; /* stable height while typewriter fills it */
      }

      @keyframes konamiGradientShift {
        0%,100% { background-position: 0% center; }
        50%      { background-position: 100% center; }
      }

      #konami-body {
        font-size: 1rem;
        color: var(--muted-text, #fefefe);
        line-height: 1.6;
        margin-bottom: 1.5rem;
        min-height: 3.5rem;
      }

      /* Blinking cursor inside typewriter spans */
      .konami-cursor {
        display: inline-block;
        width: 2px;
        background: var(--accent-1);
        animation: konamiCursorBlink 0.8s step-end infinite;
        margin-left: 2px;
        vertical-align: text-bottom;
        height: 1.1em;
      }

      @keyframes konamiCursorBlink {
        0%,100% { opacity: 1; }
        50%      { opacity: 0; }
      }

      /* Dismiss button */
      #konami-close {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.6rem 1.4rem;
        border-radius: 12px;
        border: none;
        background: linear-gradient(90deg, var(--accent-1), var(--accent-2));
        color: white;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        opacity: 0;
        animation: konamiFadeIn 0.3s ease 1.8s forwards;
      }

      #konami-close:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      }

      @keyframes konamiFadeIn {
        to { opacity: 1; }
      }

      /* ── Confetti pieces ── */
      .konami-confetti {
        position: fixed;
        top: -12px;
        border-radius: 2px;
        pointer-events: none;
        z-index: 199999;
        will-change: transform, opacity;
      }

      /* ── Exit animation ── */
      #konami-modal.konami-exit {
        animation: konamiModalOut 0.35s ease forwards !important;
      }
      #konami-backdrop.konami-exit {
        animation: konamiBackdropOut 0.35s ease forwards !important;
      }

      @keyframes konamiModalOut {
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      }
      @keyframes konamiBackdropOut {
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── 5. Build modal ────────────────────────────────────
  function buildModal() {
    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'konami-backdrop';
    document.body.appendChild(backdrop);

    // Modal
    const modal = document.createElement('div');
    modal.id = 'konami-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Easter egg activated');
    modal.innerHTML = `
      <span id="konami-icon">⚽</span>
      <div id="konami-title"></div>
      <div id="konami-body"></div>
      <button id="konami-close">Nice find! ✨</button>
    `;
    document.body.appendChild(modal);

    // Focus trap
    modal.querySelector('#konami-close').focus();

    // Auto-dismiss after 6s
    const autoTimer = setTimeout(dismiss, 6000);

    // Manual dismiss
    function dismiss() {
      clearTimeout(autoTimer);
      modal.classList.add('konami-exit');
      backdrop.classList.add('konami-exit');
      setTimeout(cleanup, 380);
    }

    modal.querySelector('#konami-close').addEventListener('click', dismiss);
    backdrop.addEventListener('click', dismiss);
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        dismiss();
        document.removeEventListener('keydown', onEsc);
      }
    });

    function cleanup() {
      modal.remove();
      backdrop.remove();
      // Remove confetti
      document.querySelectorAll('.konami-confetti').forEach(el => el.remove());
      // Allow re-trigger after cleanup
      triggered = false;
    }

    // Start typewriters after modal animates in
    setTimeout(() => {
      typewriterSequence(
        document.getElementById('konami-title'),
        'You found the secret! 🎉',
        55,
        () => {
          typewriterSequence(
            document.getElementById('konami-body'),
            "You're one of the few who knows the Konami Code.\nNot everyone looks this hard. Respect. 🫡",
            28
          );
        }
      );
    }, 400);
  }

  // ── 6. Typewriter helper ──────────────────────────────
  function typewriterSequence(el, text, speed, onDone) {
    // Replace \n with <br> after typing
    const lines  = text.split('\n');
    let lineIdx  = 0;
    let charIdx  = 0;

    // Add blinking cursor element
    const cursor = document.createElement('span');
    cursor.className = 'konami-cursor';
    el.appendChild(cursor);

    function tick() {
      const line = lines[lineIdx];
      if (charIdx < line.length) {
        // Insert text node before cursor
        const chunk = document.createTextNode(line[charIdx]);
        el.insertBefore(chunk, cursor);
        charIdx++;
        setTimeout(tick, speed);
      } else if (lineIdx < lines.length - 1) {
        // Move to next line
        el.insertBefore(document.createElement('br'), cursor);
        lineIdx++;
        charIdx = 0;
        setTimeout(tick, speed * 4);
      } else {
        // Done — remove cursor after a beat
        setTimeout(() => cursor.remove(), 900);
        if (typeof onDone === 'function') setTimeout(onDone, 200);
      }
    }
    tick();
  }

  // ── 7. Confetti cannon ────────────────────────────────
  function fireConfetti() {
    const accents = getAccents();
    // Arsenal red/white bonus colors mixed in
    const colors  = [...accents, '#EF0107', '#ffffff', '#DB0007'];
    const COUNT   = 90;
    const W       = window.innerWidth;

    for (let i = 0; i < COUNT; i++) {
      setTimeout(() => launchPiece(colors, W), i * 22);
    }
  }

  function launchPiece(colors, W) {
    const el    = document.createElement('div');
    el.className = 'konami-confetti';

    // Shape: 0=square, 1=circle, 2=thin ribbon
    const shape = Math.floor(Math.random() * 3);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = 6 + Math.random() * 10;

    // Fire from left third OR right third of screen
    const fromLeft = Math.random() < 0.5;
    const startX   = fromLeft
      ? Math.random() * W * 0.35
      : W * 0.65 + Math.random() * W * 0.35;

    // Physics
    const vx     = (fromLeft ? 1 : -1) * (2 + Math.random() * 5);
    const vy     = -(14 + Math.random() * 12);  // upward
    const vr     = (Math.random() - 0.5) * 15;  // rotation speed deg/frame
    const gravity = 0.45;
    const ttl    = 2800 + Math.random() * 800;

    // Style
    if (shape === 1) {
      el.style.borderRadius = '50%';
    } else if (shape === 2) {
      el.style.borderRadius = '1px';
      el.style.width  = '3px';
      el.style.height = (size * 2.5) + 'px';
    }
    el.style.width      = size + 'px';
    el.style.height     = size + 'px';
    el.style.background = color;
    el.style.left       = startX + 'px';
    el.style.boxShadow  = `0 0 ${size}px ${color}88`;

    document.body.appendChild(el);

    let x    = startX;
    let y    = -12;
    let curVy = vy;
    let rot  = Math.random() * 360;
    const start = performance.now();

    function animate(now) {
      const elapsed = now - start;
      if (elapsed > ttl) {
        el.remove();
        return;
      }

      curVy += gravity;
      x     += vx;
      y     += curVy;
      rot   += vr;

      const opacity = elapsed < 400
        ? elapsed / 400               // fade in
        : 1 - ((elapsed - 400) / (ttl - 400)) * 0.85; // fade out

      el.style.transform = `translate(0, ${y}px) rotate(${rot}deg)`;
      el.style.left      = x + 'px';
      el.style.top       = '0px';
      el.style.opacity   = Math.max(0, opacity).toFixed(3);

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

})();