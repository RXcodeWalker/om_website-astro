/**
 * Browser-verified responsive audit over the built dist/ output. Serves
 * dist/ with a plain node:http server and drives it with Playwright to
 * measure the claims in the responsive design pass against real layout,
 * not static reading. Run after `npm run build`.
 *
 * House style matches verify-build.mjs: plain node: imports, a record()
 * collector, a padded report, process.exit(1) on failure.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const auditDir = join(root, '.audit');

if (!existsSync(dist)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// audit measures a specific build; a stale dist/ built before the last
// source edit would silently report on code that no longer exists.
{
  const srcDir = join(root, 'src');
  const newestSrcMtime = Math.max(...walk(srcDir).map((f) => statSync(f).mtimeMs));
  const newestDistMtime = Math.max(...walk(dist).map((f) => statSync(f).mtimeMs));
  if (newestDistMtime < newestSrcMtime) {
    console.error(
      'dist/ is older than src/ — run `npm run build` again before auditing.',
    );
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ server */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveRequestPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const candidates = [
    join(dist, clean),
    join(dist, clean, 'index.html'),
    join(dist, `${clean}.html`),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function startServer() {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      const file = resolveRequestPath(req.url ?? '/');
      if (!file) {
        const notFound = join(dist, '404.html');
        if (existsSync(notFound)) {
          res.writeHead(404, { 'Content-Type': MIME['.html'] });
          res.end(readFileSync(notFound));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
        return;
      }
      const type = MIME[extname(file)] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolvePromise(server));
  });
}

/* -------------------------------------------------------------- reporting */

const results = [];
const record = (group, gate, ok, actual, target) =>
  results.push({ group, gate, ok, actual, target });

let shotCount = 0;
async function saveFailureShot(page, route, width, check) {
  if (!existsSync(auditDir)) mkdirSync(auditDir, { recursive: true });
  const safeRoute = route.replace(/\//g, '_') || 'root';
  const safeCheck = check.replace(/[^a-z0-9-]+/gi, '-');
  const path = join(auditDir, `${safeRoute}-${width}-${safeCheck}.png`);
  await page.screenshot({ path, fullPage: true }).catch(() => {});
  shotCount += 1;
  return relative(root, path).replace(/\\/g, '/');
}

/* ------------------------------------------------------------------ setup */

const ROUTES = [
  ['home', '/'],
  ['about', '/about'],
  ['contact', '/contact'],
  ['projects', '/projects'],
  ['french-coach', '/projects/french-coach'],
  ['robot', '/projects/robot'],
  ['achievements', '/achievements'],
  ['404', '/does-not-exist'],
];

const WIDTHS = [320, 375, 768, 1024, 1440];
const HEIGHT = 900;

// WCAG 2.2 SC 2.5.8 exempts inline links in a run of text from the 24px
// (and by extension the design system's 44px) minimum target size.
const INLINE_EXEMPT = '.prose a';

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.addEventListener('load', res, { once: true });
              img.addEventListener('error', res, { once: true });
            }),
      ),
    ),
  );
  await page.evaluate(
    () =>
      new Promise((res) =>
        requestAnimationFrame(() => requestAnimationFrame(res)),
      ),
  );
}

async function main() {
  const server = await startServer();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();

  try {
    await runOverflowAndLayoutMatrix(browser, base);
    await runTouchTargetPass(browser, base);
    await runMobileMenuPass(browser, base);
    await runReducedMotionPass(browser, base);
    await runThemePass(browser, base);
    await runReconfirmationChecks(browser, base);
  } finally {
    await browser.close();
    await new Promise((res) => server.close(res));
  }

  report();
}

/* --------------------------------------------------- overflow / layout */

async function elementIsClipped(handle) {
  return handle.evaluate((el) => {
    let node = el.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) return true;
      node = node.parentElement;
    }
    return false;
  });
}

async function isRenderedAndVisible(handle) {
  return handle.evaluate((el) => {
    if (el.closest('[hidden]')) return false;
    if (el.classList.contains('visually-hidden')) return false;
    if (el.closest('.visually-hidden')) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')
      return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

async function isSkipLinkResting(handle) {
  return handle.evaluate((el) => el.classList.contains('skip-link'));
}

async function runOverflowAndLayoutMatrix(browser, base) {
  for (const [name, path] of ROUTES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: HEIGHT } });
      try {
        await page.goto(`${base}${path}`);
        await settle(page);

        const docOverflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        const docOk = docOverflow.scrollWidth <= docOverflow.clientWidth + 1;
        if (!docOk) {
          const shot = await saveFailureShot(page, `${name}${path}`, width, 'document-overflow');
          record(
            'Overflow',
            `${name}@${width} documentElement no horizontal overflow`,
            false,
            `scrollWidth ${docOverflow.scrollWidth} > clientWidth ${docOverflow.clientWidth} (${shot})`,
            'scrollWidth <= clientWidth',
          );
        } else {
          record(
            'Overflow',
            `${name}@${width} documentElement no horizontal overflow`,
            true,
            'ok',
            'scrollWidth <= clientWidth',
          );
        }

        const offenders = await findOverflowingElements(page, width);
        if (offenders.length > 0) {
          const shot = await saveFailureShot(page, `${name}${path}`, width, 'element-overflow');
          record(
            'Overflow',
            `${name}@${width} no element overflows viewport bounds`,
            false,
            `${offenders.join('; ')} (${shot})`,
            'no offenders',
          );
        } else {
          record(
            'Overflow',
            `${name}@${width} no element overflows viewport bounds`,
            true,
            'ok',
            'no offenders',
          );
        }

        if (name === '404' || name === 'contact') {
          // Claim 12 is about 100vh leaving dead scroll on mobile browsers
          // whose chrome collapses on scroll — a fixed-viewport emulator has
          // no dynamic toolbar to reproduce that with, so this only confirms
          // body's min-height actually resolves via the svh fallback added
          // in Phase 1, not "content is short."
          const usesSvh = await page.evaluate(() => {
            const bodyHeight = document.body.getBoundingClientRect().height;
            return bodyHeight >= window.innerHeight - 1;
          });
          record(
            'Layout',
            `${name}@${width} body min-height fills viewport (svh fallback)`,
            usesSvh,
            usesSvh,
            true,
          );
        }

        if (width === 768 || width === 1024) {
          if (name === 'french-coach' || name === 'robot') {
            await measureCaseStudyStack(page, name, width);
          }
        }
      } finally {
        await page.close();
      }
    }
  }
}

async function findOverflowingElements(page, width) {
  const handles = await page.$$('body *');
  const offenders = [];
  for (const handle of handles) {
    const visible = await isRenderedAndVisible(handle);
    if (!visible) continue;
    if (await isSkipLinkResting(handle)) continue;

    const rect = await handle.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, tag: el.tagName.toLowerCase() };
    });

    const spillsEdge = rect.left < -1 || rect.right > width + 1;

    let flagged = false;
    let reason = null;

    if (spillsEdge) {
      const clipped = await elementIsClipped(handle);
      if (!clipped) {
        flagged = true;
        reason = `edge spill left=${rect.left.toFixed(0)} right=${rect.right.toFixed(0)}`;
      }
    }

    if (!flagged) {
      const nested = await handle.evaluate((el) => {
        const style = getComputedStyle(el);
        if (style.overflowX !== 'visible') return null;
        return el.scrollWidth > el.clientWidth + 1
          ? { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
          : null;
      });
      if (nested) {
        flagged = true;
        reason = `nested overflow scrollWidth=${nested.scrollWidth} clientWidth=${nested.clientWidth}`;
      }
    }

    if (flagged) {
      offenders.push(`<${rect.tag}> ${reason}`);
    }
  }
  return offenders.slice(0, 10);
}

async function measureCaseStudyStack(page, name, width) {
  const rail = await page.$('.case-study__rail');
  const prose = await page.$('.case-study__prose');
  if (!rail || !prose) return;
  const railBox = await rail.boundingBox();
  const proseBox = await prose.boundingBox();
  if (!railBox || !proseBox) return;
  const sideBySide = Math.abs(railBox.y - proseBox.y) < railBox.height * 0.5 && railBox.x !== proseBox.x;
  record(
    'Layout',
    `${name}@${width} case study rail/prose arrangement`,
    true,
    sideBySide ? 'side-by-side' : 'stacked',
    'measured (informational — feeds claim 9)',
  );
}

/* -------------------------------------------------------------- touch */

async function runTouchTargetPass(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${base}/`);
    await settle(page);

    const coarse = await page.evaluate(
      () =>
        matchMedia('(pointer: coarse)').matches && matchMedia('(hover: none)').matches,
    );
    record(
      'Touch',
      'context reports coarse pointer + no hover',
      coarse,
      coarse,
      true,
    );
    if (!coarse) {
      await context.close();
      return;
    }

    for (const [name, path] of ROUTES) {
      if (name === '404') continue;
      await page.goto(`${base}${path}`);
      await settle(page);

      const targets = await page.$$(
        'a, button, input, textarea, select, summary, [role="button"]',
      );
      const rects = [];
      for (const handle of targets) {
        const visible = await isRenderedAndVisible(handle);
        if (!visible) continue;
        const isInlineExempt = await handle.evaluate(
          (el, selector) => el.matches(selector),
          INLINE_EXEMPT,
        );
        const box = await handle.boundingBox();
        if (!box) continue;
        rects.push({ box, isInlineExempt, handle });
      }

      const undersized = rects.filter(
        (r) => !r.isInlineExempt && (r.box.width < 44 || r.box.height < 44),
      );
      if (undersized.length > 0) {
        const shot = await saveFailureShot(page, `${name}${path}`, 375, 'touch-target-size');
        record(
          'Touch',
          `${name} touch targets >= 44x44px`,
          false,
          `${undersized.length} undersized (${shot})`,
          '>= 44x44px',
        );
      } else {
        record('Touch', `${name} touch targets >= 44x44px`, true, 'ok', '>= 44x44px');
      }

      const tooClose = [];
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const a = rects[i].box;
          const b = rects[j].box;
          const verticallyAdjacent =
            a.y < b.y + b.height && b.y < a.y + a.height;
          if (!verticallyAdjacent) continue;
          const gap = a.x < b.x ? b.x - (a.x + a.width) : a.x - (b.x + b.width);
          if (gap >= 0 && gap < 8 && !rects[i].isInlineExempt && !rects[j].isInlineExempt) {
            tooClose.push(gap);
          }
        }
      }
      if (tooClose.length > 0) {
        const shot = await saveFailureShot(page, `${name}${path}`, 375, 'touch-target-gap');
        record(
          'Touch',
          `${name} adjacent touch targets >= 8px apart`,
          false,
          `${tooClose.length} pairs too close (${shot})`,
          '>= 8px separation',
        );
      } else {
        record(
          'Touch',
          `${name} adjacent touch targets >= 8px apart`,
          true,
          'ok',
          '>= 8px separation',
        );
      }
    }
  } finally {
    await context.close();
  }
}

/* --------------------------------------------------------------- menu */

async function runMobileMenuPass(browser, base) {
  for (const width of [320, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    try {
      await page.goto(`${base}/`);
      await settle(page);

      const toggle = page.locator('#menu-toggle');
      const nav = page.locator('#site-nav');

      const accessibleName = await toggle.evaluate((el) => el.textContent?.trim() ?? '');
      record(
        'Menu',
        `@${width} toggle has non-empty accessible name`,
        accessibleName.length > 0,
        accessibleName || '(empty)',
        'non-empty',
      );

      const controls = await toggle.getAttribute('aria-controls');
      const navId = await nav.getAttribute('id');
      record(
        'Menu',
        `@${width} aria-controls resolves to panel id`,
        controls === navId,
        `aria-controls="${controls}" panel id="${navId}"`,
        'match',
      );

      const expandedBefore = await toggle.getAttribute('aria-expanded');
      record(
        'Menu',
        `@${width} aria-expanded false when closed`,
        expandedBefore === 'false',
        expandedBefore,
        'false',
      );

      const mainTopBefore = await page.evaluate(
        () => document.querySelector('main')?.getBoundingClientRect().top,
      );
      const scrollYBefore = await page.evaluate(() => window.scrollY);

      await toggle.click();
      await page.waitForTimeout(50);

      const expandedAfter = await toggle.getAttribute('aria-expanded');
      record(
        'Menu',
        `@${width} aria-expanded true when open`,
        expandedAfter === 'true',
        expandedAfter,
        'true',
      );

      const mainTopAfter = await page.evaluate(
        () => document.querySelector('main')?.getBoundingClientRect().top,
      );
      const scrollYAfter = await page.evaluate(() => window.scrollY);
      const displaced =
        Math.abs((mainTopAfter ?? 0) - (mainTopBefore ?? 0)) > 1 ||
        Math.abs(scrollYAfter - scrollYBefore) > 1;
      if (displaced) {
        const shot = await saveFailureShot(page, '/', width, 'menu-displacement');
        record(
          'Menu',
          `@${width} opening menu does not displace page`,
          false,
          `main top ${mainTopBefore}->${mainTopAfter}, scrollY ${scrollYBefore}->${scrollYAfter} (${shot})`,
          'unchanged',
        );
      } else {
        record('Menu', `@${width} opening menu does not displace page`, true, 'unchanged', 'unchanged');
      }

      const focusInsidePanel = await page.evaluate(() => {
        const nav = document.getElementById('site-nav');
        return nav ? nav.contains(document.activeElement) : false;
      });
      record(
        'Menu',
        `@${width} focus moves into panel on open`,
        focusInsidePanel,
        focusInsidePanel,
        true,
      );

      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
      const expandedAfterEscape = await toggle.getAttribute('aria-expanded');
      const focusReturnedToToggle = await page.evaluate(
        () => document.activeElement?.id === 'menu-toggle',
      );
      record(
        'Menu',
        `@${width} Escape closes and restores focus to toggle`,
        expandedAfterEscape === 'false' && focusReturnedToToggle,
        `aria-expanded=${expandedAfterEscape} focusReturned=${focusReturnedToToggle}`,
        'closed + focus on toggle',
      );

      await toggle.click();
      await page.waitForTimeout(50);
      await page.mouse.click(width - 5, 5);
      await page.waitForTimeout(50);
      const expandedAfterOutside = await toggle.getAttribute('aria-expanded');
      record(
        'Menu',
        `@${width} outside interaction closes menu`,
        expandedAfterOutside === 'false',
        expandedAfterOutside,
        'false',
      );
    } finally {
      await page.close();
    }
  }

  const resizePage = await browser.newPage({ viewport: { width: 375, height: 800 } });
  try {
    await resizePage.goto(`${base}/`);
    await settle(resizePage);
    await resizePage.locator('#menu-toggle').click();
    await resizePage.waitForTimeout(50);
    await resizePage.setViewportSize({ width: 1024, height: 800 });
    await resizePage.waitForTimeout(100);
    const expandedAtDesktop = await resizePage
      .locator('#menu-toggle')
      .getAttribute('aria-expanded');
    const navVisible = await resizePage.locator('#site-nav').isVisible();
    record(
      'Menu',
      'resize 375->1024 while open leaves usable desktop nav',
      expandedAtDesktop === 'false' && navVisible,
      `aria-expanded=${expandedAtDesktop} navVisible=${navVisible}`,
      'aria-expanded=false, nav visible',
    );
  } finally {
    await resizePage.close();
  }
}

/* ------------------------------------------------------------ reduced */

async function runReducedMotionPass(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/`);
    await settle(page);

    const toggle = page.locator('#menu-toggle');
    await toggle.click();
    await page.waitForTimeout(50);
    const openedUnderReduced = (await toggle.getAttribute('aria-expanded')) === 'true';

    const durations = await page.evaluate(() => {
      const nav = document.getElementById('site-nav');
      const panel = document.querySelector('.site-nav, #site-nav');
      const els = [nav, panel].filter(Boolean);
      return els.map((el) => {
        const style = getComputedStyle(el);
        return {
          transition: style.transitionDuration,
          animation: style.animationDuration,
        };
      });
    });

    const parseMs = (value) => {
      if (!value) return 0;
      return value
        .split(',')
        .map((v) => (v.trim().endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000))
        .reduce((max, n) => Math.max(max, n || 0), 0);
    };
    const maxDuration = durations.reduce(
      (max, d) => Math.max(max, parseMs(d.transition), parseMs(d.animation)),
      0,
    );

    record(
      'Reduced motion',
      'menu opens under reduced motion',
      openedUnderReduced,
      openedUnderReduced,
      true,
    );
    record(
      'Reduced motion',
      'no menu transition/animation duration above 1ms',
      maxDuration <= 1,
      `${maxDuration}ms`,
      '<= 1ms',
    );

    await toggle.click();
    await page.waitForTimeout(50);
    const closedUnderReduced = (await toggle.getAttribute('aria-expanded')) === 'false';
    record(
      'Reduced motion',
      'menu closes under reduced motion',
      closedUnderReduced,
      closedUnderReduced,
      true,
    );
  } finally {
    await context.close();
  }
}

/* ----------------------------------------------------------------- theme */

async function runThemePass(browser, base) {
  for (const [name, path] of [
    ['home', '/'],
    ['french-coach', '/projects/french-coach'],
  ]) {
    for (const width of [375, 1024]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      try {
        await page.goto(`${base}${path}`);
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
        await settle(page);

        const docOverflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        const ok = docOverflow.scrollWidth <= docOverflow.clientWidth + 1;
        if (!ok) {
          const shot = await saveFailureShot(page, `${name}${path}`, width, 'dark-theme-overflow');
          record(
            'Theme',
            `${name}@${width} dark theme no horizontal overflow`,
            false,
            `scrollWidth ${docOverflow.scrollWidth} > clientWidth ${docOverflow.clientWidth} (${shot})`,
            'scrollWidth <= clientWidth',
          );
        } else {
          record(
            'Theme',
            `${name}@${width} dark theme no horizontal overflow`,
            true,
            'ok',
            'scrollWidth <= clientWidth',
          );
        }
      } finally {
        await page.close();
      }
    }
  }
}

/* --------------------------------------------------------- claims 1-12 */

async function runReconfirmationChecks(browser, base) {
  // Claim 1: header wraps to two rows at <=375px.
  for (const width of [320, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    try {
      await page.goto(`${base}/`);
      await settle(page);
      const headerHeight = await page.evaluate(
        () => document.querySelector('.site-header')?.offsetHeight ?? 0,
      );
      record(
        'Claims',
        `claim 1: header wraps at ${width}px (offsetHeight > 64px)`,
        headerHeight > 64,
        `${headerHeight}px`,
        '> 64px if claim holds',
      );
    } finally {
      await page.close();
    }
  }

  // Claim 7: doubled external-link arrow on "Writing" nav item.
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });
    try {
      await page.goto(`${base}/`);
      await settle(page);
      const writingLinkText = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('#site-nav a'));
        const writing = links.find((a) => a.textContent?.includes('Writing'));
        return writing ? writing.textContent.trim() : null;
      });
      const doubled = writingLinkText ? /↗\s*↗|→\s*→|↗.*↗/u.test(writingLinkText) : false;
      record(
        'Claims',
        'claim 7: "Writing" nav link text',
        true,
        writingLinkText ?? '(not found)',
        'informational — doubled arrow present: ' + doubled,
      );
    } finally {
      await page.close();
    }
  }

  // Claims 4-5: button heights under coarse pointer.
  {
    const context = await browser.newContext({
      viewport: { width: 375, height: 800 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    try {
      await page.goto(`${base}/`);
      await settle(page);
      const heights = await page.evaluate(() => {
        const results = {};
        for (const cls of ['btn--quiet', 'btn--md', 'btn--sm']) {
          const el = document.querySelector(`.${cls}`);
          results[cls] = el ? el.getBoundingClientRect().height : null;
        }
        return results;
      });
      record(
        'Claims',
        'claims 4-5: .btn--quiet/--md/--sm heights under coarse pointer',
        true,
        JSON.stringify(heights),
        'informational (target 44px each)',
      );
    } finally {
      await context.close();
    }
  }

  // Claim 8: compact image slot rendered width vs sizes expression.
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });
    try {
      await page.goto(`${base}/`);
      await settle(page);
      const widths = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.map((img) => ({
          src: img.currentSrc || img.src,
          renderedWidth: img.getBoundingClientRect().width,
          sizes: img.getAttribute('sizes'),
        }));
      });
      record(
        'Claims',
        'claim 8: rendered img widths vs sizes attribute',
        true,
        JSON.stringify(widths).slice(0, 500),
        'informational — feeds compact sizes fix',
      );
    } finally {
      await page.close();
    }
  }
}

/* --------------------------------------------------------------- report */

function report() {
  console.log('\nResponsive audit — browser-verified\n');

  let group = '';
  for (const result of results) {
    if (result.group !== group) {
      group = result.group;
      console.log(`  ${group}`);
    }
    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(
      `    ${mark}  ${result.gate.padEnd(58)} actual: ${String(result.actual).padEnd(30)} target: ${result.target}`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (shotCount > 0) {
    console.log(`${shotCount} failure screenshot(s) written to .audit/`);
  }
  console.log('');
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
