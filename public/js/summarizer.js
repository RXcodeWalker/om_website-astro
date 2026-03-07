// ═══════════════════════════════════════════════════════════════
//  summarizer.js — AI Post Summarizer
//
//  Features:
//    • "Summarize" pill button injected into #post-meta
//      (right after the "Listen" button from reader.js)
//    • Calls /.netlify/functions/summarize  (keeps API key server-side)
//    • Beautiful floating panel: TL;DR + key points + tone badge
//    • Loading shimmer while the API call is in flight
//    • Copy-to-clipboard the full summary
//    • Regenerate button re-runs the call
//    • Caches result in sessionStorage — free rerenders
//    • Focus mode B&W aware
//    • Keyboard: Esc closes the panel
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  let panelOpen   = false;
  let isLoading   = false;
  let summaryData = null;  // { tldr, keyPoints, tone, wordCount }
  let postTitle   = '';
  let postId      = '';

  // ─── Boot ───────────────────────────────────────────────────
  (function boot() {
    const tryInit = () => {
      const pb = document.getElementById('post-body');
      if (pb && pb.children.length > 0) {
        observer.disconnect();
        onPostReady();
        return true;
      }
      return false;
    };
    const observer = new MutationObserver(tryInit);
    observer.observe(document.body, { childList: true, subtree: true });
    if (!tryInit()) setTimeout(tryInit, 700);
  })();

  function onPostReady() {
    // Grab post title + id for cache key
    postTitle = document.querySelector('#post-content h1')?.textContent?.trim() || '';
    postId    = new URLSearchParams(window.location.search).get('id') || 'post';

    // Restore cached summary if available
    try {
      const cached = sessionStorage.getItem('summary-' + postId);
      if (cached) summaryData = JSON.parse(cached);
    } catch {}

    injectSummarizeButton();
    buildPanel();
    wireKeyboard();
  }

  // ─── Inject button ──────────────────────────────────────────
  function injectSummarizeButton() {
    if (document.getElementById('summarize-btn')) return;
    const meta = document.getElementById('post-meta');
    if (!meta) return;

    const btn = document.createElement('button');
    btn.id        = 'summarize-btn';
    btn.className = 'summarize-btn';
    btn.setAttribute('aria-label', 'AI Summary');
    btn.setAttribute('title', 'Generate AI summary');
    btn.innerHTML = `
      <span class="sb-inner">
        <svg class="sb-icon" width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z"/>
          <path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>
        </svg>
        <span class="sb-label">Summarize</span>
      </span>
    `;

    btn.addEventListener('click', handleSummarizeBtnClick);

    // Insert right after #listen-btn (if present) or after #time-remaining
    const listenBtn = document.getElementById('listen-btn');
    const timeEl    = document.getElementById('time-remaining');
    const anchor    = listenBtn || timeEl;

    if (anchor && anchor.nextSibling) {
      meta.insertBefore(btn, anchor.nextSibling);
    } else if (anchor) {
      anchor.after(btn);
    } else {
      meta.appendChild(btn);
    }
  }

  function handleSummarizeBtnClick() {
    if (panelOpen) {
      closePanel();
    } else {
      openPanel();
      if (!summaryData) fetchSummary();
      else renderSummary(summaryData);
    }
  }

  // ─── Build panel DOM ────────────────────────────────────────
  function buildPanel() {
    if (document.getElementById('ai-summary-panel')) return;

    // Backdrop — click to close
    const backdrop = document.createElement('div');
    backdrop.id        = 'ai-summary-backdrop';
    backdrop.className = 'ai-summary-backdrop';
    backdrop.addEventListener('click', closePanel);

    // Panel
    const panel = document.createElement('div');
    panel.id             = 'ai-summary-panel';
    panel.className      = 'ai-summary-panel glass-card';
    panel.setAttribute('aria-label', 'AI Summary');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <!-- Header -->
      <div class="asp-header">
        <div class="asp-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true" class="asp-sparkle">
            <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z"/>
            <path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>
          </svg>
          AI Summary
        </div>
        <div class="asp-header-actions">
          <button class="asp-action-btn" id="asp-copy-btn"
            aria-label="Copy summary" title="Copy summary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="asp-action-btn" id="asp-regen-btn"
            aria-label="Regenerate summary" title="Regenerate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          <div class="asp-vdivider"></div>
          <button class="asp-action-btn asp-close-btn" id="asp-close-btn"
            aria-label="Close summary" title="Close (Esc)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="asp-body" id="asp-body">
        <!-- content injected by renderLoading() / renderSummary() / renderError() -->
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    document.getElementById('asp-close-btn').addEventListener('click', closePanel);
    document.getElementById('asp-copy-btn').addEventListener('click', copySummary);
    document.getElementById('asp-regen-btn').addEventListener('click', regenerate);
  }

  // ─── Panel open / close ─────────────────────────────────────
  function openPanel() {
    panelOpen = true;
    document.getElementById('ai-summary-backdrop')?.classList.add('open');
    const panel = document.getElementById('ai-summary-panel');
    if (panel) {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
    }
    document.getElementById('summarize-btn')?.classList.add('active');
  }

  function closePanel() {
    panelOpen = false;
    document.getElementById('ai-summary-backdrop')?.classList.remove('open');
    const panel = document.getElementById('ai-summary-panel');
    if (panel) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
    }
    document.getElementById('summarize-btn')?.classList.remove('active');
  }

  // ─── Fetch summary from Netlify function ────────────────────
  async function fetchSummary() {
    renderLoading();
    isLoading = true;

    // Extract clean text from rendered post
    const bodyEl = document.getElementById('post-body');
    const text   = bodyEl ? bodyEl.innerText.trim() : '';

    try {
      const res = await fetch('/.netlify/functions/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: postTitle, text }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      summaryData = data;
      // Cache in sessionStorage so reopening is instant
      try { sessionStorage.setItem('summary-' + postId, JSON.stringify(data)); } catch {}

      renderSummary(data);
    } catch (err) {
      renderError(err.message);
    } finally {
      isLoading = false;
    }
  }

  function regenerate() {
    summaryData = null;
    try { sessionStorage.removeItem('summary-' + postId); } catch {}
    fetchSummary();
  }

  // ─── Rendering states ────────────────────────────────────────
  function renderLoading() {
    const body = document.getElementById('asp-body');
    if (!body) return;
    body.innerHTML = `
      <div class="asp-loading">
        <div class="asp-shimmer asp-shimmer-tldr"></div>
        <div class="asp-shimmer asp-shimmer-line"></div>
        <div class="asp-shimmer asp-shimmer-line" style="width:80%"></div>
        <div class="asp-shimmer asp-shimmer-line" style="width:90%"></div>
        <div class="asp-loading-label">
          <span class="asp-dot-anim"></span>
          Analysing post with Claude
        </div>
      </div>
    `;
  }

  function renderSummary(data) {
    const body = document.getElementById('asp-body');
    if (!body) return;

    const readingTimeSaved = Math.max(1, Math.round(data.wordCount / 200));
    const pointsHTML = (data.keyPoints || []).map((pt, i) => `
      <li class="asp-point">
        <span class="asp-point-num">${i + 1}</span>
        <span class="asp-point-text">${escapeHtml(pt)}</span>
      </li>
    `).join('');

    body.innerHTML = `
      <!-- TL;DR callout -->
      <div class="asp-tldr">
        <div class="asp-tldr-label">TL;DR</div>
        <p class="asp-tldr-text">${escapeHtml(data.tldr)}</p>
      </div>

      <!-- Key points -->
      <div class="asp-section">
        <div class="asp-section-label">Key Points</div>
        <ol class="asp-points">${pointsHTML}</ol>
      </div>

      <!-- Footer stats -->
      <div class="asp-footer">
        <span class="asp-tone-badge">${escapeHtml(data.tone)}</span>
        <span class="asp-stat">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          ${readingTimeSaved} min read · summarised in seconds
        </span>
      </div>
    `;
  }

  function renderError(msg) {
    const body = document.getElementById('asp-body');
    if (!body) return;
    body.innerHTML = `
      <div class="asp-error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
          aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="asp-error-msg">Couldn't generate summary.</p>
        <p class="asp-error-detail">${escapeHtml(msg || 'Unknown error')}</p>
        <button class="asp-retry-btn" id="asp-retry-btn">Try again</button>
      </div>
    `;
    document.getElementById('asp-retry-btn')?.addEventListener('click', regenerate);
  }

  // ─── Copy to clipboard ───────────────────────────────────────
  async function copySummary() {
    if (!summaryData) return;
    const text = [
      `TL;DR: ${summaryData.tldr}`,
      '',
      'Key Points:',
      ...(summaryData.keyPoints || []).map((p, i) => `${i + 1}. ${p}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    // Brief visual feedback on the copy button
    const btn = document.getElementById('asp-copy-btn');
    if (btn) {
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>`;
      btn.style.color = 'var(--accent-1)';
      setTimeout(() => {
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>`;
        btn.style.color = '';
      }, 1600);
    }
  }

  // ─── Keyboard ────────────────────────────────────────────────
  function wireKeyboard() {
    document.addEventListener('keydown', e => {
      if (!panelOpen) return;
      if (e.code === 'Escape') closePanel();
    });
  }

  // ─── Utility ─────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();