// =========================================================
//  THE INVINCIBLES EASTER EGG  —  invincibles.js
//
//  Trigger: type  i-n-v-i-n-c-i-b-l-e-s  anywhere on page
//  (case-insensitive, works even when no input is focused)
//
//  What fires:
//  • Full-screen red+gold cinematic backdrop
//  • Glass trophy modal with spring entrance
//  • "THE INVINCIBLES" types out in gold gradient
//  • Animated stat counters: P38 W26 D12 L0 Pts 90
//  • Glowing "49" unbeaten-games badge pulses in
//  • Iconic Thierry Henry quote types out
//  • Key Invincibles players listed
//  • Red & gold confetti cannon from all four corners
//  • Repeating gold shimmer sweep on modal
//  • chime sound on trigger, whoosh on dismiss
//  • Auto-dismisses after 12s; Escape / click also work
//  • Full DOM cleanup after dismiss — no leaks
// =========================================================


(function () {

  // ── 1. Arsenal Invincibles colors (always these, no palette) ──
  const RED    = '#EF0107';
  const RED2   = '#DB0007';
  const GOLD   = '#FFD700';
  const GOLD2  = '#FFC200';
  const WHITE  = '#FFFFFF';
  const DARK   = '#0a0007';

  // ── 2. Sequence: type "invincibles" ───────────────────
  const WORD    = 'invincibles';
  let   buffer  = '';
  let   active  = false;   // true while egg is showing

  document.addEventListener('keydown', (e) => {
    // Ignore if typing in an actual input/textarea
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (active) return;

    const key = e.key.length === 1 ? e.key.toLowerCase() : '';
    if (!key) { buffer = ''; return; }

    buffer += key;

    // Keep only last N chars (length of word)
    if (buffer.length > WORD.length) {
      buffer = buffer.slice(-WORD.length);
    }

    if (buffer === WORD) {
      buffer = '';
      active = true;
      launch();
    }
  });

  // ── 3. Main launcher ──────────────────────────────────
  function launch() {
    injectStyles();
    buildModal();
    fireConfetti();
    if (typeof playSound === 'function') playSound('chime');
  }

  // ── 4. Styles ─────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('inv-styles')) return;
    const s = document.createElement('style');
    s.id = 'inv-styles';
    s.textContent = `

      /* ── Backdrop — deep Arsenal red with gold rim glow ── */
      #inv-backdrop {
        position: fixed;
        inset: 0;
        z-index: 199990;
        background: radial-gradient(
          ellipse at 50% 40%,
          rgba(239,1,7,0.18) 0%,
          rgba(10,0,7,0.72) 60%
        );
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
        opacity: 0;
        animation: invBackdropIn 0.5s ease forwards;
      }
      @keyframes invBackdropIn { to { opacity: 1; } }

      /* ── Modal ── */
      #inv-modal {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 200000;
        width: min(560px, 94vw);
        max-height: 92vh;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: none;
        transform: translate(-50%, -50%) scale(0.8) translateY(40px);
        opacity: 0;
        animation: invModalIn 0.6s cubic-bezier(0.34, 1.45, 0.64, 1) 0.2s forwards;

        padding: 2.5rem 2rem 2rem;
        border-radius: 28px;
        text-align: center;

        /* Glass with red tint */
        background: linear-gradient(
          160deg,
          rgba(239,1,7,0.14)   0%,
          rgba(255,255,255,0.07) 40%,
          rgba(239,1,7,0.08)   100%
        );
        backdrop-filter: blur(32px) saturate(200%);
        -webkit-backdrop-filter: blur(32px) saturate(200%);
        border: 1px solid rgba(255,215,0,0.35);
        box-shadow:
          0 0  60px rgba(239,1,7,0.25),
          0 0 120px rgba(255,215,0,0.12),
          0 40px 100px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(255,215,0,0.4),
          inset 0 -1px 0 rgba(255,255,255,0.05);
      }
      #inv-modal::-webkit-scrollbar { display: none; }

      @keyframes invModalIn {
        to { opacity: 1; transform: translate(-50%, -50%) scale(1) translateY(0); }
      }

      /* Repeating gold shimmer sweep */
      #inv-modal::before {
        content: '';
        position: absolute;
        inset: -80%;
        background: linear-gradient(
          105deg,
          transparent 38%,
          rgba(255,215,0,0.04) 46%,
          rgba(255,215,0,0.12) 50%,
          rgba(255,215,0,0.04) 54%,
          transparent 62%
        );
        transform: translateX(-100%) rotate(12deg);
        animation: invShimmer 2.8s ease infinite 0.8s;
        pointer-events: none;
        z-index: 0;
      }
      @keyframes invShimmer {
        0%   { transform: translateX(-100%) rotate(12deg); }
        100% { transform: translateX(200%)  rotate(12deg); }
      }

      /* All direct children above shimmer */
      #inv-modal > * { position: relative; z-index: 1; }

      /* ── Trophy icon ── */
      #inv-trophy {
        font-size: 4.5rem;
        display: block;
        filter: drop-shadow(0 0 24px ${GOLD}) drop-shadow(0 0 8px ${GOLD2});
        animation: invTrophyIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.55s both,
                   invTrophyFloat 3s ease-in-out 1.5s infinite;
        margin-bottom: 0.5rem;
      }
      @keyframes invTrophyIn {
        from { transform: scale(0) rotate(-30deg); opacity: 0; }
        to   { transform: scale(1) rotate(0deg);   opacity: 1; }
      }
      @keyframes invTrophyFloat {
        0%,100% { transform: translateY(0)    scale(1);    filter: drop-shadow(0 0 24px ${GOLD}); }
        50%     { transform: translateY(-8px) scale(1.04); filter: drop-shadow(0 0 36px ${GOLD}) drop-shadow(0 0 60px ${GOLD2}); }
      }

      /* ── "THE INVINCIBLES" title ── */
      #inv-title {
        font-size: clamp(1.6rem, 5vw, 2.1rem);
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin-bottom: 0.3rem;
        min-height: 2.6rem;

        background: linear-gradient(90deg, ${GOLD}, ${WHITE}, ${GOLD2}, ${WHITE}, ${GOLD});
        background-size: 300% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: invGoldShift 4s linear infinite;
        filter: drop-shadow(0 0 8px ${GOLD}88);
      }
      @keyframes invGoldShift {
        0%   { background-position: 0%   center; }
        100% { background-position: 300% center; }
      }

      /* ── Season line ── */
      #inv-season {
        font-size: 0.9rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255,215,0,0.7);
        margin-bottom: 1.4rem;
        opacity: 0;
        animation: invFadeUp 0.4s ease 1.4s forwards;
      }
      @keyframes invFadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ── Stat bar ── */
      #inv-stats {
        display: flex;
        justify-content: center;
        gap: 0.6rem;
        flex-wrap: wrap;
        margin-bottom: 1.4rem;
        opacity: 0;
        animation: invFadeUp 0.4s ease 1.6s forwards;
      }

      .inv-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.6rem 0.9rem;
        border-radius: 12px;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,215,0,0.2);
        min-width: 54px;
      }

      .inv-stat-num {
        font-size: 1.4rem;
        font-weight: 800;
        color: ${GOLD};
        line-height: 1;
        filter: drop-shadow(0 0 6px ${GOLD}88);
        font-variant-numeric: tabular-nums;
      }

      .inv-stat-label {
        font-size: 0.65rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.5);
        margin-top: 0.2rem;
      }

      /* ── "49" Unbeaten badge ── */
      #inv-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        margin: 0 auto 1.4rem;
        padding: 0.55rem 1.2rem;
        border-radius: 100px;
        background: linear-gradient(90deg, ${RED}33, ${GOLD}22, ${RED}33);
        border: 1px solid ${GOLD}55;
        box-shadow: 0 0 20px ${GOLD}22;
        opacity: 0;
        animation: invFadeUp 0.4s ease 1.8s forwards, invBadgePulse 2.5s ease-in-out 2.5s infinite;
      }
      @keyframes invBadgePulse {
        0%,100% { box-shadow: 0 0 20px ${GOLD}22; border-color: ${GOLD}55; }
        50%     { box-shadow: 0 0 35px ${GOLD}55; border-color: ${GOLD}aa; }
      }

      #inv-badge-num {
        font-size: 1.8rem;
        font-weight: 900;
        color: ${GOLD};
        filter: drop-shadow(0 0 10px ${GOLD});
        line-height: 1;
      }

      #inv-badge-text {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255,255,255,0.75);
        line-height: 1.3;
        text-align: left;
      }

      /* ── Quote ── */
      #inv-quote {
        font-size: 0.95rem;
        font-style: italic;
        color: rgba(255,255,255,0.8);
        line-height: 1.65;
        margin-bottom: 0.4rem;
        min-height: 3.5rem;
        padding: 0 0.5rem;
      }

      #inv-quote-attr {
        font-size: 0.75rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: ${GOLD};
        opacity: 0.75;
        margin-bottom: 1.4rem;
        opacity: 0;
        animation: invFadeUp 0.4s ease 4.5s forwards;
      }

      /* ── Players ── */
      #inv-players {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.4rem;
        margin-bottom: 1.6rem;
        opacity: 0;
        animation: invFadeUp 0.4s ease 4.8s forwards;
      }

      .inv-player {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.3rem 0.75rem;
        border-radius: 100px;
        background: rgba(239,1,7,0.2);
        border: 1px solid rgba(239,1,7,0.4);
        color: rgba(255,255,255,0.85);
        letter-spacing: 0.03em;
        transition: all 0.2s ease;
      }
      .inv-player:hover {
        background: rgba(239,1,7,0.4);
        border-color: ${GOLD}66;
        color: ${GOLD};
        transform: translateY(-2px);
      }

      /* ── Close button ── */
      #inv-close {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.7rem 1.8rem;
        border-radius: 14px;
        border: none;
        background: linear-gradient(90deg, ${RED}, ${RED2});
        color: white;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        letter-spacing: 0.04em;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 4px 20px ${RED}66;
        opacity: 0;
        animation: invFadeUp 0.4s ease 5.2s forwards;
      }
      #inv-close:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 28px ${RED}88;
      }

      /* ── Typewriter cursor ── */
      .inv-cursor {
        display: inline-block;
        width: 2px;
        background: ${GOLD};
        animation: invCursorBlink 0.75s step-end infinite;
        margin-left: 2px;
        vertical-align: text-bottom;
        height: 1.1em;
      }
      @keyframes invCursorBlink {
        0%,100% { opacity: 1; }
        50%      { opacity: 0; }
      }

      /* ── Confetti ── */
      .inv-confetti {
        position: fixed;
        pointer-events: none;
        z-index: 199995;
        will-change: transform, opacity;
        top: 0; left: 0;
      }

      /* ── Exit ── */
      #inv-modal.inv-exit {
        animation: invModalOut 0.4s ease forwards !important;
      }
      #inv-backdrop.inv-exit {
        animation: invBackdropOut 0.4s ease forwards !important;
      }
      @keyframes invModalOut {
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.92) translateY(20px); }
      }
      @keyframes invBackdropOut {
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── 5. Build modal ─────────────────────────────────────
  function buildModal() {
    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'inv-backdrop';
    document.body.appendChild(backdrop);

    // Modal shell
    const modal = document.createElement('div');
    modal.id = 'inv-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'The Invincibles Easter Egg');

    // Stats data
    const stats = [
      { num: 38, label: 'Played'  },
      { num: 26, label: 'Won'     },
      { num: 12, label: 'Drawn'   },
      { num: 0,  label: 'Lost'    },
      { num: 73, label: 'Goals'   },
      { num: 90, label: 'Points'  },
    ];

    // Players
    const players = [
      'Lehmann','Lauren','Campbell','Touré','Cole',
      'Ljungberg','Vieira','Gilberto','Pires',
      'Bergkamp','Henry',
    ];

    modal.innerHTML = `
      <span id="inv-trophy">🏆</span>
      <div id="inv-title"></div>
      <div id="inv-season">Premier League · 2003 / 04</div>

      <div id="inv-stats">
        ${stats.map(s => `
          <div class="inv-stat">
            <span class="inv-stat-num" data-target="${s.num}">0</span>
            <span class="inv-stat-label">${s.label}</span>
          </div>
        `).join('')}
      </div>

      <div id="inv-badge">
        <span id="inv-badge-num">49</span>
        <span id="inv-badge-text">Games<br>Unbeaten</span>
      </div>

      <div id="inv-quote"></div>
      <div id="inv-quote-attr">— Thierry Henry</div>

      <div id="inv-players">
        ${players.map(p => `<span class="inv-player">${p}</span>`).join('')}
      </div>

      <button id="inv-close">Viva l'Arsenal 🔴</button>
    `;

    document.body.appendChild(modal);

    // ── Dismiss logic ──
    const autoTimer = setTimeout(dismiss, 12000);

    function dismiss() {
      clearTimeout(autoTimer);
      if (typeof playSound === 'function') playSound('whoosh');
      modal.classList.add('inv-exit');
      backdrop.classList.add('inv-exit');
      setTimeout(cleanup, 420);
    }

    function cleanup() {
      modal.remove();
      backdrop.remove();
      document.querySelectorAll('.inv-confetti').forEach(el => el.remove());
      active = false;
    }

    modal.querySelector('#inv-close').addEventListener('click', dismiss);
    backdrop.addEventListener('click', dismiss);

    const escHandler = (e) => {
      if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    // ── Sequence: title → counters → quote ──
    // Step 1: type the title (delay matches modal entrance anim)
    setTimeout(() => {
      typewriter(
        document.getElementById('inv-title'),
        'The Invincibles',
        70,
        () => {
          // Step 2: animate stat counters once title finishes
          animateCounters();

          // Step 3: type the quote
          setTimeout(() => {
            typewriter(
              document.getElementById('inv-quote'),
              '"We did not just win the league — we did it without losing a single game. That will never be repeated."',
              32
            );
          }, 1200);
        }
      );
    }, 500);
  }

  // ── 6. Typewriter ──────────────────────────────────────
  function typewriter(el, text, speed, onDone) {
    const cursor = document.createElement('span');
    cursor.className = 'inv-cursor';
    el.appendChild(cursor);

    let i = 0;
    function tick() {
      if (i < text.length) {
        el.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
        setTimeout(tick, speed + Math.random() * (speed * 0.4));
      } else {
        setTimeout(() => cursor.remove(), 1000);
        if (typeof onDone === 'function') setTimeout(onDone, 150);
      }
    }
    tick();
  }

  // ── 7. Animated counters ───────────────────────────────
  function animateCounters() {
    const DURATION = 1400;
    const els = document.querySelectorAll('.inv-stat-num');

    els.forEach((el) => {
      const target  = parseInt(el.dataset.target, 10);
      const start   = performance.now();

      function tick(now) {
        const t       = Math.min((now - start) / DURATION, 1);
        const eased   = 1 - Math.pow(1 - t, 3); // easeOutCubic
        el.textContent = Math.round(eased * target);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ── 8. Confetti cannon ─────────────────────────────────
  function fireConfetti() {
    const colors = [RED, RED2, GOLD, GOLD2, WHITE,
                    '#CC0000', '#FFE55C', '#FF3333'];
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Four corner cannons + a central shower
    const origins = [
      { x: 0,       y: 0,    angle: 55  },   // top-left
      { x: W,       y: 0,    angle: 125 },   // top-right
      { x: 0,       y: H,    angle: -30 },   // bottom-left
      { x: W,       y: H,    angle: 210 },   // bottom-right
      { x: W * 0.5, y: -10,  angle: 90  },   // top-center shower
    ];

    const COUNT_PER_ORIGIN = 24;

    origins.forEach((origin, oi) => {
      for (let i = 0; i < COUNT_PER_ORIGIN; i++) {
        setTimeout(() => launchPiece(origin, colors, W, H),
          oi * 80 + i * 35);
      }
    });
  }

  function launchPiece(origin, colors, W, H) {
    const el = document.createElement('div');
    el.className = 'inv-confetti';

    const color   = colors[Math.floor(Math.random() * colors.length)];
    const shape   = Math.floor(Math.random() * 3); // 0=square 1=circle 2=ribbon
    const size    = 5 + Math.random() * 11;
    const speed   = 6 + Math.random() * 9;
    const spread  = 38;  // degrees of spread around angle
    const baseAng = (origin.angle + (Math.random() - 0.5) * spread) * Math.PI / 180;
    const vx      = Math.cos(baseAng) * speed;
    const vy      = Math.sin(baseAng) * speed;
    const vr      = (Math.random() - 0.5) * 14;
    const gravity = 0.28;
    const ttl     = 2500 + Math.random() * 1200;

    // Shape styles
    let w = size, h = size;
    let borderRadius = '2px';
    if (shape === 1) { borderRadius = '50%'; }
    else if (shape === 2) { w = 3; h = size * 2.8; borderRadius = '1px'; }

    el.style.cssText = `
      width:${w}px; height:${h}px;
      background:${color};
      border-radius:${borderRadius};
      box-shadow: 0 0 ${size}px ${color}88;
    `;

    document.body.appendChild(el);

    let x   = origin.x;
    let y   = origin.y;
    let vy_ = -vy;  // canvas Y flips: up = negative
    let rot = Math.random() * 360;
    const t0 = performance.now();

    function animate(now) {
      const elapsed = now - t0;
      if (elapsed > ttl || x < -20 || x > W + 20 || y > H + 20) {
        el.remove();
        return;
      }

      vy_ += gravity;
      x   += vx;
      y   += vy_;
      rot += vr;

      const progress = elapsed / ttl;
      const opacity  = progress < 0.15
        ? progress / 0.15
        : 1 - ((progress - 0.15) / 0.85) * 0.9;

      el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
      el.style.opacity   = Math.max(0, opacity).toFixed(3);

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

})();