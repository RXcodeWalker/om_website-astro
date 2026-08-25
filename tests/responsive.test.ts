import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
  Browser-verifiable layout facts (overflow, touch targets, menu behaviour)
  live in scripts/audit-viewports.mjs, which measures the real dist/ build.
  This suite keeps only what a browser pass genuinely can't check better:
  the shape of the breakpoint contract itself, not any one rule's placement.
*/

const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string, extensions: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, extensions));
    else if (extensions.includes(extname(full))) out.push(full);
  }
  return out;
}

const read = (file: string) => readFileSync(file, 'utf8');

/*
  Width breakpoints only — pointer/hover/prefers-* are capability queries,
  not layout breakpoints, and counting them would conflate two different
  contracts. A `max-width: (N-1)px` immediately alongside `min-width: Npx`
  is the standard non-overlapping-range idiom for one logical breakpoint
  (see SiteHeader.astro's 767/768 pair), so it is folded into N rather than
  counted as a distinct value.
*/
function widthBreakpoints(source: string): number[] {
  const raw: number[] = [];
  for (const match of source.matchAll(/@media\s*\(([^)]*)\)/g)) {
    const clause = match[1];
    if (/pointer:|hover:|prefers-/.test(clause) && !/min-width|max-width/.test(clause)) continue;
    for (const num of clause.matchAll(/(min-width|max-width):\s*(\d+)px/g)) {
      const kind = num[1];
      const value = Number(num[2]);
      raw.push(kind === 'max-width' ? value + 1 : value);
    }
  }
  return [...new Set(raw)].sort((a, b) => a - b);
}

const styleFiles = walk(join(root, 'src', 'styles'), ['.css']);
const componentFiles = walk(join(root, 'src'), ['.astro']);
const allSource = [...styleFiles, ...componentFiles];

describe('breakpoint contract', () => {
  it('the width-breakpoint set across the codebase is exactly {480, 768, 1024}', () => {
    const all = new Set<number>();
    for (const file of allSource) {
      for (const bp of widthBreakpoints(read(file))) all.add(bp);
    }
    expect([...all].sort((a, b) => a - b)).toEqual([480, 768, 1024]);
  });

  it('no component declares more than 3 width breakpoints', () => {
    const offenders: string[] = [];
    for (const file of componentFiles) {
      const count = widthBreakpoints(read(file)).length;
      if (count > 3) offenders.push(`${file} (${count})`);
    }
    expect(offenders).toEqual([]);
  });
});

describe('MDX primitives are responsive', () => {
  it('SpecSheet has a width breakpoint (single column below 480px)', () => {
    const source = read(join(root, 'src', 'components', 'primitives', 'SpecSheet.astro'));
    expect(widthBreakpoints(source)).toContain(480);
  });

  it('Metrics reflows intrinsically via an auto-fit/auto-fill grid', () => {
    const source = read(join(root, 'src', 'components', 'primitives', 'Metrics.astro'));
    expect(source).toMatch(/repeat\(\s*auto-(fit|fill)\s*,/);
  });
});

describe('viewport height fallback', () => {
  it('base.css falls back to 100svh alongside 100vh on body min-height', () => {
    const source = read(join(root, 'src', 'styles', 'base.css'));
    expect(source).toMatch(/min-height:\s*100vh/);
    expect(source).toMatch(/min-height:\s*100svh/);
  });
});
