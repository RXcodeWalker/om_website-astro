// =========================================================
//  SCROLL EFFECTS, FADE-IN OBSERVER, MATERIAL TINTS & NAV MENU
// =========================================================

(function () {
  const progressBar = document.getElementById('progress-bar');
  const header = document.querySelector('.site-header');
  const brandHero = document.getElementById('brand-hero');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const navBackdrop = document.getElementById('nav-backdrop');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let prefersReducedMotion = reducedMotionQuery.matches;
  let ticking = false;
  let navCompressed = false;
  let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;

  function onReducedMotionChanged(event) {
    prefersReducedMotion = event.matches;
    if (header && prefersReducedMotion) {
      header.classList.remove('nav-condensed');
    }
    requestTick();
  }

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', onReducedMotionChanged);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(onReducedMotionChanged);
  }

  function updateScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progressRatio = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
    const delta = scrollTop - lastScrollTop;

    if (progressBar) {
      progressBar.style.width = (progressRatio * 100).toFixed(2) + '%';
    }

    if (header) {
      header.classList.toggle('scrolled', scrollTop > 10);
      header.style.setProperty('--nav-progress', progressRatio.toFixed(4));

      if (prefersReducedMotion) {
        navCompressed = false;
      } else if (scrollTop <= 24) {
        navCompressed = false;
      } else if (delta > 6 && scrollTop > 72) {
        navCompressed = true;
      } else if (delta < -6) {
        navCompressed = false;
      }

      header.classList.toggle('nav-condensed', navCompressed);
    }

    if (brandHero) {
      brandHero.classList.toggle('collapsed', !prefersReducedMotion && scrollTop > 80);
    }

    lastScrollTop = scrollTop;
    ticking = false;
  }

  function requestTick() {
    if (ticking) return;
    window.requestAnimationFrame(updateScroll);
    ticking = true;
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick, { passive: true });
  updateScroll();

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      if (entry.target.classList.contains('reveal')) {
        entry.target.classList.add('visible');
      } else {
        entry.target.style.animation = 'fadeIn 0.6s ease forwards';
      }
      observer.unobserve(entry.target);
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in, .reveal').forEach((el) => observer.observe(el));

  document.addEventListener('click', (event) => {
    if (event.target.closest('.glass-card-hover') && typeof playSound === 'function') {
      playSound('click');
    }
  });

  function openMenu() {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.classList.add('active');
    menuToggle.classList.add('active');
    if (navBackdrop) navBackdrop.classList.add('active');
    menuToggle.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.classList.remove('active');
    menuToggle.classList.remove('active');
    if (navBackdrop) navBackdrop.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('active');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  if (navBackdrop) {
    navBackdrop.addEventListener('click', closeMenu);
  }

  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  const categoryColorMap = [
    { test: /football|soccer|arsenal/i, color: '#4ec7ff' },
    { test: /growth|mindset|life/i, color: '#7adf9c' },
    { test: /school|study|education/i, color: '#f2b86f' },
    { test: /code|coding|dev|program/i, color: '#98a4ff' },
    { test: /project|build/i, color: '#7fb8ff' },
  ];

  function fallbackCategoryColor(label) {
    let hash = 0;
    for (let i = 0; i < label.length; i += 1) {
      hash = (hash * 31 + label.charCodeAt(i)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 78% 63%)`;
  }

  function colorFromCategory(label) {
    const category = String(label || '').trim();
    if (!category) return '';
    const matched = categoryColorMap.find((entry) => entry.test.test(category));
    return matched ? matched.color : fallbackCategoryColor(category.toLowerCase());
  }

  function applyCategoryTints(rootNode) {
    const root = rootNode && rootNode.nodeType === 1 ? rootNode : document;
    const badges = [];

    if (root.matches && root.matches('.category-badge')) {
      badges.push(root);
    }
    if (root.querySelectorAll) {
      badges.push(...root.querySelectorAll('.category-badge'));
    }

    badges.forEach((badge) => {
      const host = badge.closest('.glass-card, .feature-card');
      if (!host) return;
      const tint = colorFromCategory(badge.textContent);
      if (!tint) return;
      host.style.setProperty('--category-reflection', tint);
    });
  }

  applyCategoryTints(document);

  let tintQueued = false;
  function scheduleCategoryTints() {
    if (tintQueued) return;
    tintQueued = true;
    window.requestAnimationFrame(() => {
      applyCategoryTints(document);
      tintQueued = false;
    });
  }

  const tintObserver = new MutationObserver((mutations) => {
    const shouldRefresh = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) =>
        node.nodeType === 1 &&
        (
          (node.matches && node.matches('.category-badge')) ||
          (node.querySelector && node.querySelector('.category-badge'))
        ),
      ),
    );

    if (shouldRefresh) {
      scheduleCategoryTints();
    }
  });

  if (document.body) {
    tintObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
