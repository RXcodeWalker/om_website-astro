/**
 * Measures the shipped output in dist/ against the Definition of Done in
 * docs/design-system.md section H3. Run after `npm run build`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const results = [];
const record = (group, gate, ok, actual, target) =>
  results.push({ group, gate, ok, actual, target });

function walk(dir, extensions) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, extensions));
    else if (extensions.includes(extname(full))) out.push(full);
  }
  return out;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const rel = (file) => relative(dist, file).replace(/\\/g, '/');

const cssFiles = walk(dist, ['.css']);
const htmlFiles = walk(dist, ['.html']);
const fontFiles = walk(dist, ['.woff2', '.woff', '.ttf', '.otf', '.eot']);

const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

/* ------------------------------------------------------------------ CSS */

const ROUTES = [
  ['home', 'index.html'],
  ['about', 'about/index.html'],
  ['contact', 'contact/index.html'],
  ['projects', 'projects/index.html'],
  ['achievements', 'achievements/index.html'],
  ['writing index', 'blog/index.html'],
  ['blog post', 'blog/12/index.html'],
];

const routeCss = [];
for (const [name, path] of ROUTES) {
  const file = join(dist, path);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  const inline = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].reduce(
    (sum, m) => sum + Buffer.byteLength(m[1]),
    0,
  );
  const linked = hrefs.reduce((sum, href) => {
    const asset = join(dist, href.replace(/^\//, ''));
    return sum + (existsSync(asset) ? statSync(asset).size : 0);
  }, 0);
  routeCss.push({ name, path, hrefs, inline, total: linked + inline });
}

// The shared stylesheet every route links is the "global" bundle.
const sharedHrefCounts = new Map();
for (const [, path] of ROUTES) {
  const file = join(dist, path);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) {
    sharedHrefCounts.set(match[1], (sharedHrefCounts.get(match[1]) ?? 0) + 1);
  }
}
const routeCount = routeCss.length;
const sharedHrefs = new Set(
  [...sharedHrefCounts.entries()].filter(([, count]) => count === routeCount).map(([href]) => href),
);
const globalBytes = [...sharedHrefs].reduce((sum, href) => {
  const asset = join(dist, href.replace(/^\//, ''));
  return sum + (existsSync(asset) ? statSync(asset).size : 0);
}, 0);

record('CSS', 'global CSS <= 15 KB', globalBytes <= 15 * 1024, kb(globalBytes), '15 KB');

// Route CSS is what a route adds on top of the global bundle: its own inline
// scoped styles plus any stylesheet not shared by every route.
for (const route of routeCss) {
  const ownLinked = route.hrefs
    .filter((href) => !sharedHrefs.has(href))
    .reduce((sum, href) => {
      const asset = join(dist, href.replace(/^\//, ''));
      return sum + (existsSync(asset) ? statSync(asset).size : 0);
    }, 0);
  route.own = ownLinked + route.inline;
}

const worstRoute = routeCss.reduce((a, b) => (a.own > b.own ? a : b), routeCss[0]);
record(
  'CSS',
  'per-route CSS <= 10 KB',
  routeCss.every((route) => route.own <= 10 * 1024),
  `${worstRoute.name} ${kb(worstRoute.own)}`,
  '10 KB',
);

const countIn = (haystack, pattern) => (haystack.match(pattern) ?? []).length;

const importantTotal = countIn(css, /!important/g);
const reducedMotionImportant = (
  css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\}\s*\}/g) ?? []
).reduce((sum, block) => sum + countIn(block, /!important/g), 0);
const strayImportant = importantTotal - reducedMotionImportant;

record('CSS', '!important outside reduced-motion = 0', strayImportant === 0, strayImportant, 0);
record('CSS', '--glass-* references = 0', countIn(css, /--glass-/g) === 0, countIn(css, /--glass-/g), 0);
record('CSS', '--card-radius references = 0', countIn(css, /--card-radius/g) === 0, countIn(css, /--card-radius/g), 0);
record('CSS', 'NYT font declarations = 0', countIn(css, /NYT\s/g) === 0, countIn(css, /NYT\s/g), 0);
record('CSS', 'backdrop-filter = 0', countIn(css, /backdrop-filter/g) === 0, countIn(css, /backdrop-filter/g), 0);
record('CSS', ':root token blocks = 1', countIn(css, /:root\s*\{/g) === 1, countIn(css, /:root\s*\{/g), 1);

/* ---------------------------------------------------------------- fonts */

const fontBytes = fontFiles.reduce((sum, file) => sum + statSync(file).size, 0);
record('Fonts', 'shipped fonts <= 140 KB', fontBytes <= 140 * 1024, kb(fontBytes), '140 KB');

const googleFonts =
  countIn(css, /fonts\.(googleapis|gstatic)\.com/g) +
  htmlFiles.reduce(
    (sum, file) => sum + countIn(readFileSync(file, 'utf8'), /fonts\.(googleapis|gstatic)\.com/g),
    0,
  );
record('Fonts', 'Google Fonts requests = 0', googleFonts === 0, googleFonts, 0);

const nonLatin = fontFiles.filter((file) =>
  /(cyrillic|greek|vietnamese|latin-ext|hebrew|arabic)/i.test(file),
);
record('Fonts', 'non-latin subsets = 0', nonLatin.length === 0, nonLatin.length, 0);

const retiredFamilies = ['Playfair', 'Lora', 'Syne', 'DM Sans', 'DM Mono', 'Cheltenham', 'Imperial', 'Franklin'];
const retiredHits = retiredFamilies.filter((family) => css.includes(family));
record('Fonts', 'retired font families = 0', retiredHits.length === 0, retiredHits.join(', ') || 0, 0);

/* --------------------------------------------------------- architecture */

let nestedFigures = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  let depth = 0;
  for (const match of html.matchAll(/<(\/?)figure[\s>]/g)) {
    if (match[1] === '/') depth -= 1;
    else {
      depth += 1;
      if (depth > 1) nestedFigures += 1;
    }
  }
}
record('Architecture', 'nested <figure> output = 0', nestedFigures === 0, nestedFigures, 0);

let multipleNavs = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  if (countIn(html, /<nav[^>]*aria-label="Primary"/g) > 1) multipleNavs += 1;
}
record('Architecture', 'duplicate primary navs = 0', multipleNavs === 0, multipleNavs, 0);

let themeColorDupes = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  if (countIn(html, /<meta[^>]+name="theme-color"/g) > 1) themeColorDupes += 1;
}
record('Architecture', 'duplicate theme-color tags = 0', themeColorDupes === 0, themeColorDupes, 0);

/* --------------------------------------------------------------- assets */

const missingOg = new Set();
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(
    /<meta[^>]+(?:property="og:image"|name="twitter:image")[^>]+content="([^"]+)"/g,
  )) {
    const path = match[1].replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
    if (!existsSync(join(dist, path))) missingOg.add(match[1]);
  }
}
record('Assets', 'og:image / twitter:image resolve', missingOg.size === 0, missingOg.size === 0 ? 'all resolve' : [...missingOg].join(', '), 0);

const excludedAssets = ['js/cursor.js', 'js/signal.js', 'js/sound.js', 'audio', 'sounds'];
const stillPresent = excludedAssets.filter((path) => existsSync(join(dist, path)));
record('Assets', 'excluded interaction assets removed', stillPresent.length === 0, stillPresent.join(', ') || 'none', 0);

/* ------------------------------------------------------------------- JS */

const routeJs = [];
for (const [name, path] of ROUTES) {
  const file = join(dist, path);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const inline = [...html.matchAll(/<script(?![^>]+src)[^>]*>([\s\S]*?)<\/script>/g)]
    .filter((m) => !m[0].includes('application/ld+json'))
    .reduce((sum, m) => sum + Buffer.byteLength(m[1]), 0);
  const linked = srcs.reduce((sum, src) => {
    const asset = join(dist, src.replace(/^\//, ''));
    return sum + (existsSync(asset) ? statSync(asset).size : 0);
  }, 0);
  routeJs.push({ name, total: linked + inline });
}
const worstJs = routeJs.reduce((a, b) => (a.total > b.total ? a : b), routeJs[0]);
record(
  'JS',
  'per-route JS <= 5 KB',
  routeJs.every((route) => route.total <= 5 * 1024),
  `${worstJs.name} ${kb(worstJs.total)}`,
  '5 KB',
);

/* --------------------------------------------------------------- report */

console.log('\nBuild verification — docs/design-system.md H3\n');

let group = '';
for (const result of results) {
  if (result.group !== group) {
    group = result.group;
    console.log(`  ${group}`);
  }
  const mark = result.ok ? 'PASS' : 'FAIL';
  console.log(
    `    ${mark}  ${result.gate.padEnd(40)} actual: ${String(result.actual).padEnd(24)} target: ${result.target}`,
  );
}

console.log('\n  Per-route CSS (route-specific / total including global)');
for (const route of routeCss) {
  console.log(
    `    ${route.name.padEnd(16)} ${kb(route.own).padStart(9)} / ${kb(route.total).padStart(9)}   ${route.path}`,
  );
}

console.log('\n  Shipped fonts');
for (const file of fontFiles) {
  console.log(`    ${rel(file).padEnd(52)} ${kb(statSync(file).size).padStart(9)}`);
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed\n`);
process.exit(failed.length > 0 ? 1 : 0);
