(function () {
  'use strict';

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
    const revealEls = document.querySelectorAll('.reveal');
    if (prefersReducedMotion) {
      revealEls.forEach(el => el.classList.add('visible'));
      return;
    }
    revealEls.forEach(el => revealObs.observe(el));
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachReveal);
  } else {
    attachReveal();
  }

  /* ── 3D TILT CARDS ──────────────────────────────────── */
  function attachTilt() {
    if (prefersReducedMotion || !canHover) return;

    document.querySelectorAll('.tilt-card').forEach(card => {
      if (card.dataset.tiltBound === 'true') return;
      card.dataset.tiltBound = 'true';

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
