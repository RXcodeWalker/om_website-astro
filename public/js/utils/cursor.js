// =========================================================
//  CURSOR TRAIL  —  cursor.js
//
//  Glowing orb + glass particle trail.
//  Toggle: flips live at runtime, persists in localStorage.
//  NO PAGE RELOAD NEEDED — elements created/destroyed live.
//
//  BTB.cursor.toggle() — flip on/off
//  BTB.cursor.isCustom() — current state (boolean)
// =========================================================

window.BTB = window.BTB || {};

(function () {

  const KEY = 'btb_cursor';

  // ── Runtime state ─────────────────────────────────────
  let _enabled = localStorage.getItem(KEY) !== 'off';
  let _teardown = null;   // fn to destroy the cursor when toggling off

  // ── Public API ────────────────────────────────────────
  BTB.cursor = {
    toggle() {
      _enabled = !_enabled;
      localStorage.setItem(KEY, _enabled ? 'on' : 'off');
      _enabled ? _build() : _destroy();
      _syncBtn();
      if (typeof playSound === 'function') playSound('toggle');
    },
    isCustom() { return _enabled; },
  };

  // ── Wire button synchronously (script is at bottom of body) ──
  function _syncBtn() {
    const btn = document.getElementById('cursor-toggle');
    if (!btn) return;
    btn.classList.toggle('active', _enabled);
    btn.setAttribute('aria-pressed', String(_enabled));
    btn.setAttribute('aria-label', _enabled ? 'Cursor: custom glow' : 'Cursor: default arrow');
  }

  // Attach click handler once
  function _wireBtn() {
    const btn = document.getElementById('cursor-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => BTB.cursor.toggle());
    _syncBtn();
  }

  // ── Build the custom cursor ───────────────────────────
  function _build() {
    // Guard: touch-only & reduced-motion
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ── Inject CSS ──────────────────────────────────────
    let css = document.getElementById('cursor-css');
    if (!css) {
      css = document.createElement('style');
      css.id = 'cursor-css';
      document.head.appendChild(css);
    }
    css.textContent = `
      *, *::before, *::after { cursor: none !important; }

      #cursor-orb {
        position: fixed; top: 0; left: 0;
        width: 36px; height: 36px; border-radius: 50%;
        pointer-events: none; z-index: 99999;
        transform: translate(-50%, -50%);
        mix-blend-mode: screen; will-change: transform;
        transition: width 0.2s ease, height 0.2s ease, opacity 0.3s ease;
      }
      #cursor-dot {
        position: fixed; top: 0; left: 0;
        width: 6px; height: 6px; border-radius: 50%;
        background: white; pointer-events: none; z-index: 100000;
        transform: translate(-50%, -50%); mix-blend-mode: difference;
        will-change: transform; transition: transform 0.1s ease, opacity 0.2s ease;
      }
      .cursor-particle {
        position: fixed; top: 0; left: 0; border-radius: 50%;
        pointer-events: none; z-index: 99998;
        transform: translate(-50%, -50%); will-change: transform, opacity;
      }
    `;

    // ── Elements ────────────────────────────────────────
    const orb = document.createElement('div'); orb.id = 'cursor-orb';
    const dot = document.createElement('div'); dot.id = 'cursor-dot';
    document.body.appendChild(orb);
    document.body.appendChild(dot);

    // ── Particle pool ────────────────────────────────────
    const POOL_SIZE = 28, TTL = 600, INTERVAL = 30, LERP = 0.12, BURST = 14;
    const pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'cursor-particle';
      el.style.cssText = 'opacity:0;width:0;height:0;';
      document.body.appendChild(el);
      pool.push({ el, active: false });
    }

    function getAccents() {
      const s = getComputedStyle(document.documentElement);
      return [s.getPropertyValue('--accent-1').trim(), s.getPropertyValue('--accent-2').trim(), s.getPropertyValue('--accent-3').trim()].filter(Boolean);
    }
    function randAccent() { const a = getAccents(); return a[Math.floor(Math.random() * a.length)]; }

    function spawnParticle(x, y, burst = false) {
      const slot = pool.find(p => !p.active); if (!slot) return;
      slot.active = true;
      const el = slot.el, color = randAccent();
      const size = burst ? 4 + Math.random() * 10 : 5 + Math.random() * 8;
      const spread = burst ? 60 : 20;
      const vx = (Math.random() - 0.5) * spread;
      const vy = (Math.random() - 0.5) * spread - (burst ? 15 : 0);
      const ttl = burst ? TTL * 1.4 : TTL;
      el.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;opacity:1;background:radial-gradient(circle,${color},transparent 70%);box-shadow:0 0 ${size*1.5}px ${color};transform:translate(-50%,-50%);`;
      const t0 = performance.now();
      (function animate(now) {
        const p = (now - t0) / ttl;
        if (p >= 1) { el.style.cssText = 'opacity:0;width:0;height:0;'; slot.active = false; return; }
        const e = 1 - p;
        el.style.left    = (x + vx * p * 2) + 'px';
        el.style.top     = (y + vy * p * 2) + 'px';
        el.style.opacity = (e * 0.9).toFixed(3);
        el.style.width   = (size * e) + 'px';
        el.style.height  = (size * e) + 'px';
        requestAnimationFrame(animate);
      })(performance.now());
    }

    // ── Orb loop ─────────────────────────────────────────
    let mx = innerWidth/2, my = innerHeight/2, ox = mx, oy = my, hover = false, raf;
    function orbLoop() {
      raf = requestAnimationFrame(orbLoop);
      const [c1='#4cc9f0', c2='#8a4fff'] = getAccents();
      ox += (mx - ox) * LERP; oy += (my - oy) * LERP;
      const sz = hover ? 52 : 36;
      orb.style.left       = ox + 'px'; orb.style.top = oy + 'px';
      orb.style.width      = sz + 'px'; orb.style.height = sz + 'px';
      orb.style.background = `radial-gradient(circle,${c1}55 0%,${c2}22 60%,transparent 100%)`;
      orb.style.boxShadow  = `0 0 ${sz}px ${c1}66,0 0 ${sz*2}px ${c2}33`;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    }
    orbLoop();

    // ── Listeners ────────────────────────────────────────
    let last = 0;
    const ISEL = 'a,button,input,textarea,select,label,[role="button"]';
    const onMove = e => {
      mx = e.clientX; my = e.clientY;
      const now = performance.now();
      if (now - last > INTERVAL) { spawnParticle(mx, my); last = now; }
    };
    const onDown = e => {
      dot.style.transform = 'translate(-50%,-50%) scale(0.6)';
      for (let i = 0; i < BURST; i++) setTimeout(() => spawnParticle(e.clientX, e.clientY, true), i * 12);
    };
    const onUp   = () => { dot.style.transform = 'translate(-50%,-50%) scale(1)'; };
    const onOver = e => { if (e.target.closest(ISEL)) hover = true; };
    const onOut  = e => { if (e.target.closest(ISEL)) hover = false; };
    const onLeave = () => { orb.style.opacity = '0'; dot.style.opacity = '0'; };
    const onEnter = () => { orb.style.opacity = '1'; dot.style.opacity = '1'; };

    document.addEventListener('mousemove',  onMove,  { passive: true });
    document.addEventListener('mousedown',  onDown);
    document.addEventListener('mouseup',    onUp);
    document.addEventListener('mouseover',  onOver);
    document.addEventListener('mouseout',   onOut);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    // ── Teardown fn ──────────────────────────────────────
    _teardown = function () {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousemove',  onMove);
      document.removeEventListener('mousedown',  onDown);
      document.removeEventListener('mouseup',    onUp);
      document.removeEventListener('mouseover',  onOver);
      document.removeEventListener('mouseout',   onOut);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      orb.remove(); dot.remove();
      pool.forEach(p => p.el.remove());
      const s = document.getElementById('cursor-css');
      if (s) s.textContent = '';
      _teardown = null;
    };
  }

  function _destroy() {
    if (_teardown) _teardown();
    // Remove the cursor override CSS entirely
    const css = document.getElementById('cursor-css');
    if (css) css.remove();
    // Clean up any remaining particles/orb
    document.getElementById('cursor-orb')?.remove();
    document.getElementById('cursor-dot')?.remove();
    document.querySelectorAll('.cursor-particle').forEach(el => el.remove());
  }

  // ── Init ─────────────────────────────────────────────
  _wireBtn();
  if (_enabled) _build();



})();