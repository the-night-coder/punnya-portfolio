(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const intro = document.querySelector('#intro');
  const root = document.documentElement;
  const introStage = intro.querySelector('.intro-stage');
  const introTitle = intro.querySelector('.intro-title');
  const letters = [...intro.querySelectorAll('.intro-letter')];
  const glyphs = letters.map(letter => {
    const glyph = document.createElement('span');
    glyph.className = 'intro-glyph';
    glyph.textContent = letter.textContent;
    letter.replaceChildren(glyph);
    return glyph;
  });
  let nameBounds;
  let letterCenters = [];
  let playFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let entryProgress = 0;
  let progressTimer;
  let touchOrigin = null;
  let leaving = false;
  let leaveTimer;

  function cacheNameBounds() {
    if (!intro.open) return;
    nameBounds = introTitle.getBoundingClientRect();
    letterCenters = letters.map(letter => {
      const bounds = letter.getBoundingClientRect();
      return bounds.left + bounds.width / 2;
    });
  }
  function resetIntroPlay() {
    if (playFrame) cancelAnimationFrame(playFrame);
    playFrame = 0;
    glyphs.forEach(glyph => {
      glyph.style.removeProperty('--glyph-y');
      glyph.style.removeProperty('--glyph-r');
      glyph.style.removeProperty('--glyph-s');
      glyph.style.removeProperty('color');
    });
    intro.style.removeProperty('--bloom-turn');
    intro.style.removeProperty('--drift-x');
    intro.style.removeProperty('--drift-y');
  }
  function paintIntroPlay() {
    playFrame = 0;
    if (!nameBounds || !intro.open || leaving || reducedMotion.matches) return;
    const nearName = Math.abs(pointerY - (nameBounds.top + nameBounds.height / 2)) < nameBounds.height * .8;
    const reach = Math.max(65, nameBounds.width / 5);
    const lift = Math.min(22, nameBounds.height * .13);
    glyphs.forEach((glyph, index) => {
      const distance = pointerX - letterCenters[index];
      const strength = nearName ? Math.exp(-Math.pow(distance / reach, 2) * 2) : 0;
      glyph.style.setProperty('--glyph-y', `${(-strength * lift).toFixed(2)}px`);
      glyph.style.setProperty('--glyph-r', `${(Math.max(-5, Math.min(5, distance * .04)) * strength).toFixed(2)}deg`);
      glyph.style.setProperty('--glyph-s', (1 + strength * .055).toFixed(3));
      glyph.style.color = strength > .4 ? 'var(--lime)' : '';
    });
    const x = Math.max(-.5, Math.min(.5, pointerX / innerWidth - .5));
    const y = Math.max(-.5, Math.min(.5, pointerY / innerHeight - .5));
    intro.style.setProperty('--bloom-turn', `${(x * 22).toFixed(2)}deg`);
    intro.style.setProperty('--drift-x', `${(x * 20).toFixed(2)}px`);
    intro.style.setProperty('--drift-y', `${(y * 16).toFixed(2)}px`);
  }
  function reactToPointer(event) {
    if (!intro.open || leaving || reducedMotion.matches) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!playFrame) playFrame = requestAnimationFrame(paintIntroPlay);
  }
  introStage.addEventListener('pointermove', reactToPointer);
  introStage.addEventListener('pointerdown', reactToPointer);
  introStage.addEventListener('pointerleave', resetIntroPlay);
  introStage.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch') resetIntroPlay();
  });
  introStage.addEventListener('pointercancel', resetIntroPlay);
  window.addEventListener('resize', cacheNameBounds);
  if (document.fonts) document.fonts.ready.then(cacheNameBounds);

  function setEntryProgress(value) {
    entryProgress = Math.max(0, Math.min(1, value));
    intro.style.setProperty('--enter-progress', entryProgress.toFixed(4));
  }
  function entryDistance() {
    return Math.min(130, Math.max(75, innerHeight * .12));
  }
  function settleEntryProgress() {
    clearTimeout(progressTimer);
    progressTimer = setTimeout(() => {
      if (!leaving) setEntryProgress(0);
    }, 550);
  }
  intro.addEventListener('wheel', event => {
    if (!intro.open || event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    if (event.cancelable) event.preventDefault();
    if (leaving) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    setEntryProgress(entryProgress + event.deltaY * unit / entryDistance());
    if (entryProgress >= 1) leaveIntro();
    else settleEntryProgress();
  }, { passive: false });
  intro.addEventListener('touchstart', event => {
    clearTimeout(progressTimer);
    if (event.touches.length !== 1 || event.target.closest('button,a')) {
      touchOrigin = null;
      return;
    }
    touchOrigin = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    setEntryProgress(0);
  }, { passive: true });
  intro.addEventListener('touchmove', event => {
    if (!intro.open || leaving || !touchOrigin || event.touches.length !== 1) return;
    const dy = touchOrigin.y - event.touches[0].clientY;
    const dx = Math.abs(touchOrigin.x - event.touches[0].clientX);
    if (dy <= 8 || dy < dx * 1.15) return;
    if (event.cancelable) event.preventDefault();
    setEntryProgress(dy / entryDistance());
    if (entryProgress >= 1) leaveIntro();
  }, { passive: false });
  function endTouch() {
    touchOrigin = null;
    if (!leaving) setEntryProgress(0);
  }
  intro.addEventListener('touchend', endTouch, { passive: true });
  intro.addEventListener('touchcancel', endTouch, { passive: true });
  intro.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || !intro.open || leaving) return;
    if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault();
      leaveIntro();
    }
  });

  function finishIntro() {
    if (!intro.open) return;
    clearTimeout(leaveTimer);
    clearTimeout(progressTimer);
    intro.close();
    intro.classList.remove('is-leaving');
    root.classList.remove('intro-active');
    document.body.classList.remove('intro-active');
    leaving = false;
    touchOrigin = null;
    resetIntroPlay();
    setEntryProgress(0);
    document.dispatchEvent(new Event('portfolio:entered'));
    document.querySelector('#main').focus({ preventScroll: true });
  }

  function leaveIntro() {
    if (leaving || !intro.open) return;
    leaving = true;
    clearTimeout(progressTimer);
    setEntryProgress(1);
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
    clearTimeout(progressTimer);
    touchOrigin = null;
    setEntryProgress(0);
    resetIntroPlay();
    intro.classList.remove('is-leaving');
    root.classList.add('intro-active');
    document.body.classList.add('intro-active');
    window.scrollTo(0, 0);
    try {
      intro.showModal();
      requestAnimationFrame(cacheNameBounds);
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
    if (event.target === letters.at(-1) && event.animationName === 'intro-letter-in') cacheNameBounds();
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
    resetIntroPlay();
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

  const perspectiveCopy = {
    hr: 'The HR lens: supporting onboarding, employee records, and clear internal communication.',
    marketing: 'The Marketing lens: listening to customers, gathering feedback, and supporting sales conversations.'
  };
  const perspectiveDetail = document.querySelector('#perspective-detail');
  const perspectiveButtons = [...document.querySelectorAll('[data-perspective]')];
  const perspectiveLink = document.querySelector('.perspective-skill-link');
  perspectiveButtons.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.perspective;
    if (!perspectiveCopy[selected]) return;
    perspectiveButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    perspectiveDetail.textContent = perspectiveCopy[selected];
    perspectiveLink.dataset.targetTab = `tab-${selected}`;
    if (!reducedMotion.matches && typeof perspectiveDetail.animate === 'function') {
      perspectiveDetail.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:300,easing:'ease-out'});
    }
  }));
  perspectiveLink.addEventListener('click', () => {
    document.getElementById(perspectiveLink.dataset.targetTab)?.click();
  });

  // Only the arrow follows the pointer; labels and touch targets stay in place.
  document.querySelectorAll('.hero-actions .button,.contact-arrow').forEach(button => {
    button.addEventListener('pointermove', event => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
      const bounds = button.getBoundingClientRect();
      button.style.setProperty('--arrow-x', `${((event.clientX - bounds.left) / bounds.width * 10 - 5).toFixed(2)}px`);
      button.style.setProperty('--arrow-y', `${((event.clientY - bounds.top) / bounds.height * 8 - 4).toFixed(2)}px`);
    });
    button.addEventListener('pointerleave', () => {
      button.style.removeProperty('--arrow-x');
      button.style.removeProperty('--arrow-y');
    });
  });

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
