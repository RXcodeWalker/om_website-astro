import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { achievementSchema } from '../src/schemas/achievement';
import {
  achievementGroups,
  relatedProjectHref,
  sortAchievementsNewestFirst,
} from '../src/utils/achievements';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const yaml = read('../src/data/achievements.yaml');
const page = read('../src/pages/achievements.astro');
const item = read('../src/components/patterns/AchievementItem.astro');
const homepage = read('../src/pages/index.astro');

const yamlIds = [...yaml.matchAll(/^- id: (\S+)/gm)].map((match) => match[1]);

const yamlBlock = (id: string) => {
  const parts = yaml.split(/^- id: /m).slice(1);
  const block = parts.find((part) => part.startsWith(id));
  if (!block) throw new Error(`Missing YAML block ${id}`);
  return block;
};

const baseAchievement = {
  title: 'Test award',
  issuer: 'An issuing body',
  date: '2026-01-01',
  domain: 'academics' as const,
  significance: 'A note explaining the standard this represents.',
};

describe('achievement inventory', () => {
  it('contains exactly the four known entries, in file order', () => {
    expect(yamlIds).toEqual([
      'igcse-2026',
      'delf-b1-2025',
      'lodha-genius-2025',
      'lcm-grade-8-guitar',
    ]);
  });

  it('does not introduce invented project associations or extra entries', () => {
    expect(yaml).not.toMatch(/^  project:/m);
    expect(yaml).not.toMatch(/french-coach|line-follower|robot/i);
    expect(yaml).not.toMatch(/Youth Lead the Change|Harvard YLC/i);
  });

  it('marks Lodha as programmes and does not highlight DELF', () => {
    expect(yamlBlock('lodha-genius-2025')).toMatch(/^  domain: programmes$/m);
    expect(yamlBlock('delf-b1-2025')).not.toMatch(/highlight:\s*true/);
    expect(yamlBlock('igcse-2026')).toMatch(/highlight:\s*true/);
    expect(yamlBlock('lodha-genius-2025')).toMatch(/highlight:\s*true/);
    expect(yamlBlock('lcm-grade-8-guitar')).toMatch(/highlight:\s*true/);
  });

  it('attaches public evidence only where a real URL exists', () => {
    expect(yamlBlock('lodha-genius-2025')).toContain(
      'https://www.ashoka.edu.in/academic-programme/lodha-genius-ashoka-university-programme/',
    );
    expect(yamlBlock('lodha-genius-2025')).toContain(
      'https://blog.beyondthebasics.me/article/my-summer-at-ashoka-university',
    );
    expect(yamlBlock('igcse-2026')).not.toMatch(/^  evidence:/m);
    expect(yamlBlock('delf-b1-2025')).not.toMatch(/^  evidence:/m);
    expect(yamlBlock('lcm-grade-8-guitar')).not.toMatch(/^  evidence:/m);
  });
});

describe('achievement schema', () => {
  it('requires an issuer and non-empty significance without a character cap', () => {
    expect(achievementSchema.safeParse({ ...baseAchievement, issuer: '' }).success).toBe(false);
    expect(achievementSchema.safeParse({ ...baseAchievement, significance: '' }).success).toBe(
      false,
    );
    const long = 'x'.repeat(400);
    expect(achievementSchema.safeParse({ ...baseAchievement, significance: long }).success).toBe(
      true,
    );
  });

  it('defaults highlight to false and evidence to an empty list', () => {
    const parsed = achievementSchema.parse(baseAchievement);
    expect(parsed.highlight).toBe(false);
    expect(parsed.evidence).toEqual([]);
    expect(parsed.project).toBeUndefined();
  });

  it('accepts programmes and treats image as out of schema', () => {
    expect(
      achievementSchema.safeParse({ ...baseAchievement, domain: 'programmes' }).success,
    ).toBe(true);
    expect(
      achievementSchema.safeParse({ ...baseAchievement, domain: 'competitions' }).success,
    ).toBe(false);
  });
});

describe('grouping and related project', () => {
  const entry = (
    domain: 'academics' | 'programmes' | 'music' | 'sport',
    date: string,
    title: string = domain,
  ) => ({
    title,
    domain,
    date: new Date(date),
  });

  it('omits empty domains and keeps newest first within a group', () => {
    const groups = achievementGroups([
      entry('music', '2024-01-01', 'older music'),
      entry('academics', '2026-03-01', 'newer academic'),
      entry('music', '2025-01-01', 'newer music'),
      entry('academics', '2025-12-01', 'older academic'),
    ]);
    expect(groups.map((group) => group.domain)).toEqual(['academics', 'music']);
    expect(groups.map((group) => group.label)).toEqual(['Academic', 'Music']);
    expect(groups[0]?.items.map((item) => item.title)).toEqual([
      'newer academic',
      'older academic',
    ]);
    expect(groups[1]?.items.map((item) => item.title)).toEqual(['newer music', 'older music']);
  });

  it('still renders a one-item group when that domain has data', () => {
    const groups = achievementGroups([entry('programmes', '2025-06-01')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Fellowships / Programs');
  });

  it('sorts highlighted slices newest first', () => {
    const sorted = sortAchievementsNewestFirst([
      { date: new Date('2025-01-01'), id: 'a' },
      { date: new Date('2026-03-01'), id: 'b' },
      { date: new Date('2025-06-01'), id: 'c' },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('returns a project href only for a published slug', () => {
    const published = ['french-coach', 'robot'];
    expect(relatedProjectHref('french-coach', published)).toBe('/projects/french-coach');
    expect(relatedProjectHref('not-a-project', published)).toBeUndefined();
    expect(relatedProjectHref(undefined, published)).toBeUndefined();
    expect(relatedProjectHref('', published)).toBeUndefined();
  });
});

describe('achievements page source', () => {
  it("loads achievements from getCollection('achievements') and does not hardcode titles", () => {
    expect(page).toContain("getCollection('achievements')");
    expect(page).toContain('achievementGroups');
    expect(page).not.toContain('Cambridge IGCSE');
    expect(page).not.toContain('DELF B1');
    expect(page).not.toContain('Lodha Genius');
    expect(page).not.toContain('Guitar, Grade 8');
    expect(page).not.toContain('Selected highlights');
  });

  it('does not invent extra category labels or a trophy band', () => {
    expect(page).not.toContain('Competitions');
    expect(page).not.toContain('Community');
    expect(page).not.toContain('Harvard YLC');
    expect(page).not.toMatch(/trophy|medal|icon tile/i);
  });

  it('maps highlight to a visual variant instead of duplicating the inventory', () => {
    expect(page).toContain("variant={achievement.highlight ? 'featured' : 'row'}");
    expect(page).toContain('relatedProjectHref(achievement.project, publishedIds)');
  });
});

describe('AchievementItem evidence and related links', () => {
  it('renders evidence links only when the list is non-empty', () => {
    expect(item).toContain('evidence.length > 0 || relatedHref');
    expect(item).toContain('link-ui link-external');
    expect(item).toContain('rel="noopener noreferrer"');
    expect(item).toContain('target="_blank"');
  });

  it('renders a related project link only when relatedHref is passed', () => {
    expect(item).toContain('relatedHref &&');
    expect(item).toContain('Related project');
  });

  it('does not infer featured weight from highlight inside the component', () => {
    expect(item).toContain("variant = 'row'");
    expect(item).not.toContain('achievement.highlight');
  });
});

describe('homepage highlight slice', () => {
  it('keeps the three newest highlights as rows, not featured variants', () => {
    expect(homepage).toContain('sortAchievementsNewestFirst');
    expect(homepage).toContain('.slice(0, 3)');
    expect(homepage).toContain('item.highlight');
    expect(homepage).not.toContain('variant="featured"');
    expect(homepage).not.toContain("variant={achievement.highlight");
  });
});
