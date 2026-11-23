/* "The same day, twice". Scroll position drives everything: which scene has dropped
   travelled into view, the frame of its clip, the desk clock, and the typed overlays.
   With reduced motion, or when the reader chooses, the scenes become a list of stills. */
(() => {
  'use strict';
  const section = document.querySelector('.cp-film');
  if (!section) return;
  const track = section.querySelector('.day-track');
  const stage = section.querySelector('.day-stage');
  const scenes = Array.from(section.querySelectorAll('.day-scene'));
  if (!track || !stage || !scenes.length) return;

  const hud = section.querySelector('.day-hud');
  const rail = section.querySelector('.day-rail');
  const count = section.querySelector('[data-film-count]');
  const clockRead = section.querySelector('[data-film-clock]');
  const hourHand = section.querySelector('.day-clock-hour');
  const minHand = section.querySelector('.day-clock-min');
  const toggles = Array.from(section.querySelectorAll('[data-film-toggle]'));
  const introLinks = section.querySelector('.cp-film-intro-links');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const N = scenes.length;
  const DROP = 0.34;         // share of a scene's scroll spent travelling into place
  const GAP = 7;             // extra travel, in percent of the stage, that opens between scenes
  const turnIndex = scenes.findIndex(s => s.hasAttribute('data-turn'));

  const minutes = text => { const [h, m] = text.split(':').map(Number); return h * 60 + m; };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t * t * (3 - 2 * t);

  const data = scenes.map((el, i) => {
    el.style.setProperty('--focus', el.dataset.focus || '50%');
    el.style.zIndex = String(i + 1);
    const text = el.querySelector('.day-agent-text');
    return {
      el, i,
      video: el.querySelector('video'),
      from: minutes(el.dataset.from), to: minutes(el.dataset.to),
      fx: el.dataset.fx || '',
      typed: text, full: text ? text.dataset.text : '',
      duration: 0, loaded: false, last: -1
    };
  });

  // clock face
  const ticks = section.querySelector('.day-clock-ticks');
  if (ticks) for (let n = 0; n < 12; n++) {
    const a = n * Math.PI / 6, r1 = n % 3 ? 40 : 37, r2 = 43;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 50 + Math.sin(a) * r1); line.setAttribute('y1', 50 - Math.cos(a) * r1);
    line.setAttribute('x2', 50 + Math.sin(a) * r2); line.setAttribute('y2', 50 - Math.cos(a) * r2);
    ticks.appendChild(line);
  }
  const showClock = total => {
    const m = ((Math.round(total) % 1440) + 1440) % 1440;
    const h24 = Math.floor(m / 60), mm = m % 60;
    if (clockRead) clockRead.textContent = `${h24 % 12 || 12}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
    if (hourHand) hourHand.style.transform = `rotate(${total / 720 * 360}deg)`;
    if (minHand) minHand.style.transform = `rotate(${total / 60 * 360}deg)`;
  };

  const load = d => {
    if (d.loaded || !d.video) return;
    d.loaded = true;
    const v = d.video;
    v.addEventListener('loadedmetadata', () => { d.duration = v.duration || 0; });
    v.addEventListener('loadeddata', () => { d.el.setAttribute('data-video-ready', ''); d.last = -1; target = -1; requestTick(); });
    v.addEventListener('error', () => { d.el.removeAttribute('data-video-ready'); });
    v.preload = 'auto';
    v.src = `assets/day/${d.el.dataset.clip}.mp4`;
    v.load();
  };
  const seek = (d, p) => {
    if (!d.duration) return;
    const t = clamp(p) * Math.max(0, d.duration - 0.06);
    if (Math.abs(t - d.last) < 1 / 50) return;
    d.last = t;
    try { d.video.currentTime = t; } catch (_) { /* not seekable yet */ }
  };

  const effects = (d, p) => {
    const el = d.el;
    if (d.fx === 'letter') {
      el.style.setProperty('--fx', ease(clamp((p - 0.22) / 0.3)).toFixed(3));
    } else if (d.fx === 'request') {
      el.style.setProperty('--fx', ease(clamp((p - 0.6) / 0.12)).toFixed(3));
    } else if (d.fx === 'agent') {
      el.style.setProperty('--fx', ease(clamp((p - 0.08) / 0.16)).toFixed(3));
      const shown = Math.round(clamp((p - 0.2) / 0.42) * d.full.length);
      if (d.typed && d.typed.textContent.length !== shown) d.typed.textContent = d.full.slice(0, shown);
      el.style.setProperty('--file', ease(clamp((p - 0.62) / 0.08)).toFixed(3));
      el.toggleAttribute('data-pressing', p > 0.8 && p < 0.85);
      el.toggleAttribute('data-clicked', p >= 0.84);
    }
  };

  let mode = 'stills', current = 0, target = 0, frame = 0, active = -1;

  const measure = () => {
    const range = track.offsetHeight - stage.offsetHeight;
    if (range <= 0) return 0;
    const scrolled = stage.getBoundingClientRect().top - track.getBoundingClientRect().top;
    return clamp(scrolled / range) * N;
  };

  const render = u => {
    const pos = clamp(u, 0, N - 0.0001);
    const i = Math.floor(pos);
    const p = pos - i;
    const drop = i === 0 ? 1 : clamp(p / DROP);
    const play = clamp((p - (i === 0 ? 0 : DROP * 0.5)) / (0.97 - (i === 0 ? 0 : DROP * 0.5)));
    // mid-move both frames shrink into cards, so a gap opens between them
    const lift = Math.sin(Math.PI * drop);
    const scale = (1 - 0.085 * lift).toFixed(4);
    const travel = 100 + GAP * lift;

    data.forEach(d => {
      const on = d.i === i || (d.i === i - 1 && drop < 1);
      d.el.toggleAttribute('data-on', on);
      if (!on) return;
      const moving = drop < 1;
      d.el.style.setProperty('--r', moving ? `${(26 * lift).toFixed(1)}px` : '0px');
      d.el.style.setProperty('--ring', moving ? (0.5 * lift).toFixed(3) : '0');
      if (d.i === i) {
        d.el.style.transform = moving ? `translate3d(0,${((1 - drop) * travel).toFixed(3)}%,0) scale(${scale})` : '';
        d.el.style.setProperty('--cap', ease(clamp((p - (i === 0 ? -1 : DROP * 0.75)) / 0.14)).toFixed(3));
        seek(d, play);
        effects(d, play);
      } else {
        d.el.style.transform = `translate3d(0,${(-drop * travel).toFixed(3)}%,0) scale(${scale})`;
        seek(d, 1);
      }
    });
    [i - 1, i, i + 1, i + 2].forEach(n => { if (data[n]) load(data[n]); });

    // the clock runs with the clip, and spins between scenes while the next one drops
    const d = data[i], prev = data[i - 1];
    const time = (prev && drop < 1) ? prev.to + (d.from - prev.to) * drop : d.from + (d.to - d.from) * ease(play);
    showClock(time);
    stage.dataset.day = turnIndex >= 0 && (i > turnIndex || (i === turnIndex && play > 0.9)) ? '2' : '1';
    stage.toggleAttribute('data-rewind', i === turnIndex);
    if (rail) rail.style.setProperty('--fill', (pos / N).toFixed(4));
    if (i !== active) {
      active = i;
      if (count) count.textContent = `${String(i + 1).padStart(2, '0')} of ${String(N).padStart(2, '0')}`;
    }
  };

  const tick = () => {
    frame = 0;
    if (mode !== 'scroll') return;
    if (target < 0) target = measure();
    const gap = target - current;
    current = Math.abs(gap) < 0.0015 ? target : current + gap * 0.16;
    render(current);
    if (current !== target) requestTick();
  };
  function requestTick() { if (!frame) frame = requestAnimationFrame(tick); }
  const onScroll = () => { target = measure(); requestTick(); };

  const applyMode = next => {
    mode = next;
    section.dataset.mode = mode;
    const scroll = mode === 'scroll';
    if (hud) hud.hidden = !scroll;
    if (rail) rail.hidden = !scroll;
    toggles.forEach(b => { b.textContent = scroll ? 'Read as stills' : 'Play as scroll film'; });
    track.style.setProperty('--day-count', String(N));
    if (scroll) {
      current = target = measure();
      active = -1;
      render(current);
    } else {
      data.forEach(d => {
        d.el.style.transform = '';
        d.el.removeAttribute('data-on');
        if (d.typed) d.typed.textContent = d.full;
      });
    }
  };

  toggles.forEach(b => b.addEventListener('click', () => {
    const next = mode === 'scroll' ? 'stills' : 'scroll';
    try { localStorage.setItem('cp-film-mode', next); } catch (_) { /* private mode */ }
    const top = section.querySelector('.day-track').getBoundingClientRect().top + window.scrollY;
    applyMode(next);
    window.scrollTo({ top: top - (parseFloat(getComputedStyle(section).scrollMarginTop) || 0), behavior: 'auto' });
  }));

  let saved = null;
  try { saved = localStorage.getItem('cp-film-mode'); } catch (_) { /* private mode */ }
  if (introLinks) introLinks.hidden = false;
  applyMode(saved === 'stills' || saved === 'scroll' ? saved : (reduced.matches ? 'stills' : 'scroll'));
  reduced.addEventListener('change', () => { if (!saved) applyMode(reduced.matches ? 'stills' : 'scroll'); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
})();
