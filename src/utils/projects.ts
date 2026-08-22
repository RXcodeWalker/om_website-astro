type ProjectIndexFields = {
  draft: boolean;
  order: number;
  featured: boolean;
};

type ProjectLike = { id: string; data: ProjectIndexFields };

export function publishedProjects<T extends ProjectLike>(entries: T[]): T[] {
  return [...entries]
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}

/**
 * Next item in an already published, already sorted list. Does not re-sort or
 * re-fetch. Returns null when a wrap would be a self-link (fewer than two).
 */
export function nextPublishedProject<T extends { id: string }>(
  published: T[],
  id: string,
): T | null {
  if (published.length < 2) return null;
  const index = published.findIndex((entry) => entry.id === id);
  if (index === -1) return null;
  return published[(index + 1) % published.length];
}

type HeadingLike = { depth: number; slug: string };

/** On-this-page list. Fewer than four H2s is not a table of contents. */
export function tocH2s<T extends HeadingLike>(headings: T[]): T[] {
  const h2s = headings.filter((heading) => heading.depth === 2);
  return h2s.length >= 4 ? h2s : [];
}

/**
 * Featured visual treatment is used only when some, but not all, published
 * projects are flagged. Zero, one-of-one, and all-featured fall back to rows
 * so a boolean cannot turn the whole index into a featured stack.
 */
export function projectIndexSections<T extends ProjectLike>(published: T[]): {
  featured: T[];
  remaining: T[];
} {
  const featured = published.filter((entry) => entry.data.featured);
  if (featured.length > 0 && featured.length < published.length) {
    return {
      featured,
      remaining: published.filter((entry) => !entry.data.featured),
    };
  }
  return { featured: [], remaining: published };
}
