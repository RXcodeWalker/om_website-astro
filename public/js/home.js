// =========================================================
//  HOME PAGE — Latest blog post + Desktop brand typewriter
// =========================================================

(function () {

  // ── Latest Blog Post ───────────────────────────────────
  fetch('data/blog.json')
    .then(res => res.json())
    .then(posts => {
      const latest    = posts[0];
      const container = document.getElementById('latest-post');
      if (!container || !latest) return;

      container.innerHTML = `
        <h3>${latest.title}</h3>
        <div class="blog-meta">
          <span class="category-badge">${latest.category}</span>
          <span class="blog-date">${latest.date}</span>
        </div>
        <p class="text-muted">${latest.excerpt}</p>
        <a href="blog-post.html?id=${latest.id}" class="btn-link">
          Explore Blog
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      `;
    })
    .catch(err => console.error('Error loading blog posts:', err));
  
})();