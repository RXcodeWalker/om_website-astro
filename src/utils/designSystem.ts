export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parses a CSS file's custom properties and resolves `var(--x)` chains so
 * assertions can be made against the real token values rather than a copy.
 */
export function parseTokens(css: string): Map<string, Map<string, string>> {
  const blocks = new Map<string, Map<string, string>>();
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;

  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(source)) !== null) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    const declarations = blocks.get(selector) ?? new Map<string, string>();

    for (const line of match[2].split(';')) {
      const separator = line.indexOf(':');
      if (separator === -1) continue;
      const name = line.slice(0, separator).trim();
      if (!name.startsWith('--')) continue;
      declarations.set(name, line.slice(separator + 1).trim());
    }

    if (declarations.size > 0) blocks.set(selector, declarations);
  }

  return blocks;
}

/** Resolves a token to a literal, following `var(--x)` indirection. */
export function resolveToken(
  name: string,
  scopes: Map<string, string>[],
  depth = 0,
): string | undefined {
  if (depth > 10) return undefined;

  let raw: string | undefined;
  for (const scope of scopes) {
    if (scope.has(name)) raw = scope.get(name);
  }
  if (raw === undefined) return undefined;

  const reference = raw.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (reference) return resolveToken(reference[1], scopes, depth + 1);

  return raw;
}
