/**
 * Copies the latin-only font files out of the Fontsource packages into
 * public/fonts/.
 *
 * Fontsource ships no per-subset CSS entry point, so importing the package
 * entry pulls cyrillic, greek and vietnamese as well. The design system caps
 * total shipped fonts at 140KB and mandates latin only, so the faces are
 * vendored explicitly and declared by hand in src/styles/fonts.css.
 */
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'fonts');

const FACES = [
  {
    from: '@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2',
    to: 'newsreader-latin-wght-normal.woff2',
  },
  {
    from: '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
    to: 'inter-latin-wght-normal.woff2',
  },
  {
    from: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
    to: 'jetbrains-mono-latin-400-normal.woff2',
  },
];

mkdirSync(outDir, { recursive: true });

let total = 0;
for (const face of FACES) {
  const source = join(root, 'node_modules', face.from);
  const target = join(outDir, face.to);
  copyFileSync(source, target);
  const bytes = statSync(target).size;
  total += bytes;
  console.log(`${face.to.padEnd(44)} ${(bytes / 1024).toFixed(1)} KB`);
}

console.log(`${'total'.padEnd(44)} ${(total / 1024).toFixed(1)} KB`);

if (total > 140 * 1024) {
  console.error(`Font budget exceeded: ${(total / 1024).toFixed(1)} KB > 140 KB`);
  process.exit(1);
}
