// Blog page - editorial index controls, filtering, and command-bar search
(function() {
  let allPosts = Array.isArray(window.allPosts) ? [...window.allPosts] : [];
  let currentFilter = 'all';
  let currentQuery = '';

  const featuredStory = document.getElementById('featured-story');
  const grid = document.getElementById('blog-grid');
  const filterRail = document.getElementById('blog-filter-rail');
  const filterIndicator = document.getElementById('filter-indicator');
  const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
  const searchInput = document.getElementById('search-input');
  const searchStatus = document.getElementById('search-status');
  const searchClear = document.getElementById('search-clear');
  const resultsSummary = document.getElementById('results-summary');

  if (!grid || !searchInput || !filterRail || !filterIndicator || !filterButtons.length) {
    return;
  }

  sortPosts(allPosts);
  hydrateCounts();
  bindEvents();
  toggleClearButton();
  render();

  function bindEvents() {
    // Event delegation for grid cards
    grid.addEventListener('click', (event) => {
      const card = event.target.closest('.blog-card');
      if (card && !event.target.closest('a, button')) {
        const link = card.querySelector('.read-more-btn');
        if (link) {
          if (typeof playSound === 'function') playSound('click');
          link.click();
        }
      }
    });

    // Event delegation for featured story
    featuredStory?.addEventListener('click', (event) => {
      if (!event.target.closest('a, button')) {
        const link = featuredStory.querySelector('.featured-read-more');
        if (link) {
          if (typeof playSound === 'function') playSound('click');
          link.click();
        }
      }
    });

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        currentFilter = button.dataset.filter || 'all';
        updateActiveFilter(button);
        render();
      });
    });

    searchInput.addEventListener('input', (event) => {
      currentQuery = event.target.value.trim();
      toggleClearButton();
      render();
    });

    searchClear?.addEventListener('click', () => {
      currentQuery = '';
      searchInput.value = '';
      toggleClearButton();
      render();
      searchInput.focus();
    });

    window.addEventListener('resize', syncFilterIndicator);

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTypingContext = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      if ((event.key === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !isTypingContext)) {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
      }

      if (event.key === 'Escape' && document.activeElement === searchInput && searchInput.value) {
        searchClear?.click();
      }
    });
  }

  function render() {
    const filteredPosts = getFilteredPosts();
    
    // If we're in "Bookmarks" mode, don't use the lead story layout
    if (currentFilter === 'bookmarks') {
      renderFeatured(null);
      renderGrid(filteredPosts);
    } else {
      const leadPost = filteredPosts.find((post) => post.featured) || filteredPosts[0] || null;
      const supportingPosts = leadPost
        ? filteredPosts.filter((post) => post.id !== leadPost.id)
        : [];

      renderFeatured(leadPost);
      renderGrid(supportingPosts);
    }
    
    updateStatus(filteredPosts.length, getSupportingCount(filteredPosts));
    syncFilterIndicator();
  }

  function getSupportingCount(filteredPosts) {
    if (currentFilter === 'bookmarks' || !filteredPosts.length) return filteredPosts.length;
    return filteredPosts.length - 1; // total minus lead
  }

  function renderFeatured(post) {
    if (!featuredStory) return;

    if (!post) {
      featuredStory.hidden = true;
      featuredStory.innerHTML = '';
      return;
    }

    featuredStory.hidden = false;
    featuredStory.dataset.featuredId = post.id;
    featuredStory.innerHTML = `
      <div class="featured-story-copy">
        <p class="featured-kicker">Lead Story</p>
        <div class="featured-story-meta">
          <span class="category-badge">${escapeHtml(post.category)}</span>
          <span class="featured-story-date">${escapeHtml(post.date)}</span>
        </div>
        <h2>${highlightText(post.title, currentQuery)}</h2>
        <p class="featured-story-excerpt">${highlightText(post.excerpt, currentQuery)}</p>

        <div class="featured-story-footer">
          <a href="${postHref(post.slug)}" class="featured-read-more">
            Read the full piece
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
          <p class="featured-story-note">A strong place to start if you want the tone of the archive fast.</p>
        </div>
      </div>

      <div class="featured-story-side" aria-hidden="true">
        <div class="featured-story-orb"></div>
        <p class="featured-side-label">Editorial Pick</p>
        <p class="featured-side-copy">
          Selected as the lead read for this archive view. Expect a longer, sharper argument than the rest of the wall.
        </p>
        <div class="featured-side-stat">
          <span>Archive</span>
          <strong>${allPosts.length} stories</strong>
        </div>
      </div>
    `;
  }

  function renderGrid(posts) {
    let emptyStateHtml = '';
    
    if (!posts.length) {
      if (currentFilter === 'bookmarks' && !currentQuery) {
        emptyStateHtml = `
          <article class="glass-card empty-state-card">
            <p class="empty-state-kicker">Your library is empty</p>
            <h3>You haven't bookmarked any stories yet.</h3>
            <p class="blog-excerpt">Browse the archive and use the bookmark icon on any post to save it here for later.</p>
            <button class="read-more-btn empty-reset-btn" type="button">Browse archive</button>
          </article>
        `;
      } else {
        emptyStateHtml = `
          <article class="glass-card empty-state-card">
            <p class="empty-state-kicker">No exact matches</p>
            <h3>Nothing landed for "${escapeHtml(currentQuery || currentFilter)}".</h3>
            <p class="blog-excerpt">Try a broader phrase, switch categories, or clear the search to reopen the full archive wall.</p>
            <button class="read-more-btn empty-reset-btn" type="button">Reset search</button>
          </article>
        `;
      }
    }

    grid.innerHTML = posts.length
      ? posts.map((post, index) => `
          <article class="glass-card glass-card-hover blog-card" data-post-id="${escapeAttribute(post.id)}" style="--card-delay:${index * 70}ms;">
            <p class="blog-card-kicker">From the notebook</p>
            <h3>${highlightText(post.title, currentQuery)}</h3>
            <div class="blog-meta">
              <span class="category-badge">${escapeHtml(post.category)}</span>
              <span class="blog-date">${escapeHtml(post.date)}</span>
            </div>
            <p class="blog-excerpt">${highlightText(post.excerpt, currentQuery)}</p>
            <a href="${postHref(post.slug)}" class="read-more-btn">
              Read More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </article>
        `).join('')
      : emptyStateHtml;

    const resetButton = grid.querySelector('.empty-reset-btn');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        currentQuery = '';
        currentFilter = 'all';
        searchInput.value = '';
        toggleClearButton();
        const allButton = filterButtons.find((button) => button.dataset.filter === 'all');
        if (allButton) {
          updateActiveFilter(allButton);
        }
        render();
      });
    }
  }

  function renderPreviewStrips(post, variant = 'card') {
    const readTime = clampPreviewText(post.readTime || 'Quick read');
    const ideas = normalizeIdeas(post.keyIdeas, post.excerpt);
    const strikingLine = clampPreviewText(post.strikingLine || post.excerpt, 170);
    const variantClass = variant === 'featured' ? 'is-featured' : '';

    return `
      <section class="post-preview-strips ${variantClass}" aria-label="Inside this post preview">
        <p class="preview-label">Inside this post</p>
        <p class="preview-strip preview-read-time">
          <span>Read time</span>
          <strong>${escapeHtml(readTime)}</strong>
        </p>
        <ul class="preview-ideas" aria-hidden="true">
          ${ideas.map((idea) => `<li class="preview-strip">${escapeHtml(idea)}</li>`).join('')}
        </ul>
        <p class="preview-strip preview-line">"${escapeHtml(strikingLine)}"</p>
      </section>
    `;
  }

  function normalizeIdeas(ideas, fallbackText) {
    const list = Array.isArray(ideas) ? ideas : [];
    const cleaned = list
      .map((idea) => clampPreviewText(idea, 84))
      .filter(Boolean)
      .slice(0, 3);

    if (cleaned.length === 3) return cleaned;

    const fallback = clampPreviewText(fallbackText || 'Read the full article for the key ideas.', 84);
    while (cleaned.length < 3) {
      cleaned.push(fallback);
    }

    return cleaned;
  }

  function clampPreviewText(value, maxLength = 94) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;

    const slice = text.slice(0, maxLength);
    const lastSpace = slice.lastIndexOf(' ');
    const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
    return `${trimmed.trim()}...`;
  }

  function getFilteredPosts() {
    const tokens = tokenize(currentQuery);
    const bookmarks = JSON.parse(localStorage.getItem('post-bookmarks') || '{}');

    return allPosts.filter((post) => {
      // Handle "Bookmarks" filter
      if (currentFilter === 'bookmarks') {
        if (!bookmarks[post.id]) return false;
      } else if (currentFilter !== 'all' && post.category !== currentFilter) {
        return false;
      }

      if (!tokens.length) {
        return true;
      }

      const searchable = [post.title, post.excerpt, post.category].join(' ').toLowerCase();
      return tokens.every((token) => searchable.includes(token));
    });
  }

  function hydrateCounts() {
    const bookmarks = JSON.parse(localStorage.getItem('post-bookmarks') || '{}');
    const counts = allPosts.reduce((accumulator, post) => {
      accumulator.all += 1;
      accumulator[post.category] = (accumulator[post.category] || 0) + 1;
      if (bookmarks[post.id]) {
        accumulator.bookmarks = (accumulator.bookmarks || 0) + 1;
      }
      return accumulator;
    }, { all: 0, bookmarks: 0 });

    document.querySelectorAll('.filter-count').forEach((badge) => {
      const filter = badge.dataset.countFor;
      badge.textContent = String(counts[filter] || 0);
    });
  }

  function updateStatus(totalResults, supportingCount) {
    const queryText = currentQuery ? `"${currentQuery}"` : '';
    const filterLabel = currentFilter === 'all' ? 'all stories' : currentFilter + ' stories';

    if (searchStatus) {
      if (currentQuery) {
        searchStatus.textContent = totalResults
          ? `${totalResults} result${totalResults === 1 ? '' : 's'} for ${queryText}.`
          : `No results for ${queryText}.`;
      } else if (currentFilter !== 'all') {
        searchStatus.textContent = `Showing ${filterLabel}.`;
      } else {
        searchStatus.textContent = 'Search titles, excerpts, and categories.';
      }
    }

    if (resultsSummary) {
      resultsSummary.textContent = supportingCount
        ? `${supportingCount} supporting ${supportingCount === 1 ? 'story' : 'stories'}`
        : totalResults
          ? 'Lead story only'
          : '0 supporting stories';
    }
  }

  function updateActiveFilter(activeButton) {
    filterButtons.forEach((button) => {
      const isActive = button === activeButton;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    syncFilterIndicator();
  }

  function syncFilterIndicator() {
    const activeButton = filterButtons.find((button) => button.classList.contains('active'));
    if (!activeButton) return;

    const railRect = filterRail.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const left = buttonRect.left - railRect.left;

    filterIndicator.style.width = `${buttonRect.width}px`;
    filterIndicator.style.transform = `translateX(${left}px)`;
  }

  function toggleClearButton() {
    if (!searchClear) return;
    searchClear.hidden = !currentQuery.length;
  }

  function sortPosts(posts) {
    posts.sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }

  function dateValue(value) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function postHref(slug) {
    return `/blog/${encodeURIComponent(slug)}`;
  }

  function tokenize(value) {
    return value.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function highlightText(value, query) {
    const text = String(value || '');
    const tokens = tokenize(query);

    if (!tokens.length) {
      return escapeHtml(text);
    }

    const matcher = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'ig');
    return text
      .split(matcher)
      .map((part) => tokens.includes(part.toLowerCase())
        ? `<mark>${escapeHtml(part)}</mark>`
        : escapeHtml(part))
      .join('');
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }
})();
