(() => {
  const menu = document.querySelector('.menu-trigger');
  const mobileLinks = document.getElementById('mobile-links');
  menu.hidden = false;
  function setMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileLinks.hidden = !open;
  }
  menu.addEventListener('click', () => setMenu(mobileLinks.hidden));
  mobileLinks.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileLinks.hidden) { setMenu(false); menu.focus(); }
  });
  matchMedia('(min-width:961px)').addEventListener('change', () => setMenu(false));

  const watch = document.querySelector('.watch-video');
  const hero = document.querySelector('.opening');
  const tools = document.querySelector('.watch-tools');
  const play = document.querySelector('.watch-play');
  const scrub = document.getElementById('watch-scrub');
  const stamp = document.querySelector('.watch-time');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const format = time => '0:' + String(Math.floor(time)).padStart(2, '0');
  let manual = false;
  let inView = true;
  let pending = false;
  function showFrame() {
    if (!Number.isFinite(watch.duration) || watch.duration <= 0) return;
    scrub.value = Math.round(watch.currentTime / watch.duration * 100);
    scrub.setAttribute('aria-valuetext', watch.currentTime.toFixed(1) + ' seconds');
    stamp.textContent = format(watch.currentTime) + ' / ' + format(Math.round(watch.duration));
  }
  function followScroll() {
    pending = false;
    if (!inView || manual || motion.matches || !watch.paused || !Number.isFinite(watch.duration)) return;
    const position = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / Math.max(1,hero.offsetHeight * .76)));
    const target = position * Math.max(0,watch.duration - .06);
    if (Math.abs(watch.currentTime - target) > .055) watch.currentTime = target;
  }
  window.addEventListener('scroll', () => {
    if (!pending && inView && !manual && !motion.matches) { pending = true; requestAnimationFrame(followScroll); }
  }, {passive:true});
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([item]) => {
      inView = item.isIntersecting;
      if (!inView) watch.pause();
      else followScroll();
    }).observe(hero);
  }
  function reflectPlayback() {
    const playing = !watch.paused && !watch.ended;
    play.classList.toggle('playing',playing);
    play.setAttribute('aria-label',playing ? 'Pause timepiece film' : 'Play timepiece film');
  }
  watch.addEventListener('loadedmetadata', () => { tools.hidden = false; showFrame(); followScroll(); });
  watch.addEventListener('loadeddata', () => { watch.classList.add('ready'); });
  watch.addEventListener('error', () => { tools.hidden=true; watch.classList.remove('ready'); });
  watch.addEventListener('timeupdate',showFrame);
  for (const event of ['play','pause','ended']) watch.addEventListener(event, reflectPlayback);
  play.addEventListener('click', () => {
    manual = true;
    if (!watch.paused) { watch.pause(); return; }
    if (watch.ended || watch.currentTime >= watch.duration - .1) watch.currentTime=0;
    watch.play().catch(reflectPlayback);
  });
  scrub.addEventListener('input', () => {
    manual = true; watch.pause();
    watch.currentTime = Math.min(watch.duration - .03, +scrub.value / 100 * watch.duration);
    showFrame();
  });
  motion.addEventListener('change', () => { if (motion.matches) watch.pause(); });
  watch.preload='auto'; watch.src=watch.dataset.src;
})();
