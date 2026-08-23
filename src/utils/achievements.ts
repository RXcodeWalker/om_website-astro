import type { AchievementDomain } from '../schemas/achievement';

export const ACHIEVEMENT_DOMAIN_LABELS: Record<AchievementDomain, string> = {
  academics: 'Academic',
  programmes: 'Fellowships / Programs',
  music: 'Music',
  sport: 'Sport',
  leadership: 'Leadership',
  building: 'Building',
};

const DOMAIN_ORDER = Object.keys(ACHIEVEMENT_DOMAIN_LABELS) as AchievementDomain[];

export function sortAchievementsNewestFirst<T extends { date: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function achievementGroups<T extends { domain: AchievementDomain; date: Date }>(
  items: T[],
): { domain: AchievementDomain; label: string; items: T[] }[] {
  const sorted = sortAchievementsNewestFirst(items);
  return DOMAIN_ORDER.map((domain) => ({
    domain,
    label: ACHIEVEMENT_DOMAIN_LABELS[domain],
    items: sorted.filter((item) => item.domain === domain),
  })).filter((group) => group.items.length > 0);
}

/** Internal project link, or undefined when the slug is missing or unpublished. */
export function relatedProjectHref(
  slug: string | undefined,
  publishedIds: Iterable<string>,
): string | undefined {
  if (!slug) return undefined;
  const ids = publishedIds instanceof Set ? publishedIds : new Set(publishedIds);
  return ids.has(slug) ? `/projects/${slug}` : undefined;
}
