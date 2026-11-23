/* Industries. Scroll turns the half clock one hour per business, then slides the image
   cards left. A card opens its timecard in a dialog. With reduced motion the clock is
   left out and the cards scroll sideways on their own. */
(() => {
  'use strict';
  const section = document.querySelector('.ind');
  if (!section) return;
  const cards = Array.from(section.querySelectorAll('.ind-card'));
  if (!cards.length) return;
  const N = cards.length;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const info = cards.map((card, i) => ({
    card, i,
    sector: card.querySelector('.ind-card-sector').lastChild.textContent.trim(),
    title: card.querySelector('h3').textContent,
    back: card.querySelector('.ind-card-back').textContent,
    image: card.querySelector('img').getAttribute('src')
  }));

  /* ----- timecard dialog ----- */
  const dialog = section.querySelector('.tc-dialog');
  const slot = dialog.querySelector('.tc-slot');
  const cta = dialog.querySelector('.tc-cta');
  let opener = null;
  const open = d => {
    opener = d.card.querySelector('.ind-open');
    slot.innerHTML = d.card.querySelector('.tc-body').innerHTML;
    dialog.querySelector('#tc-dialog-title').textContent = d.title;
    dialog.querySelector('.tc-no').textContent = `No. ${String(d.i + 1).padStart(2, '0')} · ${d.sector}`;
    cta.textContent = `Request a visit for ${d.sector.toLowerCase() === 'hvac' ? 'HVAC' : d.sector.toLowerCase()}`;
    cta.dataset.source = `Timecard: ${d.sector}`;
    cta.dataset.form = d.card.dataset.form || '';
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    dialog.querySelector('.tc-card').scrollTop = 0;
  };
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.addEventListener('close', () => { if (opener) opener.focus({ preventScroll: true }); });
  dialog.querySelector('.tc-close').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  cta.addEventListener('click', () => {
    const select = document.querySelector('#lead-form [name="industry"]');
    if (select && cta.dataset.form) select.value = cta.dataset.form;
    opener = null;
    close();
  });
  info.forEach(d => {
    const button = d.card.querySelector('.ind-open');
    button.hidden = false;
    button.addEventListener('click', event => { event.stopPropagation(); open(d); });
    d.card.addEventListener('click', () => open(d));
  });
  section.setAttribute('data-js', '');

  /* ----- the half clock ----- */
  const dial = section.querySelector('.ind-dial');
  const dialStage = section.querySelector('.ind-dial-stage');
  const wheel = section.querySelector('.ind-wheel');
  const face = section.querySelector('.ind-face');
  const orbit = section.querySelector('.ind-orbit');
  const readout = section.querySelector('.ind-readout');
  const svg = (name, attrs) => { const el = document.createElementNS('http://www.w3.org/2000/svg', name); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); return el; };
  face.appendChild(svg('circle', { r: 99.5 }));
  for (let n = 0; n < 60; n++) {
    const hour = n % 5 === 0;
    const line = svg('line', { x1: 0, y1: hour ? -90 : -94, x2: 0, y2: -98, transform: `rotate(${n * 6})` });
    if (hour) line.setAttribute('class', 'hour');
    face.appendChild(line);
  }
  for (let h = 0; h < 12; h++) {
    const text = svg('text', { transform: `rotate(${h * 30}) translate(0,-80)` });
    text.textContent = String(h === 0 ? 12 : h);
    face.appendChild(text);
  }
  // twelve places on the dial; the eight businesses repeat to fill the ring
  const chips = [];
  for (let slotIndex = 0; slotIndex < 12; slotIndex++) {
    const d = info[slotIndex % N];
    const chip = document.createElement('div');
    chip.className = 'ind-chip';
    chip.style.setProperty('--a', `${slotIndex * 30}deg`);
    const img = document.createElement('img');
    img.src = d.image; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    const label = document.createElement('span');
    label.textContent = d.sector;
    chip.append(img, label);
    orbit.appendChild(chip);
    chips.push(chip);
  }
  let shown = -1, swapTimer = 0;
  const fill = i => {
    const d = info[i];
    readout.querySelector('.ind-readout-count').textContent = `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    readout.querySelector('.ind-readout-name').textContent = d.sector;
    readout.querySelector('.ind-readout-back').textContent = d.back;
  };
  const show = i => {
    if (i === shown) return;
    const first = shown < 0;
    shown = i;
    chips.forEach((chip, n) => chip.classList.toggle('is-active', n === i));
    clearTimeout(swapTimer);
    if (first) { fill(i); return; }
    readout.setAttribute('data-swap', '');
    swapTimer = setTimeout(() => { fill(i); readout.removeAttribute('data-swap'); }, 200);
  };
  const sizeDial = () => {
    const W = dialStage.clientWidth, H = dialStage.clientHeight;
    const cw = clamp(W * 0.13, 108, 196), ch = cw * 1.28, gap = clamp(W * 0.02, 18, 34);
    const head = section.querySelector('.ind-dial-head');
    const room = H - (head.offsetTop + head.offsetHeight) - ch - gap - 16;
    const r = Math.max(120, Math.min(W < 720 ? W * 0.78 : W * 0.4, room));
    dialStage.style.setProperty('--r', `${r.toFixed(1)}px`);
    dialStage.style.setProperty('--cw', `${cw.toFixed(1)}px`);
    dialStage.style.setProperty('--ch', `${ch.toFixed(1)}px`);
    dialStage.style.setProperty('--gap', `${gap.toFixed(1)}px`);
  };

  /* ----- sliding cards ----- */
  const slider = section.querySelector('.ind-slider');
  const sliderStage = section.querySelector('.ind-slider-stage');
  const viewport = section.querySelector('.ind-viewport');
  const track = section.querySelector('.ind-track');
  const foot = section.querySelector('.ind-foot');
  const count = section.querySelector('.ind-foot-count');
  const bar = section.querySelector('.ind-bar');

  const progress = (outer, stage) => {
    const range = outer.offsetHeight - stage.offsetHeight;
    if (range <= 0) return 0;
    return clamp((stage.getBoundingClientRect().top - outer.getBoundingClientRect().top) / range);
  };
  let mode = '', frame = 0;
  const now = { dial: 0, slide: 0 }, goal = { dial: 0, slide: 0 };
  const render = () => {
    const turn = now.dial * (N - 1);
    wheel.style.transform = `rotate(${(-turn * 30).toFixed(3)}deg)`;
    show(Math.round(turn));
    const travel = Math.max(0, track.scrollWidth - viewport.clientWidth);
    track.style.transform = `translate3d(${(-now.slide * travel).toFixed(1)}px,0,0)`;
    const at = Math.round(now.slide * (N - 1));
    count.textContent = `${String(at + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    bar.style.setProperty('--fill', now.slide.toFixed(4));
  };
  const tick = () => {
    frame = 0;
    if (mode !== 'scroll') return;
    let moving = false;
    for (const key of ['dial', 'slide']) {
      const gap = goal[key] - now[key];
      if (Math.abs(gap) < 0.0006) now[key] = goal[key]; else { now[key] += gap * 0.14; moving = true; }
    }
    render();
    if (moving) frame = requestAnimationFrame(tick);
  };
  const onScroll = () => {
    if (mode !== 'scroll') return;
    goal.dial = progress(dial, dialStage);
    goal.slide = progress(slider, sliderStage);
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const apply = () => {
    mode = reduced.matches ? 'still' : 'scroll';
    section.dataset.mode = mode;
    foot.hidden = mode !== 'scroll';
    if (mode === 'scroll') {
      sizeDial();
      now.dial = goal.dial = progress(dial, dialStage);
      now.slide = goal.slide = progress(slider, sliderStage);
      render();
    } else {
      track.style.transform = '';
    }
  };
  // a card focused by keyboard is brought into view by scrolling the page to its place
  cards.forEach((card, i) => card.querySelector('.ind-open').addEventListener('focus', event => {
    if (mode !== 'scroll' || !event.target.matches(':focus-visible')) return;
    const range = slider.offsetHeight - sliderStage.offsetHeight;
    const top = slider.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(sliderStage).top) || 0);
    window.scrollTo({ top: top + range * (i / (N - 1)), behavior: 'auto' });
    viewport.scrollLeft = 0;
  }));
  viewport.addEventListener('scroll', () => { if (mode === 'scroll' && viewport.scrollLeft) viewport.scrollLeft = 0; });

  apply();
  reduced.addEventListener('change', apply);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { if (mode === 'scroll') { sizeDial(); onScroll(); render(); } }, { passive: true });
})();
