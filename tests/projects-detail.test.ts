import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  nextPublishedProject,
  publishedProjects,
  tocH2s,
} from '../src/utils/projects';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const entry = (id: string, order: number, draft = false) => ({
  id,
  data: { draft, order, featured: false },
});

const heading = (text: string, depth = 2) => ({
  depth,
  slug: text.toLowerCase().replace(/\s+/g, '-'),
  text,
});

describe('publishedProjects sort', () => {
  it('drops drafts then sorts by order and id', () => {
    const published = publishedProjects([
      entry('c', 2),
      entry('draft', 0, true),
      entry('b', 1),
      entry('a', 1),
    ]);
    expect(published.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('nextPublishedProject', () => {
  it('wraps on two items', () => {
    const published = [entry('french-coach', 1), entry('robot', 2)];
    expect(nextPublishedProject(published, 'french-coach')?.id).toBe('robot');
    expect(nextPublishedProject(published, 'robot')?.id).toBe('french-coach');
  });

  it('returns null on one item and never the same id', () => {
    const published = [entry('only', 1)];
    expect(nextPublishedProject(published, 'only')).toBeNull();
  });

  it('uses the given list as-is and does not re-sort', () => {
    const unsorted = [entry('b', 2), entry('a', 1)];
    expect(nextPublishedProject(unsorted, 'b')?.id).toBe('a');
  });
});

describe('TOC helper', () => {
  it('returns empty when there are fewer than four h2s', () => {
    expect(tocH2s([heading('One'), heading('Two'), heading('Three')])).toEqual([]);
  });

  it('returns those h2 slugs when there are four', () => {
    const headings = [
      heading('Overview'),
      heading('Why I Built It'),
      heading('How it works'),
      heading('Challenges'),
    ];
    expect(tocH2s(headings).map((item) => item.slug)).toEqual([
      'overview',
      'why-i-built-it',
      'how-it-works',
      'challenges',
    ]);
  });
});

describe('[slug].astro source', () => {
  const page = read('../src/pages/projects/[slug].astro');

  it('builds static paths from publishedProjects and render(', () => {
    expect(page).toContain('getStaticPaths');
    expect(page).toContain('publishedProjects');
    expect(page).toContain('render(');
  });

  it('does not hardcode project titles or slugs', () => {
    expect(page).not.toContain('French Coach');
    expect(page).not.toContain('Line-Follower');
    expect(page).not.toContain('french-coach');
    expect(page).not.toContain('robot');
  });
});

describe('content honesty', () => {
  const frenchCoach = read('../src/content/projects/french-coach/index.mdx');
  const robot = read('../src/content/projects/robot/index.mdx');

  it('keeps French Coach live, GitHub, essay, and thumbnail', () => {
    expect(frenchCoach).toContain('https://french.beyondthebasics.me');
    expect(frenchCoach).toContain('https://github.com/RXcodeWalker/french-coach');
    expect(frenchCoach).toContain(
      'https://blog.beyondthebasics.me/article/why-i-started-building-french-coach',
    );
    expect(frenchCoach).toContain('thumbnail:');
    expect(frenchCoach).not.toMatch(/^metrics:/m);
    expect(frenchCoach).not.toMatch(/^journey:/m);
  });

  it('keeps robot as a note-only prototype without unused headings', () => {
    expect(robot).toContain('linksNote:');
    expect(robot).not.toMatch(/github\.com/i);
    expect(robot).not.toMatch(/^##\s+Results/m);
    expect(robot).not.toMatch(/^##\s+Gallery/m);
    expect(robot).not.toMatch(/^##\s+What I'?d Do Next/m);
  });
});

describe('listing hrefs', () => {
  const files = [
    read('../src/pages/index.astro'),
    read('../src/pages/projects.astro'),
    read('../src/components/patterns/ProjectEntry.astro'),
  ];

  it('points listings at /projects/${ not hash fragments', () => {
    for (const source of files) {
      expect(source).toContain('/projects/${');
      expect(source).not.toContain('/projects#');
    }
  });
});
