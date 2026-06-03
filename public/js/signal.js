// =========================================================
//  SIGNAL INTERACTION SYSTEM — signal.js
//
//  Shared scaffold: init / destroy lifecycle with cleanup
//  registry.  Each interaction is a self-contained initX()
//  that registers its own teardown via reg().
//
//  BTB.signal.init()    — (re)start all interactions
//  BTB.signal.destroy() — tear down cleanly
// =========================================================

window.BTB = window.BTB || {};

(function () {
  'use strict';

  const PRM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const _cleanup = [];
  const reg = fn => _cleanup.push(fn);

  // ── 01 Reticle Assembly ─────────────────────────────────
  function initReticle() {
    const reticle = document.getElementById('reticle');
    if (!reticle) return;

    const INTERACTIVE = 'a, button, [role="button"], .glass-card-hover, .feature-card, .tilt-card';
    const DWELL_MS = 200;
    let dwellTimer = null;
    let currentTarget = null;

    function lock(el) {
      const r = el.getBoundingClientRect();
      reticle.style.left   = r.left + 'px';
      reticle.style.top    = r.top  + 'px';
      reticle.style.width  = r.width + 'px';
      reticle.style.height = r.height + 'px';

      reticle.dataset.type =
        el.matches('a[href], button, [role="button"]') ? 'action' : 'card';
      reticle.classList.add('locked');
    }

    function unlock() {
      clearTimeout(dwellTimer);
      dwellTimer = null;
      reticle.classList.remove('locked');
      currentTarget = null;
    }

    function onOver(e) {
      const el = e.target.closest(INTERACTIVE);
      if (!el || el === currentTarget) return;
      unlock();
      currentTarget = el;
      dwellTimer = setTimeout(function () { lock(el); }, DWELL_MS);
    }

    function onOut(e) {
      const leaving = e.target.closest(INTERACTIVE);
      if (!leaving) return;
      unlock();
    }

    function onScroll() {
      if (currentTarget && reticle.classList.contains('locked')) {
        const r = currentTarget.getBoundingClientRect();
        reticle.style.left   = r.left + 'px';
        reticle.style.top    = r.top  + 'px';
        reticle.style.width  = r.width + 'px';
        reticle.style.height = r.height + 'px';
      }
    }

    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout',  onOut);
    window.addEventListener('scroll', onScroll, { passive: true });

    reg(function () {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout',  onOut);
      window.removeEventListener('scroll', onScroll);
      unlock();
    });
  }

  // ── 02 Section Handshake ───────────────────────────────
  function initHandshake() {
    var sections = document.querySelectorAll('[data-handshake]');
    if (!sections.length) return;

    if (PRM) {
      sections.forEach(function (el) {
        el.classList.add('hs-phase-1', 'hs-phase-2', 'hs-phase-3');
        el.querySelectorAll('.glass-card, .feature-card, .stat-card').forEach(function (card) {
          card.style.setProperty('--panel-energy', '1');
        });
      });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        obs.unobserve(el);

        var scan = document.createElement('span');
        scan.className = 'hs-scan';
        el.prepend(scan);

        requestAnimationFrame(function () {
          el.classList.add('hs-phase-1');
        });

        setTimeout(function () {
          el.classList.add('hs-phase-2');
        }, 280);

        setTimeout(function () {
          el.classList.add('hs-phase-3');
          el.querySelectorAll('.glass-card, .feature-card, .stat-card').forEach(function (card, i) {
            setTimeout(function () {
              card.style.setProperty('--panel-energy', '1');
            }, i * 60);
          });
        }, 480);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    sections.forEach(function (el) { obs.observe(el); });
    reg(function () { obs.disconnect(); });
  }

  // ── 03 Contact Surface Charge ──────────────────────────
  function initCharge() {
    var TARGETS = '.glass-card-hover, .glass-card, .feature-card, .stat-card, .btn-link, .btn-primary, .btn-ghost, .theme-btn, .palette-toggle';

    function onDown(e) {
      var el = e.target.closest(TARGETS);
      if (el) el.dataset.pressing = 'true';
    }

    function onUp(e) {
      var el = e.target.closest(TARGETS);
      if (!el) {
        document.querySelectorAll('[data-pressing]').forEach(function (node) {
          delete node.dataset.pressing;
        });
        return;
      }
      delete el.dataset.pressing;
      el.dataset.released = 'true';
      setTimeout(function () { delete el.dataset.released; }, 300);
    }

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);

    reg(function () {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.querySelectorAll('[data-pressing]').forEach(function (node) {
        delete node.dataset.pressing;
      });
      document.querySelectorAll('[data-released]').forEach(function (node) {
        delete node.dataset.released;
      });
    });
  }

  // ── 05 Reading Depth Echo ──────────────────────────────
  function initDepthEcho() {
    var tracks = document.querySelectorAll('.depth-track');
    if (!tracks.length) return;

    tracks.forEach(function (track) {
      var paras = track.querySelectorAll('p');
      if (!paras.length) return;

      var total = paras.length;
      var read = 0;

      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          read = Math.min(read + 1, total);
          track.style.setProperty('--read-depth', (read / total).toFixed(3));
          obs.unobserve(entry.target);
        });
      }, {
        threshold: 0.5,
        rootMargin: '0px 0px -20% 0px'
      });

      paras.forEach(function (p) { obs.observe(p); });
      reg(function () { obs.disconnect(); });
    });
  }

  // ── 06 Structural Silence ────────────────────────────
  function initSilence() {
    var ticking = false;

    function check() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) { ticking = false; return; }
      var ratio = window.scrollY / docH;
      document.body.classList.toggle('transmission-complete', ratio > 0.9);
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    reg(function () {
      window.removeEventListener('scroll', onScroll);
      document.body.classList.remove('transmission-complete');
    });
  }

  // ── Lifecycle ───────────────────────────────────────────
  function init() {
    if (CAN_HOVER && !PRM) initReticle();
    initHandshake();
    initCharge();
    initDepthEcho();
    initSilence();
  }

  function destroy() {
    _cleanup.forEach(function (fn) { fn(); });
    _cleanup.length = 0;
  }

  document.addEventListener('astro:before-swap', destroy);
  document.addEventListener('astro:page-load', init);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  BTB.signal = { init: init, destroy: destroy };
})();
