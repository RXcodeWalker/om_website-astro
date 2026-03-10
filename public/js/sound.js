// =========================================================
//  SOUND MANAGER  —  sound.js
//
//  UI sounds: click, toggle, page_turn, whoosh, hover, chime
//  Ambient:   looping lo-fi / stadium audio
//             • Fades IN  over ~2s when activated
//             • Fades OUT over ~1.5s when deactivated
//             • Volume knob can be adjusted (default 0.18)
//             • State persists in localStorage across pages
//             • Autoplay policy: ambient only starts after the
//               user has interacted at least once — the button
//               remembers intent and starts on first click/move
//
//  Global API:
//    playSound('click')       — play a named UI sound
//    BTB.ambient.toggle()     — flip ambient on/off
//    BTB.ambient.isPlaying()  — boolean
//    BTB.ambient.setVolume(n) — 0–1
// =========================================================

// =========================================================
//  SOUND MANAGER  —  sound.js
// =========================================================

window.BTB = window.BTB || {};

// ── 1. UI Sounds ─────────────────────────────────────────
const sounds = {
  click:     new Audio('/sounds/click.mp3'),
  toggle:    new Audio('/sounds/toggle.mp3'),
  page_turn: new Audio('/sounds/page_turn.mp3'),
  whoosh:    new Audio('/sounds/whooshmp3.mp3'),
  hover:     new Audio('/sounds/hover.mp3'),
  chime:     new Audio('/sounds/chime.mp3'),
};

Object.values(sounds).forEach(s => { s.volume = 0.3; });

window.playSound = function (name) {
  if (sounds[name]) {
    sounds[name].currentTime = 0;
    sounds[name].play().catch(() => {});
  }
};

// ── 2. Ambient Playlist System ───────────────────────────
(function () {

  const STORAGE_KEY   = 'btb_ambient';
  const TARGET_VOLUME = 0.18;
  const FADE_IN_RATE  = 0.003;
  const FADE_OUT_RATE = 0.004;

  // 🎵 Playlist (update filenames if needed)
  const tracks = [
    '/audio/lofi1.mp3',
    '/audio/lofi2.mp3',
    '/audio/lofi3.mp3',
    '/audio/lofi4.mp3',
    '/audio/lofi5.mp3'
  ];

  let currentTrack = Math.floor(Math.random() * tracks.length);

  const audio   = new Audio();
  audio.loop    = false;
  audio.volume  = 0;
  audio.preload = 'none';

  let _active        = false;
  let _playing       = false;
  let _fadingIn      = false;
  let _fadingOut     = false;
  let _hasInteracted = false;
  let _pendingStart  = false;

  // Restore saved state
  if (localStorage.getItem(STORAGE_KEY) === 'on') {
    _active = true;
    _pendingStart = true;
  }

  function loadTrack(index) {
    audio.src = tracks[index];
  }

  function nextTrack() {
    currentTrack = (currentTrack + 1) % tracks.length;
    loadTrack(currentTrack);
    audio.play().catch(() => {});
  }

  audio.addEventListener('ended', nextTrack);

  // ── Fade In ────────────────────────────────────────────
  function fadeIn() {
    _fadingOut = false;
    _fadingIn  = true;

    function tick() {
      if (!_fadingIn) return;
      audio.volume = Math.min(audio.volume + FADE_IN_RATE, TARGET_VOLUME);
      if (audio.volume < TARGET_VOLUME) {
        requestAnimationFrame(tick);
      } else {
        _fadingIn = false;
      }
    }
    requestAnimationFrame(tick);
  }

  // ── Fade Out ───────────────────────────────────────────
  function fadeOut() {
    _fadingIn  = false;
    _fadingOut = true;

    function tick() {
      if (!_fadingOut) return;
      audio.volume = Math.max(audio.volume - FADE_OUT_RATE, 0);
      if (audio.volume > 0) {
        requestAnimationFrame(tick);
      } else {
        _fadingOut = false;
        audio.pause();
        audio.currentTime = 0;
        _playing = false;
      }
    }
    requestAnimationFrame(tick);
  }

  // ── Start Ambient ──────────────────────────────────────
  function startAmbient() {
    if (_playing) { fadeIn(); return; }

    loadTrack(currentTrack);
    audio.volume = 0;

    audio.play()
      .then(() => { _playing = true; fadeIn(); })
      .catch(() => {
        _pendingStart = true;
      });
  }

  function stopAmbient() {
    _pendingStart = false;
    if (!_playing && audio.volume === 0) return;
    fadeOut();
  }

  // ── Autoplay Guard ─────────────────────────────────────
  function onFirstInteraction() {
    _hasInteracted = true;
    document.removeEventListener('click', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
    document.removeEventListener('touchstart', onFirstInteraction);

    if (_pendingStart && _active) {
      _pendingStart = false;
      startAmbient();
    }
  }

  document.addEventListener('click', onFirstInteraction, { once: true });
  document.addEventListener('keydown', onFirstInteraction, { once: true });
  document.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });

  // ── Toggle ─────────────────────────────────────────────
  function toggle() {
    _active = !_active;
    localStorage.setItem(STORAGE_KEY, _active ? 'on' : 'off');

    if (_active) {
      if (_hasInteracted) startAmbient();
      else _pendingStart = true;
    } else {
      stopAmbient();
    }

    document.querySelectorAll('#ambient-toggle').forEach(btn => {
      btn.classList.toggle('active', _active);
      btn.setAttribute('aria-pressed', String(_active));
      btn.setAttribute('aria-label', _active ? 'Ambient sound: on' : 'Ambient sound: off');
    });

    playSound('toggle');
    return _active;
  }

  function isPlaying() { return _active; }

  function setVolume(v) {
    const clamped = Math.max(0, Math.min(1, v));
    audio.volume = clamped;
  }

  BTB.ambient = { toggle, isPlaying, setVolume };

  // ── Button Wiring ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('ambient-toggle');
    if (!btn) return;

    btn.classList.toggle('active', _active);
    btn.setAttribute('aria-pressed', String(_active));
    btn.setAttribute('aria-label', _active ? 'Ambient sound: on' : 'Ambient sound: off');

    btn.addEventListener('click', () => BTB.ambient.toggle());
  });

})();