import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const page = read('../src/pages/about.astro');

describe('about page source', () => {
  it('loads now and published projects instead of hardcoding work', () => {
    expect(page).toContain("getCollection('now')");
    expect(page).toContain("getCollection('projects')");
    expect(page).toContain('publishedProjects');
    expect(page).toContain('NowBand');
    expect(page).toContain('relatedProjectHref(now.project, publishedIds)');
    expect(page).toContain('variant="compact"');
    expect(page).not.toContain('French Coach');
    expect(page).not.toContain('Line-Follower');
    expect(page).not.toContain('french-coach');
    expect(page).not.toContain('robot');
  });

  it('does not add a timeline, Four things grid, or Harvard YLC', () => {
    expect(page).not.toContain('timeline');
    expect(page).not.toContain('Four things');
    expect(page).not.toContain('interest-list');
    expect(page).not.toContain('Harvard YLC');
    expect(page).not.toContain('Youth Lead the Change');
    expect(existsSync(fileURLToPath(new URL('../src/data/timeline.yaml', import.meta.url)))).toBe(
      false,
    );
  });

  it('keeps inner-page BreadcrumbList JSON-LD rather than a second Person graph', () => {
    expect(page).toContain('jsonLd="BreadcrumbList"');
    expect(page).not.toContain('jsonLd="Person"');
  });

  it('keeps the Ashoka write-up as a real existing link, not a new biography dump', () => {
    expect(page).toContain(
      'https://blog.beyondthebasics.me/article/my-summer-at-ashoka-university',
    );
  });
});

describe('now band wiring', () => {
  const nowYaml = read('../src/data/now.yaml');
  const nowBand = read('../src/components/patterns/NowBand.astro');

  it('names french-coach from YAML and only links when projectHref is passed', () => {
    expect(nowYaml).toMatch(/^  project: french-coach$/m);
    expect(nowBand).toContain('projectHref?: string');
    expect(nowBand).toContain('projectHref &&');
    expect(nowBand).toContain('Related project');
    expect(nowBand).not.toContain('french-coach');
  });
});
