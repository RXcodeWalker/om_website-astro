// ═══════════════════════════════════════════════
//  post.js — Enhanced Blog Post Experience (Refactored for Astro)
//  Features: TOC · Likes · Bookmarks · Share · Font Size
//            Width Toggle · Focus Mode · Progress Ring
//            Reading Time Left · Toast Notifications
// ═══════════════════════════════════════════════

(function () {
  // ─── URL / Post ID ───────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const postContainer = document.getElementById('post-content');
  const postId = urlParams.get('id') || postContainer?.dataset.postId || postContainer?.dataset.postSlug;

  if (!postId) return;
  initCinematicIntro();

  // ─── State ───────────────────────────────────────
  let currentFontSize = parseFloat(localStorage.getItem('post-font-size') || 1.1);
  let wideMode = localStorage.getItem('post-wide-mode') === '1';
  let lineSpacingExpanded = localStorage.getItem('post-line-spacing') === '1';
  let focusMode = false;
  let tocOpen = false;
  let shareOpen = false;
  let liked = false;
  let bookmarked = false;
  let postTitle = document.querySelector('h1')?.textContent || '';
  let totalWords = document.getElementById('post-content')?.innerText.split(/\s+/).length || 0;

  // ─── Initialize UI ───────────
  applyFontSize(currentFontSize, false);
  if (wideMode) {
    document.getElementById('post-content')?.classList.add('wide');
    document.getElementById('post-container')?.classList.add('wide-mode');
    document.getElementById('width-toggle')?.classList.add('active');
  }
  if (lineSpacingExpanded) {
    document.documentElement.style.setProperty('--post-line-height', '2.25');
    document.getElementById('line-spacing-btn')?.classList.add('active');
  }

  // Calculate Reading Time
  const readingTime = Math.ceil(totalWords / 200);
  const readingTimeEl = document.querySelector('.blog-reading-time');
  if (readingTimeEl) readingTimeEl.textContent = `⏱ ${readingTime} min read`;

  // Init Bookmark State
  const bookmarks = JSON.parse(localStorage.getItem('post-bookmarks') || '{}');
  bookmarked = !!bookmarks[postId];
  updateBookmarkUI();

  // Load Likes and Views
  initLikes(postId);
  updateViews(postId);

  // Build TOC and Scroll Tracking
  setTimeout(() => {
    buildTOC();
    initScrollTracking();
  }, 100);

  // ─── TOC Builder ─────────────────────────────────
  function buildTOC() {
    const tocNav = document.getElementById('toc-nav');
    if (!tocNav) return;

    const content = document.getElementById('post-content');
    if (!content) { tocNav.innerHTML = '<p class="toc-empty">No sections found.</p>'; return; }

    const headings = content.querySelectorAll('h2, h3');
    if (headings.length === 0) { tocNav.innerHTML = '<p class="toc-empty">No sections found.</p>'; return; }

    tocNav.innerHTML = '';
    headings.forEach((h, i) => {
      if (!h.id) h.id = slugify(h.textContent) + '-' + i;
      const link = document.createElement('a');
      link.href = '#' + h.id;
      link.className = 'toc-link ' + (h.tagName === 'H3' ? 'h3' : '');
      link.textContent = h.textContent;
      link.dataset.target = h.id;
      link.addEventListener('click', e => {
        e.preventDefault();
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (window.innerWidth < 769) closeTOC();
      });
      tocNav.appendChild(link);
    });
  }

  // ─── Scroll Tracking ─────────────────────────────
  function initScrollTracking() {
    const progressFill = document.getElementById('progress-ring-fill');
    const progressPercent = document.getElementById('progress-percent');
    const tocProgressFill = document.getElementById('toc-progress-fill');
    const timeRemaining = document.getElementById('time-remaining');
    const circumference = 2 * Math.PI * 18; // r=18

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      if (progressFill) {
        const offset = circumference - (pct / 100) * circumference;
        progressFill.style.strokeDashoffset = offset;
        progressFill.style.strokeDasharray = circumference;
      }
      if (progressPercent) progressPercent.textContent = pct + '%';
      if (tocProgressFill) tocProgressFill.style.width = pct + '%';

      if (timeRemaining && totalWords > 0) {
        const wordsRead = Math.round((pct / 100) * totalWords);
        const wordsLeft = totalWords - wordsRead;
        const minsLeft = Math.ceil(wordsLeft / 200);
        if (pct > 5 && pct < 98) {
          timeRemaining.textContent = `~${minsLeft} min left`;
        } else if (pct >= 98) {
          timeRemaining.textContent = '✓ Finished';
        } else {
          timeRemaining.textContent = '';
        }
      }
      updateActiveTOCLink();
    }, { passive: true });
  }

  function updateActiveTOCLink() {
    const tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length === 0) return;

    const headings = document.querySelectorAll('h2, h3');
    let activeId = null;

    headings.forEach(h => {
      if (h.getBoundingClientRect().top <= 120) activeId = h.id;
    });

    tocLinks.forEach(l => {
      l.classList.toggle('active', l.dataset.target === activeId);
    });
  }

  // ─── Like System ─────────────────────────────────
  async function initLikes(id) {
    liked = localStorage.getItem('liked-' + id) === '1';
    updateLikeUI();

    const client = window.supabaseClient;
    if (!client) return;

    try {
      const { data } = await client
        .from('post_views') // Using existing table name from incrementViews.js
        .select('*', { count: 'exact', head: true })
        .eq('post_id', id);
        
      // Note: The original post.js used blog_views for likes, 
      // but let's stick to the likes logic if it exists.
      // If no likes column, we skip.
    } catch {}
  }

  async function handleLike() {
    if (liked) {
      showToast('Already liked! 💖');
      return;
    }
    liked = true;
    localStorage.setItem('liked-' + postId, '1');
    updateLikeUI();
    showToast('Thanks for the love! ❤️');
    // Logic to update likes in DB could go here
  }

  function updateLikeUI() {
    const btn = document.getElementById('like-btn');
    if (btn) btn.classList.toggle('liked', liked);
  }

  // ─── Bookmark System ─────────────────────────────
  function toggleBookmark() {
    const bookmarks = JSON.parse(localStorage.getItem('post-bookmarks') || '{}');
    if (bookmarked) {
      delete bookmarks[postId];
      bookmarked = false;
      showToast('Bookmark removed');
    } else {
      bookmarks[postId] = { title: postTitle, url: window.location.href, date: new Date().toISOString() };
      bookmarked = true;
      showToast('📌 Bookmarked!');
    }
    localStorage.setItem('post-bookmarks', JSON.stringify(bookmarks));
    updateBookmarkUI();
  }

  function updateBookmarkUI() {
    const btn = document.getElementById('bookmark-btn');
    if (btn) btn.classList.toggle('bookmarked', bookmarked);
  }

  // ─── Panels ──────────────────────────────────
  function openTOC() {
    tocOpen = true;
    document.getElementById('toc-panel')?.classList.add('open');
    document.getElementById('toc-toggle-btn')?.classList.add('active');
  }
  function closeTOC() {
    tocOpen = false;
    document.getElementById('toc-panel')?.classList.remove('open');
    document.getElementById('toc-toggle-btn')?.classList.remove('active');
  }

  function openShare() {
    shareOpen = true;
    const panel = document.getElementById('share-panel');
    panel?.classList.add('open');
    document.getElementById('share-btn')?.classList.add('active');
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(postTitle);
    document.getElementById('share-twitter')?.setAttribute('href', `https://twitter.com/intent/tweet?url=${url}&text=${text}`);
    document.getElementById('share-linkedin')?.setAttribute('href', `https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
  }
  function closeShare() {
    shareOpen = false;
    document.getElementById('share-panel')?.classList.remove('open');
    document.getElementById('share-btn')?.classList.remove('active');
  }

  // ─── Font Size ───────────────────────────────────
  function applyFontSize(size, save = true) {
    currentFontSize = Math.max(0.9, Math.min(1.5, size));
    document.documentElement.style.setProperty('--post-font-size', currentFontSize + 'rem');
    if (save) localStorage.setItem('post-font-size', currentFontSize);
  }

  // ─── Focus Mode ────────────────────────
  function toggleFocusMode() {
    focusMode = !focusMode;
    document.body.classList.toggle('focus-mode', focusMode);
    document.getElementById('focus-mode-btn')?.classList.toggle('active', focusMode);
    showToast(focusMode ? '◐ Focus mode — B&W reading' : '● Colour restored');
  }

  // ─── View counter (Netlify Function) ─────────────────────
  async function updateViews(id) {
    try {
      const res = await fetch(`/.netlify/functions/incrementViews?id=${id}`);
      const data = await res.json();
      const viewsEl = document.querySelector('.blog-views');
      if (viewsEl) viewsEl.textContent = `👁 ${data.views.toLocaleString()} views`;
    } catch {}
  }

  // ─── Helpers ───────────────────────────────────────
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function initCinematicIntro() {
    const intro = document.getElementById('post-intro');
    if (!intro) return;

    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      intro.classList.add('intro-live');
      return;
    }

    document.documentElement.classList.add('has-intro-motion');
    requestAnimationFrame(() => {
      intro.classList.add('intro-live');
    });
  }

  // ─── Event Listeners ──────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('toc-toggle-btn')?.addEventListener('click', () => tocOpen ? closeTOC() : openTOC());
    document.getElementById('toc-close')?.addEventListener('click', closeTOC);
    document.getElementById('like-btn')?.addEventListener('click', handleLike);
    document.getElementById('bookmark-btn')?.addEventListener('click', toggleBookmark);
    document.getElementById('share-btn')?.addEventListener('click', () => shareOpen ? closeShare() : openShare());
    
    document.getElementById('font-decrease')?.addEventListener('click', () => applyFontSize(currentFontSize - 0.075));
    document.getElementById('font-increase')?.addEventListener('click', () => applyFontSize(currentFontSize + 0.075));
    
    document.getElementById('width-toggle')?.addEventListener('click', () => {
      wideMode = !wideMode;
      document.getElementById('post-content')?.classList.toggle('wide', wideMode);
      document.getElementById('post-container')?.classList.toggle('wide-mode', wideMode);
      localStorage.setItem('post-wide-mode', wideMode ? '1' : '0');
    });

    document.getElementById('focus-mode-btn')?.addEventListener('click', toggleFocusMode);
    document.getElementById('copy-link-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href);
      showToast('🔗 Link copied!');
    });
  });
})();
