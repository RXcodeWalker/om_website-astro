// ═══════════════════════════════════════════════════════════════
//  reader.js — Audio Reader for Blog Posts
//
//  Features:
//    • Auto-selects best available voice (prefers Google/Apple/MS Natural)
//    • Paragraph-level highlighting + smooth auto-scroll
//    • Play / Pause / Resume / Skip forward & back
//    • Speed: 0.75× 1× 1.25× 1.5× 2×
//    • Animated soundwave while speaking
//    • Progress bar + live "N min left" countdown
//    • Keyboard: Space=play/pause  ← →=skip  Esc=close
//    • Chrome keep-alive fix (browser pauses TTS after ~15s)
//    • Focus mode + dark mode aware (goes B&W with the rest)
//    • Cleans up on close — no ghost utterances
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Guard: Web Speech API required ──────────────────────────
  if (!window.speechSynthesis) return;

  const synth = window.speechSynthesis;

  // ─── State ──────────────────────────────────────────────────
  let segments    = [];     // Array of { el: HTMLElement, text: string }
  let currentIdx  = -1;
  let isPlaying   = false;
  let isPaused    = false;
  let playerOpen  = false;
  let selectedVoice = null;
  let keepAliveTimer = null;

  const RATES    = [0.75, 1, 1.25, 1.5, 2];
  const RATE_LABELS = ['0.75×', '1×', '1.25×', '1.5×', '2×'];
  let   rateIdx  = 1;  // default 1×

  // ─── Boot: wait for the post to render ──────────────────────
  // post.js writes #post-body asynchronously after fetching JSON.
  // We watch for it with a MutationObserver, then init.
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
    if (!tryInit()) {
      // Also try after common post-render delay
      setTimeout(tryInit, 600);
    }
  })();

  // ─── Post is ready ──────────────────────────────────────────
  function onPostReady() {
    loadVoices();
    injectListenButton();
    buildPlayer();
    wireKeyboard();
  }

  // ─── Voice selection ────────────────────────────────────────
  function loadVoices() {
    function pickBest() {
      const all = synth.getVoices();
      if (!all.length) return;

      // Priority list — natural / high-quality voices first
      const order = [
        // macOS / iOS
        'Samantha', 'Alex', 'Karen', 'Daniel', 'Moira', 'Tessa',
        // Chrome (Google TTS)
        'Google US English', 'Google UK English Female',
        'Google UK English Male',
        // Windows / Edge Natural
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Jenny Online (Natural) - English (United States)',
        'Microsoft Guy Online (Natural) - English (United States)',
        'Microsoft Aria - English (United States)',
        // Windows fallbacks
        'Microsoft David - English (United States)',
        'Microsoft Zira - English (United States)',
        'Microsoft Mark - English (United States)',
      ];

      for (const name of order) {
        const v = all.find(v => v.name === name);
        if (v) { selectedVoice = v; return; }
      }
      // Fallback: first en-US → first English → first available
      selectedVoice =
        all.find(v => v.lang === 'en-US') ||
        all.find(v => v.lang.startsWith('en')) ||
        all[0] || null;
    }

    pickBest();
    if (!selectedVoice) {
      synth.addEventListener('voiceschanged', pickBest, { once: true });
    }
  }

  // ─── Inject "Listen" button into #post-meta ─────────────────
  function injectListenButton() {
    if (document.getElementById('listen-btn')) return;
    const meta = document.getElementById('post-meta');
    if (!meta) return;

    const btn = document.createElement('button');
    btn.id = 'listen-btn';
    btn.className = 'listen-btn';
    btn.setAttribute('aria-label', 'Listen to this post');
    btn.setAttribute('title', 'Listen to this post');
    btn.innerHTML = `
      <span class="listen-btn-inner">
        <svg class="lb-icon lb-icon-play" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
        <svg class="lb-icon lb-icon-pause" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:none">
          <rect x="5" y="3" width="5" height="18" rx="1"/>
          <rect x="14" y="3" width="5" height="18" rx="1"/>
        </svg>
        <span class="lb-label">Listen</span>
      </span>
    `;

    btn.addEventListener('click', handleListenBtnClick);

    // Insert right after #time-remaining (or just append)
    const timeEl = document.getElementById('time-remaining');
    if (timeEl && timeEl.nextSibling) {
      meta.insertBefore(btn, timeEl.nextSibling);
    } else if (timeEl) {
      timeEl.after(btn);
    } else {
      meta.appendChild(btn);
    }
  }

  function handleListenBtnClick() {
    if (!playerOpen) {
      openPlayer();
      startFromBeginning();
    } else if (isPlaying && !isPaused) {
      pauseReading();
    } else {
      resumeReading();
    }
  }

  // ─── Build the floating player ──────────────────────────────
  function buildPlayer() {
    if (document.getElementById('tts-player')) return;

    const player = document.createElement('div');
    player.id = 'tts-player';
    player.className = 'tts-player glass-card';
    player.setAttribute('aria-label', 'Audio reader');
    player.setAttribute('aria-hidden', 'true');
    player.innerHTML = `
      <!-- Reading progress bar across the top edge -->
      <div class="tts-progress-track" id="tts-progress-track">
        <div class="tts-progress-fill" id="tts-progress-fill"></div>
      </div>

      <!-- Main player row -->
      <div class="tts-body">

        <!-- Animated sound bars -->
        <div class="tts-waveform" id="tts-waveform" aria-hidden="true">
          <span class="tts-bar" style="--i:0"></span>
          <span class="tts-bar" style="--i:1"></span>
          <span class="tts-bar" style="--i:2"></span>
          <span class="tts-bar" style="--i:3"></span>
          <span class="tts-bar" style="--i:4"></span>
        </div>

        <!-- Text preview + sub-info -->
        <div class="tts-text-area">
          <div class="tts-preview" id="tts-preview">Ready to listen…</div>
          <div class="tts-meta" id="tts-meta">–</div>
        </div>

        <!-- Controls -->
        <div class="tts-controls">
          <button class="tts-btn tts-skip-btn" id="tts-prev"
            aria-label="Previous paragraph" title="Previous (←)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round">
              <polygon points="19,20 9,12 19,4"/>
              <line x1="5" y1="19" x2="5" y2="5"/>
            </svg>
          </button>

          <button class="tts-btn tts-playpause-btn" id="tts-playpause"
            aria-label="Play" title="Play / Pause (Space)">
            <svg class="tts-icon-play" width="16" height="16" viewBox="0 0 24 24"
              fill="currentColor" aria-hidden="true">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            <svg class="tts-icon-pause" width="16" height="16" viewBox="0 0 24 24"
              fill="currentColor" aria-hidden="true" style="display:none">
              <rect x="5" y="3" width="5" height="18" rx="1"/>
              <rect x="14" y="3" width="5" height="18" rx="1"/>
            </svg>
          </button>

          <button class="tts-btn tts-skip-btn" id="tts-next"
            aria-label="Next paragraph" title="Next (→)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5,4 15,12 5,20"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </button>

          <button class="tts-btn tts-rate-btn" id="tts-rate"
            aria-label="Playback speed" title="Cycle speed">
            <span id="tts-rate-label">1×</span>
          </button>

          <div class="tts-vdivider"></div>

          <button class="tts-btn tts-close-btn" id="tts-close"
            aria-label="Close reader" title="Close (Esc)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(player);

    // Wire player controls
    document.getElementById('tts-playpause').addEventListener('click', togglePlayPause);
    document.getElementById('tts-prev').addEventListener('click', skipPrev);
    document.getElementById('tts-next').addEventListener('click', skipNext);
    document.getElementById('tts-rate').addEventListener('click', cycleRate);
    document.getElementById('tts-close').addEventListener('click', closePlayer);
  }

  // ─── Keyboard shortcuts ──────────────────────────────────────
  function wireKeyboard() {
    document.addEventListener('keydown', e => {
      if (!playerOpen) return;
      // Ignore when typing
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        togglePlayPause();
      }
      if (e.code === 'ArrowRight') { e.preventDefault(); skipNext(); }
      if (e.code === 'ArrowLeft')  { e.preventDefault(); skipPrev(); }
      if (e.code === 'Escape')     { closePlayer(); }
    });
  }

  // ─── Segment extraction ──────────────────────────────────────
  // Walk every p / h2 / h3 in #post-body. Filter empties.
  function buildSegments() {
    const body = document.getElementById('post-body');
    if (!body) return [];
    return Array.from(body.querySelectorAll('p, h2, h3'))
      .map(el => ({ el, text: el.textContent.trim() }))
      .filter(s => s.text.length > 1);
  }

  // ─── Playback core ───────────────────────────────────────────
  function startFromBeginning() {
    segments = buildSegments();
    if (!segments.length) return;
    isPlaying = true;
    isPaused  = false;
    speakAt(0);
  }

  function speakAt(idx) {
    // Clamp
    if (idx < 0) idx = 0;
    if (idx >= segments.length) { finishReading(); return; }

    synth.cancel();            // clear queue immediately
    currentIdx = idx;

    const seg = segments[idx];
    const utt = new SpeechSynthesisUtterance(seg.text);
    utt.rate   = RATES[rateIdx];
    utt.pitch  = 1;
    utt.volume = 1;
    if (selectedVoice) utt.voice = selectedVoice;

    utt.onstart = () => {
      isPlaying = true;
      isPaused  = false;
      highlightSegment(idx);
      scrollToSegment(idx);
      updatePlayerText(idx);
      updateProgress(idx);
      updatePlayPauseUI();
      updateListenBtnUI();
      startKeepAlive();
    };

    utt.onend = () => {
      unhighlightSegment(idx);
      stopKeepAlive();
      if (isPlaying && !isPaused) {
        speakAt(idx + 1);
      }
    };

    utt.onerror = e => {
      stopKeepAlive();
      // 'interrupted' / 'canceled' are expected on skip/stop — ignore silently
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('[reader] TTS error:', e.error);
      // Try to continue with next segment
      if (isPlaying) speakAt(idx + 1);
    };

    synth.speak(utt);
  }

  function togglePlayPause() {
    if (!playerOpen) return;
    if (!segments.length) { startFromBeginning(); return; }

    if (isPlaying && !isPaused) {
      pauseReading();
    } else {
      resumeReading();
    }
  }

  function pauseReading() {
    isPlaying = false;
    isPaused  = true;
    synth.pause();
    stopKeepAlive();
    setWavePlaying(false);
    updatePlayPauseUI();
    updateListenBtnUI();
  }

  function resumeReading() {
    isPlaying = true;
    isPaused  = false;

    if (synth.paused) {
      synth.resume();
      startKeepAlive();
    } else {
      // Paused state was lost (e.g. page reload); restart current segment
      const idx = currentIdx >= 0 ? currentIdx : 0;
      speakAt(idx);
    }

    setWavePlaying(true);
    updatePlayPauseUI();
    updateListenBtnUI();
  }

  function skipNext() {
    if (!playerOpen) return;
    const next = currentIdx + 1;
    if (next < segments.length) {
      isPlaying = true;
      isPaused  = false;
      speakAt(next);
    }
  }

  function skipPrev() {
    if (!playerOpen) return;
    const prev = Math.max(0, currentIdx - 1);
    isPlaying = true;
    isPaused  = false;
    speakAt(prev);
  }

  function cycleRate() {
    rateIdx = (rateIdx + 1) % RATES.length;
    const label = document.getElementById('tts-rate-label');
    if (label) label.textContent = RATE_LABELS[rateIdx];
    // Restart current segment at new speed
    if (isPlaying) speakAt(currentIdx >= 0 ? currentIdx : 0);
  }

  function finishReading() {
    isPlaying  = false;
    isPaused   = false;
    currentIdx = -1;
    stopKeepAlive();
    clearAllHighlights();
    setWavePlaying(false);
    updatePlayPauseUI();
    updateListenBtnUI();
    updateProgress(segments.length); // 100%

    const preview = document.getElementById('tts-preview');
    const meta    = document.getElementById('tts-meta');
    if (preview) preview.textContent = '✓ Finished';
    if (meta)    meta.textContent    = 'All paragraphs read';
  }

  // ─── Player open / close ────────────────────────────────────
  function openPlayer() {
    playerOpen = true;
    const p = document.getElementById('tts-player');
    if (p) {
      p.classList.add('open');
      p.setAttribute('aria-hidden', 'false');
    }
    setWavePlaying(true);
    updateListenBtnUI();
  }

  function closePlayer() {
    playerOpen = false;
    isPlaying  = false;
    isPaused   = false;
    currentIdx = -1;
    synth.cancel();
    stopKeepAlive();
    clearAllHighlights();
    setWavePlaying(false);
    updatePlayPauseUI();
    updateListenBtnUI();

    const p = document.getElementById('tts-player');
    if (p) {
      p.classList.remove('open');
      p.setAttribute('aria-hidden', 'true');
    }

    // Reset preview text for next open
    const preview = document.getElementById('tts-preview');
    if (preview) preview.textContent = 'Ready to listen…';
    const metaEl = document.getElementById('tts-meta');
    if (metaEl) metaEl.textContent = '–';
    const fill = document.getElementById('tts-progress-fill');
    if (fill) fill.style.width = '0%';
  }

  // ─── Chrome keep-alive ───────────────────────────────────────
  // Chrome stops TTS after ~15 s. This resume-cycle keeps it alive.
  function startKeepAlive() {
    stopKeepAlive();
    keepAliveTimer = setInterval(() => {
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10000);
  }
  function stopKeepAlive() {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }

  // ─── Paragraph highlighting ──────────────────────────────────
  function highlightSegment(idx) {
    clearAllHighlights();
    segments[idx]?.el.classList.add('tts-active');
  }
  function unhighlightSegment(idx) {
    segments[idx]?.el.classList.remove('tts-active');
  }
  function clearAllHighlights() {
    document.querySelectorAll('.tts-active')
      .forEach(el => el.classList.remove('tts-active'));
  }
  function scrollToSegment(idx) {
    segments[idx]?.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ─── UI update helpers ───────────────────────────────────────
  function updatePlayPauseUI() {
    const btn = document.getElementById('tts-playpause');
    if (!btn) return;
    const active = isPlaying && !isPaused;
    btn.querySelector('.tts-icon-play').style.display  = active ? 'none'  : 'block';
    btn.querySelector('.tts-icon-pause').style.display = active ? 'block' : 'none';
    btn.setAttribute('aria-label', active ? 'Pause' : 'Play');
  }

  function updateListenBtnUI() {
    const btn = document.getElementById('listen-btn');
    if (!btn) return;
    const active = playerOpen && isPlaying && !isPaused;

    btn.querySelector('.lb-icon-play').style.display  = active ? 'none'  : 'inline';
    btn.querySelector('.lb-icon-pause').style.display = active ? 'inline' : 'none';
    btn.querySelector('.lb-label').textContent =
      !playerOpen ? 'Listen' : active ? 'Pause' : 'Resume';
    btn.classList.toggle('active', playerOpen);
  }

  function setWavePlaying(on) {
    document.getElementById('tts-waveform')?.classList.toggle('playing', on);
  }

  function updatePlayerText(idx) {
    const seg     = segments[idx];
    const preview = document.getElementById('tts-preview');
    const metaEl  = document.getElementById('tts-meta');
    if (!seg || !preview) return;

    // Truncate for display
    const short = seg.text.length > 90
      ? seg.text.slice(0, 90).trimEnd() + '…'
      : seg.text;
    preview.textContent = short;

    if (metaEl) {
      // Words remaining from this point
      const wordsLeft = segments
        .slice(idx)
        .reduce((n, s) => n + s.text.split(/\s+/).length, 0);
      const minsLeft = Math.max(1, Math.ceil(wordsLeft / (200 * RATES[rateIdx])));
      metaEl.textContent = `${idx + 1} / ${segments.length} · ${minsLeft} min left`;
    }
  }

  function updateProgress(idx) {
    const fill = document.getElementById('tts-progress-fill');
    if (!fill || !segments.length) return;
    const pct = (idx / segments.length) * 100;
    fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
  }

})();