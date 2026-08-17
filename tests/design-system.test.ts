import { describe, expect, it } from 'vitest';
import { TOKEN_CONTRAST_PAIRS, contrastRatio } from '../src/utils/designSystem';

describe('design token contrast', () => {
  it.each(TOKEN_CONTRAST_PAIRS)('$name meets WCAG AA ($min:1)', ({ fg, bg, min }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe('accent combinations', () => {
  it('light ink accent exceeds 7:1 on paper', () => {
    expect(contrastRatio('#1b3fa0', '#fbfaf8')).toBeGreaterThanOrEqual(7);
  });

  it('dark ink accent exceeds 7:1 on ink surface', () => {
    expect(contrastRatio('#9fc0ff', '#100f0e')).toBeGreaterThanOrEqual(7);
  });
});
