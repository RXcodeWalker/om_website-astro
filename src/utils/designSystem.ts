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

export const TOKEN_CONTRAST_PAIRS = [
  { name: 'light body text', fg: '#171512', bg: '#fbfaf8', min: 7 },
  { name: 'light secondary', fg: '#4a463f', bg: '#fbfaf8', min: 4.5 },
  { name: 'light muted', fg: '#6e6862', bg: '#fbfaf8', min: 4.5 },
  { name: 'light accent ink', fg: '#1b3fa0', bg: '#fbfaf8', min: 4.5 },
  { name: 'light accent oxblood', fg: '#8c2f39', bg: '#fbfaf8', min: 4.5 },
  { name: 'light accent ivy', fg: '#265d45', bg: '#fbfaf8', min: 4.5 },
  { name: 'dark body text', fg: '#edeae4', bg: '#100f0e', min: 7 },
  { name: 'dark secondary', fg: '#b5b0a8', bg: '#100f0e', min: 4.5 },
  { name: 'dark muted', fg: '#857f76', bg: '#100f0e', min: 4.5 },
  { name: 'dark accent ink', fg: '#9fc0ff', bg: '#100f0e', min: 4.5 },
  { name: 'dark accent oxblood', fg: '#e8969c', bg: '#100f0e', min: 4.5 },
  { name: 'dark accent ivy', fg: '#86c7a5', bg: '#100f0e', min: 4.5 },
] as const;

export function checkNowStaleness(updated: Date, thresholdDays = 90): boolean {
  const ageMs = Date.now() - updated.getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}
