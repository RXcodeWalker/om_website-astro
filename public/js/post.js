// ═══════════════════════════════════════════════
//  post.js — Enhanced Blog Post Experience
//  Features: TOC · Likes · Bookmarks · Share · Font Size
//            Width Toggle · Focus Mode · Progress Ring
//            Reading Time Left · Toast Notifications
// ═══════════════════════════════════════════════

(function () {

  // ─── SVG Gradient for progress ring ─────────────
  const defs = document.createElementNS('http://www.w3.org/2000/svg','svg');
  defs.innerHTML = `
    <defs>
      <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--accent-1)"/>
        <stop offset="100%" stop-color="var(--accent-2)"/>
      </linearGradient>
    </defs>`;
  defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  document.body.prepend(defs);

  // ─── URL / Post ID ───────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  if (!postId) { window.location.href = 'blog.html'; return; }

  // ─── State ───────────────────────────────────────
  let currentFontSize = parseFloat(localStorage.getItem('post-font-size') || 1.1);
  let wideMode = localStorage.getItem('post-wide-mode') === '1';
  let lineSpacingExpanded = localStorage.getItem('post-line-spacing') === '1';
  let focusMode = false;
  let tocOpen = false;
  let shareOpen = false;
  let liked = false;
  let bookmarked = false;
  let postTitle = '';
  let totalWords = 0;

  // ─── Apply persisted prefs immediately ───────────
  applyFontSize(currentFontSize, false);
  if (wideMode) document.getElementById('post-content')?.classList.add('wide');
  if (lineSpacingExpanded) document.documentElement.style.setProperty('--post-line-height', '2.25');

  // ─── Load post ───────────────────────────────────
  fetch('data/blog.json')
    .then(r => r.json())
    .then(posts => {
      const post = posts.find(p => p.id === postId);
      if (!post) { window.location.href = 'blog.html'; return; }
      renderPost(post);
      updateViews(postId);
      initLikes(postId);
    })
    .catch(() => { window.location.href = 'blog.html'; });

  // ─── Render Post ─────────────────────────────────
  function renderPost(post) {
    const container = document.getElementById('post-content');
    if (!container) return;

    postTitle = post.title;

    // Page meta
    document.title = `${post.title} — Om's Blog`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', post.excerpt);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', post.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', post.excerpt);

    // Format content
    let formattedContent = post.content
      .split('\n\n')
      .map(para => {
        if (para.startsWith('**') && para.endsWith('**')) {
          const headingText = para.slice(2, -2);
          const id = slugify(headingText);
          return `<h2 id="${id}">${headingText}</h2>`;
        }
        const formatted = para
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');
        return `<p>${formatted}</p>`;
      })
      .join('');

    totalWords = post.content.split(/\s+/).length;
    const readingTime = Math.ceil(totalWords / 200);

    // Check bookmark state
    const bookmarks = JSON.parse(localStorage.getItem('post-bookmarks') || '{}');
    bookmarked = !!bookmarks[postId];

    container.innerHTML = `
      <h1>${post.title}</h1>
      <div class="blog-meta" id="post-meta">
        <span class="category-badge">${post.category}</span>
        <span class="blog-date">${post.date}</span>
        <span class="reading-time">⏱ ${readingTime} min read</span>
        <span class="blog-date time-remaining" id="time-remaining"></span>
      </div>
      <div class="post-content" id="post-body">
        ${formattedContent}
      </div>
      <div class="post-footer">
        <div class="post-footer-left">
          <span class="blog-date">Thanks for reading!</span>
        </div>
        <div class="post-footer-actions">
          <button class="read-more-btn footer-like-btn" id="footer-like-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Like this post
          </button>
        </div>
      </div>
    `;

    // Apply persisted state
    const postBody = document.getElementById('post-body');
    applyFontSize(currentFontSize, false);
    if (lineSpacingExpanded) postBody.style.lineHeight = '2.25';
    if (wideMode) container.classList.add('wide');
    if (wideMode) document.getElementById('post-container')?.classList.add('wide-mode');

    // Update bookmark button
    updateBookmarkUI();

    // Build TOC
    setTimeout(() => {
      buildTOC();
      initScrollTracking();
    }, 100);

    // Footer like button
    document.getElementById('footer-like-btn')?.addEventListener('click', handleLike);

    // View counter
    fetch(`/.netlify/functions/incrementViews?id=${post.id}`)
      .then(r => r.json())
      .then(data => {
        const meta = document.getElementById('post-meta');
        if (!meta) return;
        const viewSpan = document.createElement('span');
        viewSpan.className = 'blog-date';
        viewSpan.textContent = `👀 ${data.views.toLocaleString()} reads`;
        meta.appendChild(viewSpan);
      })
      .catch(() => {});
  }

  // ─── TOC Builder ─────────────────────────────────
  function buildTOC() {
    const tocNav = document.getElementById('toc-nav');
    if (!tocNav) return;

    const content = document.getElementById('post-body');
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
    const progressBar = document.getElementById('progress-bar');
    const timeRemaining = document.getElementById('time-remaining');
    const circumference = 2 * Math.PI * 18; // r=18

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      // Progress ring
      if (progressFill) {
        const offset = circumference - (pct / 100) * circumference;
        progressFill.style.strokeDashoffset = offset;
        progressFill.style.strokeDasharray = circumference;
      }
      if (progressPercent) progressPercent.textContent = pct + '%';

      // TOC bar
      if (tocProgressFill) tocProgressFill.style.width = pct + '%';

      // Time remaining
      if (timeRemaining && totalWords > 0) {
        const wordsRead = Math.round((pct / 100) * totalWords);
        const wordsLeft = totalWords - wordsRead;
        const minsLeft = Math.ceil(wordsLeft / 200);
        if (pct > 5 && pct < 98) {
          timeRemaining.textContent = `~${minsLeft} min left`;
        } else if (pct >= 98) {
          timeRemaining.textContent = '✓ Finished';
        }
      }

      // Update active TOC link
      updateActiveTOCLink();
    }, { passive: true });
  }

  function updateActiveTOCLink() {
    const tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length === 0) return;

    const headings = document.getElementById('post-body')?.querySelectorAll('h2, h3') || [];
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
    // Check if user already liked (localStorage flag)
    liked = localStorage.getItem('liked-' + id) === '1';
    updateLikeUI();

    try {
      const { data } = await supabase
        .from('blog_views')
        .select('likes')
        .eq('post_id', id)
        .single();

      if (data?.likes) {
        const likeCount = document.getElementById('like-count');
        if (likeCount) {
          likeCount.textContent = data.likes;
          likeCount.classList.add('visible');
        }
      }
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

    try {
      const { data: existing } = await supabase
        .from('blog_views').select('likes').eq('post_id', postId).single();

      const newLikes = (existing?.likes || 0) + 1;
      await supabase.from('blog_views').update({ likes: newLikes }).eq('post_id', postId);

      const likeCount = document.getElementById('like-count');
      if (likeCount) {
        likeCount.textContent = newLikes;
        likeCount.classList.add('visible');
      }
    } catch {}
  }

  function updateLikeUI() {
    const btn = document.getElementById('like-btn');
    const footerBtn = document.getElementById('footer-like-btn');
    if (btn) btn.classList.toggle('liked', liked);
    if (footerBtn) {
      footerBtn.innerHTML = liked
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ff4d6d" stroke="#ff4d6d" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Liked!`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Like this post`;
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

  // ─── TOC Toggle ──────────────────────────────────
  function openTOC() {
    tocOpen = true;
    document.getElementById('toc-panel')?.classList.add('open');
    document.getElementById('toc-toggle-btn')?.classList.add('active');
    document.getElementById('toc-panel')?.setAttribute('aria-hidden', 'false');
  }
  function closeTOC() {
    tocOpen = false;
    document.getElementById('toc-panel')?.classList.remove('open');
    document.getElementById('toc-toggle-btn')?.classList.remove('active');
    document.getElementById('toc-panel')?.setAttribute('aria-hidden', 'true');
  }

  // ─── Share Panel ─────────────────────────────────
  function openShare() {
    shareOpen = true;
    const panel = document.getElementById('share-panel');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
    document.getElementById('share-btn')?.classList.add('active');

    // Set share URLs
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(postTitle + ' — via @omjhamvar');
    document.getElementById('share-twitter')?.setAttribute('href', `https://twitter.com/intent/tweet?url=${url}&text=${text}`);
    document.getElementById('share-linkedin')?.setAttribute('href', `https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
  }
  function closeShare() {
    shareOpen = false;
    document.getElementById('share-panel')?.classList.remove('open');
    document.getElementById('share-panel')?.setAttribute('aria-hidden', 'true');
    document.getElementById('share-btn')?.classList.remove('active');
  }

  // ─── Font Size ───────────────────────────────────
  function applyFontSize(size, save = true) {
    currentFontSize = Math.max(0.9, Math.min(1.5, size));
    document.documentElement.style.setProperty('--post-font-size', currentFontSize + 'rem');
    if (save) localStorage.setItem('post-font-size', currentFontSize);
  }

  // ─── Focus Mode — NYT B&W ────────────────────────
  function toggleFocusMode() {
    focusMode = !focusMode;
    document.body.classList.toggle('focus-mode', focusMode);
    document.getElementById('focus-mode-btn')?.classList.toggle('active', focusMode);

    // Re-trigger the label animation by cloning the element
    const label = document.getElementById('focus-mode-label');
    if (label && focusMode) {
      const clone = label.cloneNode(true);
      clone.id = 'focus-mode-label';
      label.replaceWith(clone);
    }

    showToast(focusMode ? '◐ Focus mode — B&W reading' : '● Colour restored');
  }

  // ─── View counter (Supabase) ─────────────────────
  async function updateViews(id) {
    try {
      const { data: existing } = await supabase
        .from('blog_views').select('*').eq('post_id', id).single();

      if (!existing) {
        await supabase.from('blog_views').insert({ post_id: id, views: 1 });
        displayViews(1);
      } else {
        const newCount = existing.views + 1;
        await supabase.from('blog_views').update({ views: newCount }).eq('post_id', id);
        displayViews(newCount);
      }
    } catch {}
  }

  function displayViews(count) {
    const meta = document.querySelector('.blog-meta');
    if (!meta) return;
    // Remove any existing views span
    meta.querySelectorAll('.views-span').forEach(el => el.remove());
    const viewsEl = document.createElement('span');
    viewsEl.className = 'blog-date views-span';
    viewsEl.textContent = `👁 ${count.toLocaleString()} views`;
    meta.appendChild(viewsEl);
  }

  // ─── Toast ───────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  // ─── Copy to clipboard ───────────────────────────
  async function copyToClipboard(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg || '✅ Copied!');
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
      showToast(successMsg || '✅ Copied!');
    }
  }

  // ─── Slug helper ─────────────────────────────────
  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // ─── Wire up ALL buttons ──────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // TOC
    document.getElementById('toc-toggle-btn')?.addEventListener('click', () => {
      tocOpen ? closeTOC() : openTOC();
      if (shareOpen) closeShare();
    });
    document.getElementById('toc-close')?.addEventListener('click', closeTOC);

    // Like
    document.getElementById('like-btn')?.addEventListener('click', handleLike);

    // Bookmark
    document.getElementById('bookmark-btn')?.addEventListener('click', toggleBookmark);

    // Share
    document.getElementById('share-btn')?.addEventListener('click', () => {
      shareOpen ? closeShare() : openShare();
      if (tocOpen) closeTOC();
    });

    // Share panel actions
    document.getElementById('share-copy')?.addEventListener('click', () => {
      copyToClipboard(window.location.href, '🔗 Link copied!');
    });

    // Font size
    document.getElementById('font-decrease')?.addEventListener('click', () => {
      applyFontSize(currentFontSize - 0.075);
      showToast('A- Smaller text');
    });
    document.getElementById('font-increase')?.addEventListener('click', () => {
      applyFontSize(currentFontSize + 0.075);
      showToast('A+ Larger text');
    });

    // Line spacing
    document.getElementById('line-spacing-btn')?.addEventListener('click', () => {
      lineSpacingExpanded = !lineSpacingExpanded;
      const postBody = document.getElementById('post-body');
      if (postBody) postBody.style.lineHeight = lineSpacingExpanded ? '2.25' : '';
      document.documentElement.style.setProperty('--post-line-height', lineSpacingExpanded ? '2.25' : '1.9');
      localStorage.setItem('post-line-spacing', lineSpacingExpanded ? '1' : '0');
      document.getElementById('line-spacing-btn')?.classList.toggle('active', lineSpacingExpanded);
      showToast(lineSpacingExpanded ? 'Line spacing: Wide' : 'Line spacing: Normal');
    });

    // Width toggle
    document.getElementById('width-toggle')?.addEventListener('click', () => {
      wideMode = !wideMode;
      document.getElementById('post-content')?.classList.toggle('wide', wideMode);
      document.getElementById('post-container')?.classList.toggle('wide-mode', wideMode);
      document.getElementById('width-toggle')?.classList.toggle('active', wideMode);
      localStorage.setItem('post-wide-mode', wideMode ? '1' : '0');
      showToast(wideMode ? '⟺ Wide reading mode' : '⟼ Normal width');
    });

    // Focus mode
    document.getElementById('focus-mode-btn')?.addEventListener('click', toggleFocusMode);

    // NOTE: #ambient-toggle, #theme-toggle, #cursor-toggle are wired
    // automatically by sound.js, theme.js, and cursor.js respectively —
    // no manual handlers needed here.

    // Print
    document.getElementById('print-btn')?.addEventListener('click', () => {
      showToast('Preparing print…');
      setTimeout(() => window.print(), 400);
    });

    // Copy link
    document.getElementById('copy-link-btn')?.addEventListener('click', () => {
      copyToClipboard(window.location.href, '🔗 Link copied!');
    });

    // Close panels on outside click
    document.addEventListener('click', e => {
      if (tocOpen) {
        const panel = document.getElementById('toc-panel');
        const btn = document.getElementById('toc-toggle-btn');
        if (panel && !panel.contains(e.target) && !btn?.contains(e.target)) closeTOC();
      }
      if (shareOpen) {
        const panel = document.getElementById('share-panel');
        const btn = document.getElementById('share-btn');
        if (panel && !panel.contains(e.target) && !btn?.contains(e.target)) closeShare();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeTOC(); closeShare(); if (focusMode) toggleFocusMode(); }
      if (e.key === 'f' && e.metaKey) { e.preventDefault(); toggleFocusMode(); }
      if (e.key === '+' && e.metaKey) { e.preventDefault(); applyFontSize(currentFontSize + 0.075); showToast('A+ Larger text'); }
      if (e.key === '-' && e.metaKey) { e.preventDefault(); applyFontSize(currentFontSize - 0.075); showToast('A- Smaller text'); }
    });

    // Apply persisted line spacing active state
    if (lineSpacingExpanded) {
      document.getElementById('line-spacing-btn')?.classList.add('active');
    }
    if (wideMode) {
      document.getElementById('width-toggle')?.classList.add('active');
    }
  });

})();