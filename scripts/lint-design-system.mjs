/**
 * Source-level lint for the design system contract in docs/design-system.md.
 *
 * This is deliberately not `astro check`. Typecheck answers "do the types line
 * up"; this answers "does the source still obey the design system" — banned
 * tokens, cascade rules, single-implementation rules, and the layering rules
 * that the migration exists to enforce. Written against the standard library
 * so it adds no dependency.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const checks = [];

const fail = (rule, detail) => failures.push({ rule, detail });
const pass = (rule) => checks.push(rule);

function walk(dir, extensions) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, extensions));
    } else if (extensions.includes(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

const styleFiles = walk(join(root, 'src', 'styles'), ['.css']);
const componentFiles = walk(join(root, 'src'), ['.astro']);
const allSource = [...styleFiles, ...componentFiles];

/**
 * Comments describe the rules; they must not be mistaken for violations of
 * them. Block comments and non-URL line comments are stripped before counting.
 */
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const read = (file) => stripComments(readFileSync(file, 'utf8'));
const rel = (file) => relative(root, file).replace(/\\/g, '/');

/* ---------------------------------------------------------------- tokens */

{
  const rule = 'exactly one :root token block, in tokens.css';
  const offenders = [];
  for (const file of allSource) {
    const count = (read(file).match(/:root\s*\{/g) ?? []).length;
    if (count === 0) continue;
    if (!file.endsWith('tokens.css') || count > 1) {
      offenders.push(`${rel(file)} declares ${count} :root block(s)`);
    }
  }
  offenders.length > 0 ? fail(rule, offenders.join('; ')) : pass(rule);
}

for (const [rule, pattern] of [
  ['zero --glass-* references', /--glass-[\w-]*/g],
  ['zero --blob-* references', /--blob-[\w-]*/g],
  ['zero --card-radius references', /--card-radius/g],
  ['zero --page-atmosphere references', /--page-atmosphere/g],
  ['zero NYT font declarations', /NYT\s/g],
  ['zero backdrop-filter usage', /backdrop-filter/g],
  ['zero Google Fonts requests', /fonts\.(googleapis|gstatic)\.com/g],
  ['zero legacy accent tokens (--accent-1/2/3)', /--accent-[123]\b/g],
]) {
  const offenders = [];
  for (const file of allSource) {
    const hits = read(file).match(pattern);
    if (hits) offenders.push(`${rel(file)} (${hits.length})`);
  }
  offenders.length > 0 ? fail(rule, offenders.join(', ')) : pass(rule);
}

{
  const rule = '!important only inside the reduced-motion block';
  const offenders = [];
  for (const file of allSource) {
    const source = read(file);
    const total = (source.match(/!important/g) ?? []).length;
    if (total === 0) continue;

    const reducedMotion =
      source.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/g) ?? [];
    const allowed = reducedMotion.reduce(
      (sum, block) => sum + (block.match(/!important/g) ?? []).length,
      0,
    );

    if (total > allowed) {
      offenders.push(`${rel(file)} (${total - allowed} outside reduced-motion)`);
    }
  }
  offenders.length > 0 ? fail(rule, offenders.join(', ')) : pass(rule);
}

/* ------------------------------------------------------------- cascade */

{
  const rule = 'global.css imports only the foundation layer';
  const globalCss = read(join(root, 'src', 'styles', 'global.css'));
  const imports = [...globalCss.matchAll(/@import\s+'\.\/([\w-]+)\.css'/g)].map((m) => m[1]);
  const expected = ['fonts', 'tokens', 'base', 'utilities'];
  const unexpected = imports.filter((name) => !expected.includes(name));

  if (unexpected.length > 0) {
    fail(rule, `unexpected global imports: ${unexpected.join(', ')}`);
  } else if (imports.length !== expected.length) {
    fail(rule, `expected ${expected.join(', ')} — found ${imports.join(', ')}`);
  } else {
    pass(rule);
  }
}

{
  const rule = 'no orphaned stylesheets outside the foundation';
  const allowed = new Set(['fonts.css', 'tokens.css', 'base.css', 'utilities.css', 'global.css']);
  const orphans = styleFiles
    .map((file) => file.split(/[\\/]/).pop())
    .filter((name) => !allowed.has(name));
  orphans.length > 0 ? fail(rule, orphans.join(', ')) : pass(rule);
}

{
  const rule = 'one .container definition';
  const offenders = [];
  for (const file of allSource) {
    const hits = read(file).match(/(^|[\s,}])\.container\s*\{/gm);
    if (hits) offenders.push(`${rel(file)} (${hits.length})`);
  }
  const total = offenders.reduce((sum, entry) => sum + Number(entry.match(/\((\d+)\)/)[1]), 0);
  total === 1 ? pass(rule) : fail(rule, offenders.join(', ') || 'none found');
}

{
  const rule = 'one body styling definition';
  const offenders = [];
  for (const file of allSource) {
    const hits = read(file).match(/(^|[\s,}])body\s*\{/gm);
    if (hits) offenders.push(`${rel(file)} (${hits.length})`);
  }
  const total = offenders.reduce((sum, entry) => sum + Number(entry.match(/\((\d+)\)/)[1]), 0);
  total === 1 ? pass(rule) : fail(rule, offenders.join(', ') || 'none found');
}

/* --------------------------------------------- single implementations */

{
  const rule = 'exactly one ContactForm implementation';
  const forms = componentFiles.filter((file) => /ContactForm\.astro$/.test(file));
  forms.length === 1 && forms[0].includes('patterns')
    ? pass(rule)
    : fail(rule, forms.map(rel).join(', ') || 'none found');
}

{
  const rule = 'exactly one navigation data path';
  const offenders = componentFiles.filter(
    (file) => !file.endsWith('PrimaryNav.astro') && /site\.nav\.map/.test(read(file)),
  );
  offenders.length === 0 ? pass(rule) : fail(rule, offenders.map(rel).join(', '));
}

{
  const rule = 'exactly one theme-color mechanism';
  const offenders = [];
  for (const file of componentFiles) {
    const source = read(file);
    const writes =
      (source.match(/theme-color/g) ?? []).length +
      (source.match(/localStorage\.setItem\(\s*'(theme|accent)'/g) ?? []).length;
    if (writes > 0 && !file.endsWith('BaseLayout.astro')) {
      offenders.push(rel(file));
    }
  }
  offenders.length === 0 ? pass(rule) : fail(rule, offenders.join(', '));
}

{
  const rule = 'exactly one reveal implementation';
  const offenders = allSource.filter((file) => /\.reveal\s*\{/.test(read(file)));
  offenders.length === 1 && offenders[0].endsWith('base.css')
    ? pass(rule)
    : fail(rule, offenders.map(rel).join(', ') || 'none found');
}

{
  const rule = 'exactly one staleness implementation';
  const sources = walk(join(root, 'src'), ['.ts', '.mjs']);
  const offenders = sources.filter((file) =>
    /function\s+(isNowStale|checkNowStaleness)/.test(read(file)),
  );
  offenders.length === 1
    ? pass(rule)
    : fail(rule, offenders.map(rel).join(', ') || 'none found');
}

{
  const rule = 'exactly one <figure> owner per media primitive';
  const offenders = [];
  for (const file of componentFiles.filter((f) => /primitives[\\/](Media|Figure|Gallery)\.astro/.test(f))) {
    const source = read(file);
    const opens = (source.match(/<figure[\s>]/g) ?? []).length;
    if (file.endsWith('Media.astro') && opens > 0) {
      offenders.push(`${rel(file)} still emits <figure>`);
    }
    if (opens > 1) offenders.push(`${rel(file)} emits ${opens} <figure> elements`);
  }
  offenders.length === 0 ? pass(rule) : fail(rule, offenders.join('; '));
}

/* ------------------------------------------------------------- content */

{
  const rule = 'now.yaml carries no placeholder content';
  const now = read(join(root, 'src', 'data', 'now.yaml'));
  /placeholder/i.test(now.replace(/^\s*#.*$/gm, ''))
    ? fail(rule, 'placeholder text present in src/data/now.yaml')
    : pass(rule);
}

/* -------------------------------------------------------------- report */

const width = 62;
console.log('\nDesign system lint\n');
for (const rule of checks) console.log(`  PASS  ${rule}`);
for (const { rule, detail } of failures) {
  console.log(`  FAIL  ${rule.padEnd(width)}`);
  console.log(`        ${detail}`);
}
console.log(`\n${checks.length} passed, ${failures.length} failed\n`);

process.exit(failures.length > 0 ? 1 : 0);
