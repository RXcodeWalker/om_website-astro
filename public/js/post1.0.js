// Blog post page - Load individual post
(function() {
  // Get post ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  
  if (!postId) {
    window.location.href = 'blog.html';
    return;
  }
  
  // Load blog posts
  fetch('data/blog.json')
    .then(response => response.json())
    .then(posts => {
      const post = posts.find(p => p.id === postId);
      
      if (!post) {
        window.location.href = 'blog.html';
        return;
      }
      
      renderPost(post);
      updateViews(postId);
    })
    .catch(error => {
      console.error('Error loading post:', error);
      window.location.href = 'blog.html';
    });
  
  function renderPost(post) {
    const container = document.getElementById('post-content');
    
    if (!container) return;
    
    // Update page title
    document.title = `${post.title} — Om's Blog`;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');

    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }

    metaDescription.setAttribute(
      'content',
      post.excerpt
    );

    // Open Graph dynamic update
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', post.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', post.excerpt);



    // Format content - convert **text** to <strong>
    let formattedContent = post.content
      .split('\n\n')
      .map(paragraph => {
        // Check if it's a heading (wrapped in **)
        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
          const headingText = paragraph.slice(2, -2);
          return `<h2>${headingText}</h2>`;
        }
        
        // Regular paragraph - convert inline ** to <strong>
        const formatted = paragraph
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');

        return `<p>${formatted}</p>`;
      })
      .join('');

    const words = post.content.split(/\s+/).length;
    const readingTime = Math.ceil(words / 200);
    
    container.innerHTML = `
      <h1>${post.title}</h1>
      <div class="blog-meta">
        <span class="category-badge">${post.category}</span>
        <span class="blog-date">${post.date}</span>
        <span class="reading-time">⏱ ${readingTime} min read</span>
      </div>
      <div class="post-content">
        ${formattedContent}
      </div>
    `;
    fetch(`/.netlify/functions/incrementViews?id=${post.id}`)
    .then(res => res.json())
    .then(data => {
      const meta = container.querySelector('.blog-meta');

      const viewSpan = document.createElement('span');
      viewSpan.className = 'blog-date';
      viewSpan.textContent = `👀 ${data.views.toLocaleString()} reads`;

      meta.appendChild(viewSpan);
    })
    .catch(err => console.error("View counter error:", err));
  }
  async function updateViews(postId) {
  // Check if row exists
  const { data: existing, error } = await supabase
    .from('blog_views')
    .select('*')
    .eq('post_id', postId)
    .single();

  if (!existing) {
    // Insert new row
    await supabase.from('blog_views').insert({
      post_id: postId,
      views: 1
    });
    displayViews(1);
  } else {
    // Increment views
    const newCount = existing.views + 1;

    await supabase
      .from('blog_views')
      .update({ views: newCount })
      .eq('post_id', postId);

    displayViews(newCount);
  }
}

function displayViews(count) {
  const meta = document.querySelector('.blog-meta');
  if (!meta) return;

  const viewsEl = document.createElement('span');
  viewsEl.className = 'blog-date';
  viewsEl.textContent = `👁 ${count} views`;

  meta.appendChild(viewsEl);
}
})();
