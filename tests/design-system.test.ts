import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseTokens, resolveToken } from '../src/utils/designSystem';

/*
  These assertions read src/styles/tokens.css directly. Editing a token value
  must be able to break this suite — that is the entire point of the file.
*/
const tokensPath = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url));
const css = readFileSync(tokensPath, 'utf8');
const blocks = parseTokens(css);

const root = blocks.get(':root');
const dark = blocks.get("html[data-theme='dark']");
const oxblood = blocks.get("html[data-accent='oxblood']");
const ivy = blocks.get("html[data-accent='ivy']");
const darkOxblood = blocks.get("html[data-theme='dark'][data-accent='oxblood']");
const darkIvy = blocks.get("html[data-theme='dark'][data-accent='ivy']");

const empty = new Map<string, string>();
const lightScopes = [root ?? empty];
const darkScopes = [root ?? empty, dark ?? empty];

const token = (name: string, scopes: Map<string, string>[]) => {
  const value = resolveToken(name, scopes);
  if (!value) throw new Error(`Token ${name} is not defined in tokens.css`);
  return value;
};

describe('token source integrity', () => {
  it('defines exactly one :root block', () => {
    expect(css.match(/:root\s*\{/g)?.length ?? 0).toBe(1);
    expect([...blocks.keys()].filter((selector) => selector === ':root')).toHaveLength(1);
  });

  it('exposes every required scope', () => {
    expect(root).toBeDefined();
    expect(dark).toBeDefined();
    expect(oxblood).toBeDefined();
    expect(ivy).toBeDefined();
    expect(darkOxblood).toBeDefined();
    expect(darkIvy).toBeDefined();
  });

  it('carries no retired token families', () => {
    expect(css).not.toMatch(/--glass-/);
    expect(css).not.toMatch(/--blob-/);
    expect(css).not.toMatch(/--card-radius/);
    expect(css).not.toMatch(/--page-atmosphere/);
    expect(css).not.toMatch(/NYT /);
  });

  it('keeps radius 0 as the default', () => {
    expect(token('--radius-0', lightScopes)).toBe('0');
    expect(token('--radius-sm', lightScopes)).toBe('2px');
  });
});

describe('token contrast — light theme', () => {
  const surface = () => token('--surface-page', lightScopes);

  it.each([
    ['--text-primary', 7],
    ['--text-secondary', 4.5],
    ['--text-muted', 4.5],
    ['--accent', 4.5],
    ['--focus-ring', 3],
    ['--status-shipped', 4.5],
    ['--status-progress', 4.5],
    ['--status-error', 4.5],
    ['--border-interactive', 3],
  ])('%s meets %s:1 on the page surface', (name, min) => {
    expect(contrastRatio(token(name, lightScopes), surface())).toBeGreaterThanOrEqual(min);
  });
});

describe('token contrast — dark theme', () => {
  const surface = () => token('--surface-page', darkScopes);

  it.each([
    ['--text-primary', 7],
    ['--text-secondary', 4.5],
    ['--text-muted', 4.5],
    ['--accent', 4.5],
    ['--focus-ring', 3],
    ['--status-shipped', 4.5],
    ['--status-progress', 4.5],
    ['--status-error', 4.5],
    ['--border-interactive', 3],
  ])('%s meets %s:1 on the page surface', (name, min) => {
    expect(contrastRatio(token(name, darkScopes), surface())).toBeGreaterThanOrEqual(min);
  });
});

describe('all six theme and accent combinations', () => {
  const combinations = [
    { name: 'light / ink', scopes: [root ?? empty] },
    { name: 'light / oxblood', scopes: [root ?? empty, oxblood ?? empty] },
    { name: 'light / ivy', scopes: [root ?? empty, ivy ?? empty] },
    { name: 'dark / ink', scopes: [root ?? empty, dark ?? empty] },
    { name: 'dark / oxblood', scopes: [root ?? empty, dark ?? empty, darkOxblood ?? empty] },
    { name: 'dark / ivy', scopes: [root ?? empty, dark ?? empty, darkIvy ?? empty] },
  ];

  it.each(combinations)('$name keeps accent and focus ring legible', ({ scopes }) => {
    const surface = token('--surface-page', scopes);
    expect(contrastRatio(token('--accent', scopes), surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(token('--focus-ring', scopes), surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(token('--text-on-accent', scopes), token('--accent', scopes))).toBeGreaterThanOrEqual(4.5);
  });
});
