// Blog page - Load and filter posts
(function() {
  let allPosts = [];
  let currentFilter = 'all';
  
  // Load blog posts
  fetch('data/blog.json')
    .then(response => response.json())
    .then(posts => {

      // SORT BY DATE (newest first)
      posts.sort((a, b) => new Date(b.date) - new Date(a.date));

      allPosts = posts;
      renderPosts(posts);
      setupFilters();
      setupSearch();
    })

    .catch(error => {
      console.error('Error loading blog posts:', error);

      const grid = document.getElementById('blog-grid');
      if (grid) {
        grid.innerHTML = `
          <article class="glass-card">
            <h3>⚠️ Failed to load posts</h3>
            <p class="text-muted">Something went wrong. Try refreshing the page.</p>
          </article>
        `;
      }
    });

  
  function renderPosts(posts) {
    const grid = document.getElementById('blog-grid');
    
    if (!grid) return;
    
    grid.innerHTML = posts.map(post => `
      <article class="glass-card glass-card-hover blog-card">
        <h3>${post.title}</h3>
        <div class="blog-meta">
          <span class="category-badge">${post.category}</span>
          <span class="blog-date">${post.date}</span>
        </div>
        <p class="blog-excerpt">${post.excerpt}</p>
        <a href="blog-post.html?id=${post.id}" class="read-more-btn">
          Read More
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      </article>
    `).join('');

    grid.style.opacity = "0";
    setTimeout(() => {
      grid.style.opacity = "1";
    }, 50);
    
    // Animate cards
    const cards = grid.querySelectorAll('.blog-card');
    cards.forEach((card, index) => {
      card.style.animation = `fadeIn 0.5s ease ${index * 0.05}s forwards`;
      card.style.opacity = '0';
    });
  }
  
  function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        currentFilter = filter;
        
        // Update active state
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Filter posts
        const filteredPosts = filter === 'all' 
          ? allPosts 
          : allPosts.filter(post => post.category === filter);
        
        // Hide all cards first
        const cards = document.querySelectorAll('.blog-card');
        cards.forEach(card => {
          card.classList.add('hidden');
        });
        
        // Render filtered posts after a short delay
        setTimeout(() => {
          renderPosts(filteredPosts);
        }, 300);
      });
    });
  }

  function setupSearch() {
  const searchInput = document.getElementById('search-input');

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();

    const filtered = allPosts.filter(post =>
      post.title.toLowerCase().includes(query) ||
      post.excerpt.toLowerCase().includes(query)
    );

    renderPosts(filtered);
  });
}

})();

