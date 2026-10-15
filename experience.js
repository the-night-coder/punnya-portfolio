(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const intro = document.querySelector('#intro');
  const root = document.documentElement;
  let leaving = false;
  let leaveTimer;

  function finishIntro() {
    if (!intro.open) return;
    clearTimeout(leaveTimer);
    intro.close();
    intro.classList.remove('is-leaving');
    root.classList.remove('intro-active');
    document.body.classList.remove('intro-active');
    leaving = false;
    document.dispatchEvent(new Event('portfolio:entered'));
    document.querySelector('#main').focus({ preventScroll: true });
  }

  function leaveIntro() {
    if (leaving || !intro.open) return;
    leaving = true;
    if (reducedMotion.matches) {
      finishIntro();
      return;
    }
    intro.classList.add('is-leaving');
    // A time limit also releases the dialog if motion preferences change mid-exit.
    leaveTimer = setTimeout(finishIntro, 1000);
  }

  function openIntro() {
    if (typeof intro.showModal !== 'function' || intro.open) return;
    leaving = false;
    intro.classList.remove('is-leaving');
    root.classList.add('intro-active');
    document.body.classList.add('intro-active');
    window.scrollTo(0, 0);
    try {
      intro.showModal();
    } catch {
      root.classList.remove('intro-active');
      document.body.classList.remove('intro-active');
    }
  }

  intro.querySelector('.intro-enter').addEventListener('click', leaveIntro);
  intro.querySelector('.intro-skip').addEventListener('click', leaveIntro);
  intro.addEventListener('cancel', event => {
    event.preventDefault();
    leaveIntro();
  });
  intro.addEventListener('animationend', event => {
    if (event.target === intro && event.animationName === 'intro-curtain') finishIntro();
  });
  document.querySelectorAll('.intro-replay').forEach(button => button.addEventListener('click', openIntro));
  if (!location.hash || new URLSearchParams(location.search).get('intro') === '1') openIntro();

  const roadmap = document.querySelector('#roadmap');
  const route = roadmap.querySelector('.roadmap-list');
  const rail = route.querySelector('.roadmap-rail');
  const nodes = [...route.querySelectorAll('.roadmap-node')];
  let roadInView = false;
  let roadFrame = 0;

  function updateRoadmap() {
    roadFrame = 0;
    if (!roadInView && !reducedMotion.matches) return;
    const bounds = route.getBoundingClientRect();
    const first = nodes[0].getBoundingClientRect();
    const last = nodes.at(-1).getBoundingClientRect();
    const start = first.top + first.height / 2;
    const end = last.top + last.height / 2;
    rail.style.top = `${start - bounds.top}px`;
    rail.style.height = `${Math.max(0, end - start)}px`;
    rail.style.bottom = 'auto';
    const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (innerHeight * .72 - start) / Math.max(1, end - start)));
    route.style.setProperty('--road-progress', progress.toFixed(4));
  }
  function requestRoadUpdate() {
    if (!roadFrame) roadFrame = requestAnimationFrame(updateRoadmap);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      roadInView = entries[0].isIntersecting;
      if (roadInView) requestRoadUpdate();
    }, { rootMargin: '100px 0px' });
    observer.observe(roadmap);
  } else {
    roadInView = true;
    route.style.setProperty('--road-progress', '1');
  }
  window.addEventListener('scroll', () => {
    if (roadInView) requestRoadUpdate();
  }, { passive: true });
  window.addEventListener('resize', requestRoadUpdate);
  document.addEventListener('portfolio:entered', requestRoadUpdate);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && leaving) finishIntro();
    requestRoadUpdate();
  });

  const art = document.querySelector('.hero-art');
  const card = art.querySelector('.portrait-card');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let tiltFrame = 0;
  let tiltX = 0;
  let tiltY = 0;
  function paintTilt() {
    tiltFrame = 0;
    card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
  }
  art.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
    const box = art.getBoundingClientRect();
    tiltX = ((event.clientX - box.left) / box.width - .5) * 8;
    tiltY = -((event.clientY - box.top) / box.height - .5) * 6;
    if (!tiltFrame) tiltFrame = requestAnimationFrame(paintTilt);
  });
  function resetTilt() {
    tiltX = 0;
    tiltY = 0;
    if (!tiltFrame) tiltFrame = requestAnimationFrame(paintTilt);
  }
  art.addEventListener('pointerleave', resetTilt);
  reducedMotion.addEventListener('change', resetTilt);

  // Keep roadmap edits in the same profile file as the rest of the portfolio.
  fetch('info.json').then(response => {
    if (!response.ok) throw new Error('Profile unavailable');
    return response.json();
  }).then(profile => {
    if (!Array.isArray(profile.roadmap)) return;
    document.querySelectorAll('[data-roadmap-id]').forEach(item => {
      const entry = profile.roadmap.find(chapter => chapter.id === item.dataset.roadmapId);
      if (!entry) return;
      if (typeof entry.date === 'string') item.querySelector('.roadmap-date').firstChild.textContent = `${entry.date.toUpperCase()} `;
      if (typeof entry.summary === 'string') item.querySelector('.roadmap-summary').textContent = entry.summary;
      if (typeof entry.org === 'string' && item.querySelector('.roadmap-org')) {
        item.querySelector('.roadmap-org').textContent = entry.type === 'experience' ? `${entry.title} · ${entry.org}` : entry.org;
      }
    });
    requestRoadUpdate();
  }).catch(() => { /* The complete roadmap is available without a data request. */ });
})();
