import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { SchemaContext } from 'astro:content';
import { z } from 'astro/zod';
import { projectSchema } from '../src/schemas/project';
import { projectIndexSections, publishedProjects } from '../src/utils/projects';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

// image() is unused in these cases (thumbnail omitted). The cast matches
// SchemaContext without duplicating Astro's ImageMetadata object schema.
const schema = projectSchema({
  image: (() => z.any()) as unknown as SchemaContext['image'],
});

const baseProject = {
  title: 'Test project',
  outcome: 'A short outcome line for schema tests.',
  summary:
    'This summary is long enough to clear the eighty character floor required by the project schema for index and meta descriptions.',
  category: 'web' as const,
  status: 'shipped' as const,
  year: 2026,
  stack: ['Astro'],
  order: 1,
};

describe('projects index source', () => {
  const page = read('../src/pages/projects.astro');

  it("loads the projects collection with getCollection('projects')", () => {
    expect(page).toContain("getCollection('projects')");
  });

  it('does not hardcode project titles or slugs', () => {
    expect(page).not.toContain('French Coach');
    expect(page).not.toContain('Line-Follower');
    expect(page).not.toContain('french-coach');
    expect(page).not.toContain('robot');
  });

  it('has no filter or search controls', () => {
    expect(page).not.toMatch(/<form\b/i);
    expect(page).not.toMatch(/<input\b/i);
    expect(page).not.toMatch(/type=["']search["']/i);
    expect(page).not.toMatch(/\b(search|filter)(ing)?\s*(ui|control|form)/i);
  });
});

describe('project schema — links or linksNote', () => {
  it('rejects a project with neither links nor linksNote', () => {
    const result = schema.safeParse(baseProject);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'links')).toBe(true);
    }
  });

  it('accepts a project with links and no linksNote', () => {
    const result = schema.safeParse({
      ...baseProject,
      links: [{ label: 'Live', href: 'https://example.com', kind: 'live' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a project with linksNote and no links', () => {
    const result = schema.safeParse({
      ...baseProject,
      linksNote: 'Nothing is public yet.',
    });
    expect(result.success).toBe(true);
  });

  it('defaults featured to false', () => {
    const result = schema.parse({
      ...baseProject,
      linksNote: 'Nothing is public yet.',
    });
    expect(result.featured).toBe(false);
  });
});

describe('project content — no fabricated claims', () => {
  const frenchCoach = read('../src/content/projects/french-coach/index.mdx');
  const robot = read('../src/content/projects/robot/index.mdx');

  it('includes the verified French Coach GitHub URL', () => {
    expect(frenchCoach).toContain('https://github.com/RXcodeWalker/french-coach');
    expect(frenchCoach).toContain('https://french.beyondthebasics.me');
  });

  it('does not invent a robot repository or metrics', () => {
    expect(robot).not.toMatch(/github\.com/i);
    expect(robot).not.toMatch(/^metrics:/m);
    expect(robot).not.toMatch(/\b\d+\s+(users|downloads|stars|awards)\b/i);
  });
});

describe('featured split', () => {
  const entry = (id: string, order: number, featured: boolean, draft = false) => ({
    id,
    data: { draft, order, featured },
  });

  it('drops drafts then sorts by order before the split', () => {
    const published = publishedProjects([
      entry('c', 3, true),
      entry('draft', 0, true, true),
      entry('a', 1, false),
      entry('b', 2, true),
    ]);
    expect(published.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('renders every published project as remaining rows when none are featured', () => {
    const published = publishedProjects([
      entry('b', 2, false),
      entry('a', 1, false),
    ]);
    const sections = projectIndexSections(published);
    expect(sections.featured).toEqual([]);
    expect(sections.remaining.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('splits featured then remaining when some but not all are featured', () => {
    const published = publishedProjects([
      entry('c', 3, false),
      entry('a', 1, true),
      entry('b', 2, false),
    ]);
    const sections = projectIndexSections(published);
    expect(sections.featured.map((item) => item.id)).toEqual(['a']);
    expect(sections.remaining.map((item) => item.id)).toEqual(['b', 'c']);
  });

  it('renders every published project as remaining rows when all are featured', () => {
    const published = publishedProjects([
      entry('b', 2, true),
      entry('a', 1, true),
    ]);
    const sections = projectIndexSections(published);
    expect(sections.featured).toEqual([]);
    expect(sections.remaining.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('keeps deterministic order across multiple featured entries', () => {
    const published = publishedProjects([
      entry('d', 4, false),
      entry('b', 2, true),
      entry('c', 3, true),
      entry('a', 1, true),
    ]);
    const sections = projectIndexSections(published);
    expect(sections.featured.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(sections.remaining.map((item) => item.id)).toEqual(['d']);
  });
});

describe('homepage ignores featured', () => {
  const homepage = read('../src/pages/index.astro');

  it('renders compact entries sorted by order and does not split featured', () => {
    expect(homepage).toContain('variant="compact"');
    expect(homepage).not.toContain('projectIndexSections');
    expect(homepage).not.toContain('variant="featured"');
  });
});
