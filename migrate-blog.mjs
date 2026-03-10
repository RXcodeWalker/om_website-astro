import fs from 'fs';
import path from 'path';

const blogDataPath = path.join(process.cwd(), 'public', 'data', 'blog.json');
const contentDir = path.join(process.cwd(), 'src', 'content', 'blog');

if (!fs.existsSync(contentDir)) {
  fs.mkdirSync(contentDir, { recursive: true });
}

const blogPosts = JSON.parse(fs.readFileSync(blogDataPath, 'utf8'));

blogPosts.forEach((post) => {
  if (!post || !post.id) {
    console.warn('Skipping invalid post:', post);
    return;
  }
  const slug = post.id.toString().toLowerCase().replace(/[^a-z0-9]/g, '-');
  const filePath = path.join(contentDir, `${slug}.md`);

  const frontmatter = {
    title: post.title,
    date: post.date,
    category: post.category,
    excerpt: post.excerpt,
    id: post.id.toString(),
    featured: post.featured || false,
    link: post.link || '',
  };

  const frontmatterString = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');

  const content = `---
${frontmatterString}
---

${post.content}
`;

  fs.writeFileSync(filePath, content);
  console.log(`Migrated: ${slug}.md`);
});
