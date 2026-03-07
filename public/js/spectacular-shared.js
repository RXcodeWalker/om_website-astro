(function () {
  'use strict';

  /* ── CUSTOM CURSOR ──────────────────────────────────── */
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let cursorEnabled = localStorage.getItem('cursorEnabled') !== 'false';
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let ringX  = mouseX, ringY = mouseY;
  let trailTick = 0;

  function applyCursorState() {
    if (cursorEnabled) {
      document.body.classList.remove('cursor-off');
      document.body.style.cursor = 'none';
      if (dot)  dot.style.opacity  = '1';
      if (ring) ring.style.opacity = '';
    } else {
      document.body.classList.add('cursor-off');
      document.body.style.cursor = 'auto';
      if (dot)  dot.style.opacity  = '0';
      if (ring) ring.style.opacity = '0';
    }
    const btn = document.getElementById('cursor-toggle');
    if (btn) btn.classList.toggle('active', cursorEnabled);
  }
  applyCursorState();

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!cursorEnabled) return;
    if (dot) { dot.style.left = mouseX + 'px'; dot.style.top = mouseY + 'px'; }
    trailTick++;
    if (trailTick % 4 === 0) {
      const t = document.createElement('div');
      t.className = 'cursor-trail';
      t.style.cssText = `left:${mouseX}px;top:${mouseY}px;background:var(--accent-1);`;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 600);
    }
  });

  function animateRing() {
    if (ring && cursorEnabled) {
      ringX += (mouseX - ringX) * 0.14;
      ringY += (mouseY - ringY) * 0.14;
      ring.style.left = ringX + 'px';
      ring.style.top  = ringY + 'px';
    }
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.addEventListener('mouseover', e => {
    if (!ring) return;
    if (e.target.closest('a, button, .tilt-card, .glass-card-hover, input, textarea, [tabindex]')) {
      ring.classList.add('hovering');
    } else {
      ring.classList.remove('hovering');
    }
  });

  const cursorBtn = document.getElementById('cursor-toggle');
  if (cursorBtn) {
    cursorBtn.addEventListener('click', () => {
      cursorEnabled = !cursorEnabled;
      localStorage.setItem('cursorEnabled', cursorEnabled);
      applyCursorState();
      if (typeof playSound === 'function') playSound('toggle');
    });
  }

  /* ── SCROLL REVEAL (This makes the pages visible!) ──── */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { 
        e.target.classList.add('visible'); 
        revealObs.unobserve(e.target); 
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function attachReveal() {
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachReveal);
  } else {
    attachReveal();
  }

  /* ── 3D TILT CARDS ──────────────────────────────────── */
  function attachTilt() {
    document.querySelectorAll('.tilt-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const rx = (y - r.height/2) / r.height * -10;
        const ry = (x - r.width/2)  / r.width  * 10;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
        card.style.setProperty('--mouse-x', (x/r.width*100)+'%');
        card.style.setProperty('--mouse-y', (y/r.height*100)+'%');
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachTilt);
  } else {
    attachTilt();
  }

})();