// =========================================================
//  SCROLL EFFECTS, FADE-IN OBSERVER & HAMBURGER MENU
// =========================================================

(function () {

  // ── Elements ──────────────────────────────────────────
  const progressBar = document.getElementById('progress-bar');
  const header      = document.querySelector('.site-header');
  const brandHero   = document.getElementById('brand-hero');   // desktop typewriter hero
  const menuToggle  = document.getElementById('menu-toggle');
  const mobileMenu  = document.getElementById('mobile-menu');
  const navBackdrop = document.getElementById('nav-backdrop');

  // ── Scroll / progress bar / hero collapse ─────────────
  let ticking = false;

  function updateScroll() {
    const scrollTop  = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPct  = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    // Progress bar
    if (progressBar) {
      progressBar.style.width = scrollPct + '%';
    }

    // Header shadow on scroll
    if (header) {
      header.classList.toggle('scrolled', scrollTop > 10);
    }

    // Collapse the desktop brand-hero when user scrolls down
    if (brandHero) {
      brandHero.classList.toggle('collapsed', scrollTop > 80);
    }

    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      window.requestAnimationFrame(updateScroll);
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  updateScroll(); // run once on load

  // ── Intersection Observer — fade-in on scroll ─────────
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.classList.contains('reveal')) {
          entry.target.classList.add('visible');
        } else {
          entry.target.style.animation = 'fadeIn 0.6s ease forwards';
        }
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in, .reveal').forEach(el => observer.observe(el));

  // ── Sound on glass card click ─────────────────────────
  document.addEventListener('click', (e) => {
    if (e.target.closest('.glass-card-hover')) {
      if (typeof playSound === 'function') playSound('click');
    }
  });

  // ── Hamburger Menu ────────────────────────────────────
  function openMenu() {
    mobileMenu.classList.add('active');
    menuToggle.classList.add('active');
    navBackdrop.classList.add('active');
    menuToggle.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    mobileMenu.classList.remove('active');
    menuToggle.classList.remove('active');
    navBackdrop.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('active');
      isOpen ? closeMenu() : openMenu();
    });
  }

  // Close when clicking the blurred backdrop
  if (navBackdrop) {
    navBackdrop.addEventListener('click', closeMenu);
  }

  // Close when a nav link is tapped (navigating away)
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  }

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

})(); // ← IIFE correctly invoked