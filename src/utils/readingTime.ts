const WORDS_PER_MINUTE = 200;

/** Whole minutes, floored at 1, from raw Markdown source. */
export function readingTime(source: string): number {
  const words = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`\[\]()!-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
