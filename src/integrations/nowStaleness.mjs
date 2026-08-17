import { readFileSync } from 'node:fs';

/** @param {Date} updated */
function isNowStale(updated, thresholdDays = 90) {
  const ageMs = Date.now() - updated.getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}

/** @returns {import('astro').AstroIntegration} */
export function nowStalenessIntegration() {
  return {
    name: 'now-staleness',
    hooks: {
      'astro:build:start': () => {
        try {
          const raw = readFileSync('src/data/now.yaml', 'utf8');
          const match = raw.match(/updated:\s*(\S+)/);
          if (!match) return;
          const updated = new Date(match[1]);
          if (isNowStale(updated)) {
            console.warn(
              '[now] src/data/now.yaml is more than 90 days old — update the Currently band.',
            );
          }
        } catch {
          // optional during early scaffolding
        }
      },
    },
  };
}
