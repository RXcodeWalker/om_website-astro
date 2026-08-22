type ProjectIndexFields = {
  draft: boolean;
  order: number;
  featured: boolean;
};

type ProjectLike = { data: ProjectIndexFields };

export function publishedProjects<T extends ProjectLike>(entries: T[]): T[] {
  return [...entries]
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => a.data.order - b.data.order);
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
