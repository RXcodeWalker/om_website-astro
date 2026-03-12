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
  function initTOC() {
    let attempts = 0;
    const interval = setInterval(() => {
      const headings = document.getElementById('post-body')?.querySelectorAll('h2, h3');
      if ((headings && headings.length > 0) || attempts > 10) {
        clearInterval(interval);
        buildTOC();
        initScrollTracking();
      }
      attempts++;
    }, 100);
  }
  initTOC();

  // ─── TOC Builder ─────────────────────────────────
  function buildTOC() {
    const tocNav = document.getElementById('toc-nav');
    const premiumTocNav = document.getElementById('premium-toc-nav');
    if (!tocNav && !premiumTocNav) return;

    // Search specifically in the editorial body
    const content = document.getElementById('post-body');
    if (!content) return;

    const headings = Array.from(content.querySelectorAll('h2, h3'));
    if (headings.length === 0) {
      if (tocNav) tocNav.innerHTML = '<p class="toc-empty">No sections found.</p>';
      if (premiumTocNav) premiumTocNav.innerHTML = '<p class="toc-empty">No sections found.</p>';
      return;
    }

    const list = document.createElement('ul');
    headings.forEach((h, i) => {
      if (!h.id) h.id = slugify(h.textContent) + '-' + i;
      
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#' + h.id;
      link.className = 'toc-link ' + (h.tagName === 'H3' ? 'h3' : '');
      link.textContent = h.textContent;
      link.dataset.target = h.id;
      
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.getElementById(h.id);
        if (target) {
          const top = target.getBoundingClientRect().top + window.pageYOffset - 100;
          window.scrollTo({ top, behavior: 'smooth' });
        }
        if (window.innerWidth < 769) closeTOC();
      });

      item.appendChild(link);
      list.appendChild(item);
    });

    if (tocNav) {
      tocNav.innerHTML = '';
      tocNav.appendChild(list.cloneNode(true));
      // Bind listeners for standard TOC
      tocNav.querySelectorAll('a').forEach((link, idx) => {
        link.addEventListener('click', e => {
          e.preventDefault();
          const target = headings[idx];
          const top = target.getBoundingClientRect().top + window.pageYOffset - 100;
          window.scrollTo({ top, behavior: 'smooth' });
          if (window.innerWidth < 769) closeTOC();
        });
      });
    }

    if (premiumTocNav) {
      premiumTocNav.innerHTML = '';
      premiumTocNav.appendChild(list);
      // Bind listeners for premium TOC
      premiumTocNav.querySelectorAll('a').forEach((link, idx) => {
        link.addEventListener('click', e => {
          e.preventDefault();
          const target = headings[idx];
          const top = target.getBoundingClientRect().top + window.pageYOffset - 100;
          window.scrollTo({ top, behavior: 'smooth' });
        });
      });
    }
  }

  // ─── Scroll Tracking ─────────────────────────────
  function initScrollTracking() {
    const progressFill = document.getElementById('progress-ring-fill');
    const progressPercent = document.getElementById('progress-percent');
    const premiumProgressBar = document.getElementById('reading-progress-bar');
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
        progressFill.style.stroke = `color-mix(in srgb, var(--accent-1) ${100 - pct}%, var(--accent-2))`;
      }
      if (progressPercent) progressPercent.textContent = pct + '%';
      if (premiumProgressBar) premiumProgressBar.style.width = pct + '%';
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

    for (let i = headings.length - 1; i >= 0; i--) {
      if (headings[i].getBoundingClientRect().top <= 150) {
        activeId = headings[i].id;
        break;
      }
    }

    tocLinks.forEach(l => {
      l.classList.toggle('active', l.dataset.target === activeId);
    });
  }

  // ─── Like System ─────────────────────────────────
  async function initLikes(id) {
    liked = localStorage.getItem('liked-' + id) === '1';
    updateLikeUI();
    fetchLikes(id);
  }

  async function fetchLikes(id) {
    const client = window.supabaseClient;
    if (!client) return;

    try {
      const { data, error } = await client
        .from('post_views')
        .select('likes')
        .eq('post_id', id)
        .maybeSingle();
      
      if (data && typeof data.likes === 'number') {
        updateLikesDisplay(data.likes);
      }
    } catch (err) {
      console.error('Error fetching likes:', err);
    }
  }

  async function handleLike() {
    if (liked) {
      showToast('Already liked! 💖');
      return;
    }

    const client = window.supabaseClient;
    if (!client) return;

    liked = true;
    localStorage.setItem('liked-' + postId, '1');
    updateLikeUI();
    showToast('Thanks for the love! ❤️');

    try {
      // Optimistic update
      const currentLikes = parseInt(document.querySelector('.blog-likes')?.textContent || '0');
      updateLikesDisplay(currentLikes + 1);

      // We'll reuse the logic from views or create a new incrementLikes if available.
      // Since I don't see a dedicated incrementLikes netlify function, 
      // I'll try to update directly via client if permissions allow, 
      // but usually these require a secure function.
      // For now, I'll update the Supabase record directly if it exists.
      
      const { data } = await client.rpc('increment_likes', { post_id_input: postId });
      if (data) updateLikesDisplay(data);
    } catch (err) {
      console.error('Error updating likes:', err);
    }
  }

  function updateLikeUI() {
    const btn = document.getElementById('like-btn');
    if (btn) btn.classList.toggle('liked', liked);
  }

  function updateLikesDisplay(count) {
    const likesEl = document.querySelector('.blog-likes');
    if (likesEl) likesEl.textContent = count.toLocaleString();
    const sidebarCount = document.getElementById('like-count');
    if (sidebarCount) {
      sidebarCount.textContent = count > 0 ? count : '';
      sidebarCount.classList.toggle('visible', count > 0);
    }
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
  function initEvents() {
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
    
    const copyLinkHandler = () => {
      navigator.clipboard.writeText(window.location.href);
      showToast('🔗 Link copied!');
    };
    document.getElementById('share-copy')?.addEventListener('click', copyLinkHandler);
    document.getElementById('copy-link-btn')?.addEventListener('click', copyLinkHandler);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
  } else {
    initEvents();
  }
})();
