/**
 * Renders the default Open Graph card to public/og/default.png.
 *
 * Uses the copy of sharp that Astro already installs for astro:assets, so
 * this adds no dependency.
 *
 * librsvg does not honour base64-embedded woff2, so the card is set in the
 * design system's own declared fallback families (Georgia for display,
 * Segoe UI for body, a mono face for the labels) rather than in Newsreader
 * and Inter. Same register, no dependency on the build machine's font set.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'og');

const PAPER = '#fbfaf8';
const INK = '#171512';
const MUTED = '#6e6862';
const ACCENT = '#1b3fa0';
const RULE = '#e6e2db';

const DISPLAY = "Georgia, 'Times New Roman', 'Liberation Serif', serif";
const BODY = "'Segoe UI', Arial, 'Liberation Sans', sans-serif";
const MONO = "Consolas, 'DejaVu Sans Mono', monospace";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>

  <rect x="0" y="0" width="1200" height="8" fill="${ACCENT}"/>
  <rect x="80" y="150" width="1040" height="1" fill="${RULE}"/>
  <rect x="80" y="470" width="1040" height="1" fill="${RULE}"/>

  <text x="80" y="120" font-family="${MONO}" font-size="21"
        letter-spacing="3" fill="${MUTED}">BEYONDTHEBASICS.ME</text>

  <text x="80" y="280" font-family="${DISPLAY}" font-size="88"
        fill="${INK}">Beyond The Basics</text>

  <text x="80" y="356" font-family="${DISPLAY}" font-size="44"
        font-style="italic" fill="${MUTED}">Om Jhamvar</text>

  <text x="80" y="428" font-family="${BODY}" font-size="28"
        fill="${MUTED}">Builder. Learner. Thinker.</text>

  <text x="80" y="537" font-family="${MONO}" font-size="22"
        letter-spacing="3" fill="${ACCENT}">PROJECTS &#183; ACHIEVEMENTS &#183; WRITING</text>
</svg>`;

mkdirSync(outDir, { recursive: true });

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(join(outDir, 'default.png'), png);

console.log(`public/og/default.png  ${(png.length / 1024).toFixed(1)} KB  1200x630`);
