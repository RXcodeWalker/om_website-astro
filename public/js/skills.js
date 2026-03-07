// =========================================================
//  ANIMATED SKILL BARS  —  skills.js
//
//  • Three tabbed categories: Tech / Football / Music
//  • Each bar animates via requestAnimationFrame with
//    easeOutExpo — fast snap then smooth deceleration
//  • A glowing orb rides the leading edge while filling
//  • A shimmer sweep fires once the fill lands
//  • Percentage counter counts up in sync with the fill
//  • Rows stagger in from the left, 120ms apart
//  • IntersectionObserver fires when section scrolls in
//  • Tab switching re-fires animations if already visible
//  • Hover reveals a detail description under each bar
//  • Fully respects prefers-reduced-motion
// =========================================================

(function () {

  // ── 1. Skill data ──────────────────────────────────────
  const SKILLS = {
    tech: [
      {
        name:   'HTML & CSS',
        pct:    88,
        icon:   '🎨',
        detail: 'This entire site — glass morphism, animations, responsive layouts',
      },
      {
        name:   'JavaScript',
        pct:    75,
        icon:   '⚡',
        detail: 'Vanilla JS: cursor trails, typewriters, observers, no frameworks',
      },
      {
        name:   'Web Design',
        pct:    85,
        icon:   '✦',
        detail: 'UI/UX thinking, visual hierarchy, interaction design',
      },
      {
        name:   'Python',
        pct:    60,
        icon:   '🐍',
        detail: 'Algorithms, data structures, still learning',
      },
      {
        name:   'Git & Deployment',
        pct:    70,
        icon:   '🚀',
        detail: 'Version control, Netlify, CI/CD basics',
      },
    ],
    football: [
      {
        name:   'Tactical Analysis',
        pct:    90,
        icon:   '🧠',
        detail: 'Press structures, shape transitions, positional play',
      },
      {
        name:   'Match Reading',
        pct:    87,
        icon:   '👁️',
        detail: 'Live pattern recognition — momentum, phase shifts',
      },
      {
        name:   'Transfer Knowledge',
        pct:    82,
        icon:   '📋',
        detail: 'Market values, positional profiles, squad building logic',
      },
      {
        name:   'Football Writing',
        pct:    85,
        icon:   '✍️',
        detail: 'Long-form tactical essays — see the blog',
      },
      {
        name:   'Arsenal History',
        pct:    95,
        icon:   '🔴',
        detail: 'Herbert Chapman to Arteta — every era, every title',
      },
    ],
    music: [
      {
        name:   'Guitar',
        pct:    88,
        icon:   '🎸',
        detail: 'LCM Grade 8 High Distinction — currently pursuing Diploma',
      },
      {
        name:   'Performance',
        pct:    82,
        icon:   '🎤',
        detail: 'Live stage, solo & band — Joker and the Thief, Slither, It\'s My Life',
      },
      {
        name:   'Music Theory',
        pct:    74,
        icon:   '🎼',
        detail: 'Harmony, modes, chord extensions, voice leading',
      },
      {
        name:   'Ear Training',
        pct:    68,
        icon:   '👂',
        detail: 'Interval recognition, transcription by ear',
      },
      {
        name:   'Songwriting',
        pct:    58,
        icon:   '📝',
        detail: 'Exploring chord progressions and original composition',
      },
    ],
  };

  // ── 2. Reduced-motion guard ────────────────────────────
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 3. Easing functions ────────────────────────────────
  // Fast snap then smooth stop — great for progress bars
  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  // Slight overshoot — used for row slide-in
  function easeOutBack(t) {
    const c1 = 1.5;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // ── 4. Build DOM for all panels ───────────────────────
  function buildPanels() {
    ['tech', 'football', 'music'].forEach(category => {
      const panel = document.getElementById('skills-panel-' + category);
      if (!panel) return;

      panel.innerHTML = SKILLS[category].map((skill, i) => `
        <div class="skill-row" data-index="${i}" data-pct="${skill.pct}"
             role="group" aria-label="${skill.name}: ${skill.pct}%">

          <div class="skill-meta">
            <span class="skill-name">
              <span class="skill-icon" aria-hidden="true">${skill.icon}</span>
              ${skill.name}
            </span>
            <span class="skill-pct" aria-live="polite">0%</span>
          </div>

          <div class="skill-track" aria-hidden="true">
            <div class="skill-fill" data-pct="${skill.pct}"></div>
            <div class="skill-markers">
              <span class="skill-marker" style="left:25%"  aria-hidden="true"></span>
              <span class="skill-marker" style="left:50%"  aria-hidden="true"></span>
              <span class="skill-marker" style="left:75%"  aria-hidden="true"></span>
              <span class="skill-marker" style="left:100%" aria-hidden="true"></span>
            </div>
          </div>

          <div class="skill-labels" aria-hidden="true">
            <span>Beginner</span>
            <span>Intermediate</span>
            <span>Advanced</span>
            <span>Expert</span>
          </div>

          <div class="skill-detail">${skill.detail}</div>

        </div>
      `).join('');
    });
  }

  // ── 5. Animate a single bar ───────────────────────────
  function animateBar(row, delay) {
    const fill    = row.querySelector('.skill-fill');
    const pctEl   = row.querySelector('.skill-pct');
    const target  = parseInt(row.dataset.pct, 10);
    const DURATION = reduced ? 0 : 1100;

    // Stagger the row sliding in
    setTimeout(() => {
      row.classList.add('visible');
    }, delay);

    // Stagger the bar fill
    setTimeout(() => {
      if (reduced) {
        // Instant if reduced-motion
        fill.style.width = target + '%';
        pctEl.textContent = target + '%';
        fill.classList.add('shimmer');
        return;
      }

      fill.classList.add('running');

      const start = performance.now();

      function tick(now) {
        const elapsed  = now - start;
        const rawT     = Math.min(elapsed / DURATION, 1);
        const easedT   = easeOutExpo(rawT);
        const current  = Math.round(easedT * target);

        fill.style.width     = (easedT * target) + '%';
        pctEl.textContent    = current + '%';

        if (rawT < 1) {
          requestAnimationFrame(tick);
        } else {
          // Fill has landed — trigger shimmer, remove orb
          fill.classList.remove('running');
          fill.classList.add('done');

          // Small rebound effect: go 3% over then snap back
          fill.style.width = Math.min(target + 3, 100) + '%';
          setTimeout(() => {
            fill.style.transition = 'width 0.3s cubic-bezier(0.4,0,0.2,1)';
            fill.style.width = target + '%';
            setTimeout(() => {
              fill.style.transition = 'none';
              fill.classList.add('shimmer');
            }, 320);
          }, 60);
        }
      }

      requestAnimationFrame(tick);
    }, delay + 120); // bar starts slightly after row slides in
  }

  // ── 6. Animate all bars in a panel ────────────────────
  function animatePanel(category) {
    const panel = document.getElementById('skills-panel-' + category);
    if (!panel) return;

    const rows = panel.querySelectorAll('.skill-row');

    rows.forEach((row, i) => {
      // Reset state so re-animation works cleanly
      const fill  = row.querySelector('.skill-fill');
      const pctEl = row.querySelector('.skill-pct');

      row.classList.remove('visible');
      fill.style.width      = '0%';
      fill.style.transition = 'none';
      fill.classList.remove('running', 'done', 'shimmer');
      pctEl.textContent = '0%';

      animateBar(row, i * 120);
    });
  }

  // ── 7. Tab switching ──────────────────────────────────
  let activeTab        = 'tech';
  let sectionInView    = false;

  function switchTab(category) {
    if (category === activeTab) return;

    // Update tab buttons
    document.querySelectorAll('.skills-tab').forEach(btn => {
      const isActive = btn.dataset.tab === category;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Swap panels
    document.querySelectorAll('.skills-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const nextPanel = document.getElementById('skills-panel-' + category);
    if (nextPanel) {
      nextPanel.classList.add('active');
    }

    activeTab = category;

    // Re-fire animations if section is already visible
    if (sectionInView) {
      animatePanel(category);
    }

    if (typeof playSound === 'function') playSound('click');
  }

  // ── 8. IntersectionObserver ───────────────────────────
  function setupObserver() {
    const section = document.getElementById('skills-section');
    if (!section) return;

    let hasAnimated = false;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          sectionInView = entry.isIntersecting;

          if (entry.isIntersecting && !hasAnimated) {
            hasAnimated = true;
            animatePanel(activeTab);
          }

          // Reset so it re-fires when scrolled back into view
          if (!entry.isIntersecting) {
            hasAnimated = false;
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    io.observe(section);
  }

  // ── 9. Wire tab buttons ───────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.skills-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  // ── 10. Init on DOMContentLoaded ─────────────────────
  function init() {
    buildPanels();
    setupTabs();
    setupObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();