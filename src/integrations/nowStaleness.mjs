import { readFileSync } from 'node:fs';

const THRESHOLD_DAYS = 90;

/**
 * The single staleness implementation in the codebase.
 * @param {Date} updated
 * @param {number} thresholdDays
 */
export function isNowStale(updated, thresholdDays = THRESHOLD_DAYS) {
  const ageMs = Date.now() - updated.getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}

/** @returns {import('astro').AstroIntegration} */
export function nowStalenessIntegration() {
  return {
    name: 'now-staleness',
    hooks: {
      'astro:build:start': ({ logger }) => {
        const warn = (message) =>
          logger ? logger.warn(message) : console.warn(`[now] ${message}`);

        let raw;
        try {
          raw = readFileSync('src/data/now.yaml', 'utf8');
        } catch {
          return;
        }

        // No entry is a valid state; the homepage simply omits the band.
        const match = raw.replace(/^\s*#.*$/gm, '').match(/updated:\s*(\S+)/);
        if (!match) return;

        const updated = new Date(match[1]);
        if (Number.isNaN(updated.getTime())) {
          warn('src/data/now.yaml has an unparseable `updated` date.');
          return;
        }

        if (isNowStale(updated)) {
          warn(
            `src/data/now.yaml was last updated ${match[1]}, more than ${THRESHOLD_DAYS} days ago. ` +
              'Update the Currently band or remove the entry.',
          );
        }
      },
    },
  };
}
