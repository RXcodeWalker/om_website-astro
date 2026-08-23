import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const page = read('../src/pages/contact.astro');
const form = read('../src/components/patterns/ContactForm.astro');
const footer = read('../src/components/chrome/SiteFooter.astro');
const site = read('../src/config/site.ts');
const jsonLd = read('../src/components/seo/JsonLd.astro');

describe('contact page source', () => {
  it('imports site and ContactForm and lists mailto, socials, and writing', () => {
    expect(page).toContain("from '../config/site'");
    expect(page).toContain("from '../components/patterns/ContactForm.astro'");
    expect(page).toContain('mailto:${site.email}');
    expect(page).toContain('site.socials');
    expect(page).toContain('site.secondaryNav');
    expect(site).toContain("blogUrl: 'https://blog.beyondthebasics.me'");
    expect(site).toContain('https://github.com/RXcodeWalker');
    expect(site).toContain('https://www.linkedin.com/in/om-jhamvar-22185b402');
    expect(page.indexOf('Reach me directly')).toBeLessThan(page.indexOf('Send a message'));
  });

  it('does not mention Twitter/X or a résumé', () => {
    expect(page).not.toMatch(/twitter|instagram|x\.com|résumé|\bresume\b/i);
    expect(form).not.toMatch(/twitter|instagram|x\.com|résumé|\bresume\b/i);
  });
});

describe('contact form source', () => {
  it('posts to Formspree from site.formspreeId with a JSON-aware AJAX path', () => {
    expect(form).toContain('https://formspree.io/f/${site.formspreeId}');
    expect(form).toContain('method="POST"');
    expect(form).toContain("Accept: 'application/json'");
    expect(form).not.toContain('alert(');
    expect(form).not.toContain('_next');
    expect(form).not.toContain('name="_subject"');
    expect(form).toContain('name="subject"');
  });

  it('uses a text-input honeypot, visible labels, and a focusable status region', () => {
    expect(form).toMatch(/type="text"[\s\S]*name="_gotcha"|name="_gotcha"[\s\S]*type="text"/);
    expect(form).toContain('<label for="contact-name">Name</label>');
    expect(form).toContain('<label for="contact-email">Email</label>');
    expect(form).toContain('<label for="contact-message">Message</label>');
    expect(form).toContain('aria-live="polite"');
    expect(form).toContain('tabindex="-1"');
    expect(form).not.toContain('tabindex="0"');
    expect(form).toContain('Formspree');
    expect(form).toContain('site.email');
  });
});

describe('footer and identity wiring', () => {
  it('maps site.nav, site.secondaryNav, site.socials, and mailto', () => {
    expect(footer).toContain('site.nav');
    expect(footer).toContain('site.secondaryNav');
    expect(footer).toContain('site.socials');
    expect(footer).toContain('mailto:${site.email}');
  });

  it('keeps Person sameAs as socials only', () => {
    expect(jsonLd).toContain('sameAs: site.socials.map((social) => social.href)');
    expect(jsonLd).not.toContain('site.blogUrl');
    expect(site).toContain("formspreeId: 'xzdajdnn'");
  });
});
