/*
  The site's single motion and interaction module. Content never depends on
  it: every effect is additive, pointer effects only attach on a fine pointer
  with motion allowed, and handlers are rAF-throttled so nothing runs idle.
*/

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Runs `handler` at most once per animation frame with the latest event. */
function throttled<E extends Event>(handler: (event: E) => void): (event: E) => void {
  let latest: E | null = null;
  let queued = false;
  return (event: E) => {
    latest = event;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (latest) handler(latest);
    });
  };
}

function initReveal(): void {
  if (reduce) return;
  const targets = document.querySelectorAll<HTMLElement>('.reveal');
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );

  const viewport = window.innerHeight;
  const already: HTMLElement[] = [];
  targets.forEach((target) => {
    const rect = target.getBoundingClientRect();
    if (rect.top < viewport && rect.bottom > 0) already.push(target);
    else observer.observe(target);
  });
  requestAnimationFrame(() => already.forEach((target) => target.classList.add('is-visible')));
}

function initHeader(): void {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return;
  const update = () => {
    header.dataset.scrolled = window.scrollY > 16 ? 'true' : 'false';
  };
  window.addEventListener('scroll', throttled(update), { passive: true });
  update();
}

function initSpotlight(): void {
  if (!fine || reduce) return;
  document.querySelectorAll<HTMLElement>('[data-spotlight]').forEach((host) => {
    host.addEventListener(
      'pointermove',
      throttled((event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        host.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        host.style.setProperty('--my', `${event.clientY - rect.top}px`);
      }),
    );
    host.addEventListener('pointerleave', () => {
      host.style.removeProperty('--mx');
      host.style.removeProperty('--my');
    });
  });
}

function initTilt(): void {
  if (!fine || reduce) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    let inside = false;
    card.addEventListener(
      'pointermove',
      throttled((event: PointerEvent) => {
        if (!inside) return;
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
        card.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
        card.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
        card.dataset.tilting = '';
      }),
    );
    card.addEventListener('pointerenter', () => {
      inside = true;
    });
    card.addEventListener('pointerleave', () => {
      inside = false;
      for (const prop of ['--rx', '--ry', '--gx', '--gy']) card.style.removeProperty(prop);
      delete card.dataset.tilting;
    });
  });
}

function initMagnetic(): void {
  if (!fine || reduce) return;
  const clamp = (value: number) => Math.max(-6, Math.min(6, value));
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    let inside = false;
    el.addEventListener(
      'pointermove',
      throttled((event: PointerEvent) => {
        if (!inside) return;
        const rect = el.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        el.style.setProperty('--tx', `${clamp(dx * 0.18).toFixed(2)}px`);
        el.style.setProperty('--ty', `${clamp(dy * 0.18).toFixed(2)}px`);
      }),
    );
    el.addEventListener('pointerenter', () => {
      inside = true;
    });
    el.addEventListener('pointerleave', () => {
      inside = false;
      el.style.setProperty('--tx', '0px');
      el.style.setProperty('--ty', '0px');
    });
  });
}

function initNavIndicator(): void {
  if (!fine || reduce || !matchMedia('(min-width: 768px)').matches) return;
  const list = document.querySelector<HTMLElement>('.site-menu .primary-nav');
  const indicator = list?.querySelector<HTMLElement>('.primary-nav__indicator');
  if (!list || !indicator) return;

  const links = [...list.querySelectorAll<HTMLAnchorElement>('.primary-nav__link')];
  const current = links.find((link) => link.getAttribute('aria-current') === 'page');

  const moveTo = (link: HTMLElement | undefined) => {
    if (!link) {
      indicator.dataset.visible = 'false';
      return;
    }
    indicator.style.setProperty('--ind-x', `${link.offsetLeft}px`);
    indicator.style.setProperty('--ind-w', `${link.offsetWidth}px`);
    indicator.dataset.visible = 'true';
  };

  list.dataset.indicator = 'on';
  moveTo(current);
  links.forEach((link) => link.addEventListener('pointerenter', () => moveTo(link)));
  list.addEventListener('pointerleave', () => moveTo(current));
}

function initToc(): void {
  const toc = document.querySelector<HTMLElement>('.case-study__toc');
  if (!toc) return;
  const headings = document.querySelectorAll<HTMLElement>('.case-study__prose h2[id]');
  if (headings.length === 0) return;
  const links = [...toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];

  // A jump (back to top, a TOC click) can skip past the observer band, so the
  // active heading is recomputed from positions rather than taken from entries.
  const sync = (): void => {
    const line = window.innerHeight * 0.35;
    let id = '';
    headings.forEach((heading) => {
      if (heading.getBoundingClientRect().top <= line) id = heading.id;
    });
    for (const link of links) {
      if (id && link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };

  const observer = new IntersectionObserver(sync, { rootMargin: '-25% 0px -65% 0px' });
  headings.forEach((heading) => observer.observe(heading));
  window.addEventListener('scrollend', sync, { passive: true });
}

function initCopy(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    const label = btn.querySelector<HTMLElement>('.copy-btn__label');
    const original = label?.textContent ?? '';
    const status = btn.parentElement?.querySelector<HTMLElement>('[data-copy-status]');
    let timer: number | undefined;

    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy ?? '';
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        location.href = `mailto:${value}`;
        return;
      }
      btn.dataset.copied = 'true';
      if (label) label.textContent = 'Copied';
      if (status) status.textContent = 'Email address copied';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        delete btn.dataset.copied;
        if (label) label.textContent = original;
        if (status) status.textContent = '';
      }, 2000);
    });
  });
}

function initClock(): void {
  const clocks = document.querySelectorAll<HTMLElement>('[data-clock]');
  if (clocks.length === 0) return;

  const render = () => {
    clocks.forEach((el) => {
      const format = new Intl.DateTimeFormat('en-GB', {
        timeZone: el.dataset.clock,
        hour: '2-digit',
        minute: '2-digit',
      });
      el.textContent = `${format.format(new Date())} IST`;
    });
  };

  render();
  window.setInterval(() => {
    if (document.visibilityState === 'visible') render();
  }, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render();
  });
}

function init(): void {
  initReveal();
  initHeader();
  initSpotlight();
  initTilt();
  initMagnetic();
  initNavIndicator();
  initToc();
  initCopy();
  initClock();
}

init();
