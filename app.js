(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelector('#year').textContent = new Date().getFullYear();

  function closeMenu(returnFocus = false) {
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    if (returnFocus) menuToggle.focus();
  }

  menuToggle.addEventListener('click', () => {
    const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
    mobileNav.hidden = !opening;
    menuToggle.setAttribute('aria-expanded', String(opening));
    menuToggle.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
  });

  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!mobileNav.hidden && !header.contains(event.target)) closeMenu();
  });
  window.matchMedia('(min-width: 701px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });

  let scrollQueued = false;
  function updateScroll() {
    const range = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${range > 0 ? Math.min(100, window.scrollY / range * 100) : 0}%`;
    header.classList.toggle('scrolled', window.scrollY > 15);
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(updateScroll);
    }
  }, { passive: true });
  window.addEventListener('resize', updateScroll);
  updateScroll();

  if ('IntersectionObserver' in window) {
    // Content stays visible if JavaScript or observers are unavailable.
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -15px 0px' });
    if (!reducedMotion.matches) {
      document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
      document.body.classList.add('motion-ready');
    }
    const navLinks = [...document.querySelectorAll('.desktop-nav a')];
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) navLinks.forEach(link => {
          const active = link.hash === `#${entry.target.id}`;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
    document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));
  }

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const tablist = document.querySelector('[role="tablist"]');
  const horizontalTabs = window.matchMedia('(max-width: 700px)');
  function updateTabOrientation() {
    tablist.setAttribute('aria-orientation', horizontalTabs.matches ? 'horizontal' : 'vertical');
  }
  horizontalTabs.addEventListener('change', updateTabOrientation);
  updateTabOrientation();
  function selectTab(selected, focus = false) {
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) selected.focus();
    updateScroll();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      const previousKey = horizontalTabs.matches ? 'ArrowLeft' : 'ArrowUp';
      const nextKey = horizontalTabs.matches ? 'ArrowRight' : 'ArrowDown';
      if (event.key === nextKey) next = (index + 1) % tabs.length;
      if (event.key === previousKey) next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectTab(tabs[next], true);
      }
    });
  });

  const copyButton = document.querySelector('.copy-email');
  const copyStatus = document.querySelector('#copy-status');
  const originalCopy = copyButton.innerHTML;
  let copyTimer;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(document.querySelector('.contact-email').getAttribute('href').slice(7));
      copyButton.textContent = 'Email copied ✓';
      copyStatus.textContent = 'Email address copied to clipboard.';
    } catch {
      copyButton.textContent = 'Select the email address to copy';
      copyStatus.textContent = 'Clipboard unavailable. You can select and copy the email address above.';
    }
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyButton.innerHTML = originalCopy;
      copyStatus.textContent = '';
    }, 3500);
  });

  // Keep the existing editable profile, experience, education, and skills data.
  // The complete HTML is also usable offline and with JavaScript disabled.
  fetch('info.json').then(response => {
    if (!response.ok) throw new Error('Profile unavailable');
    return response.json();
  }).then(data => {
    const person = data.personal || {};
    if (typeof person.name === 'string') {
      document.querySelector('.hello').textContent = `Hello there, I’m ${person.shortName || person.name}.`;
      document.querySelector('.portrait-name').textContent = `${person.name}.`;
    }
    if (typeof person.status === 'string') {
      document.querySelector('.availability').lastChild.textContent = ` ${person.status}`;
    }
    if (typeof person.location === 'string') {
      document.querySelector('.contact-location span').textContent = person.location;
    }
    function safeProfileUrl(value) {
      if (typeof value !== 'string') return null;
      const url = new URL(value, location.href);
      return url.protocol === 'https:' || (url.origin === location.origin && url.protocol === location.protocol) ? url.href : null;
    }
    const resume = safeProfileUrl(person.resumeUrl);
    if (resume) document.querySelectorAll('a[download]').forEach(link => link.href = resume);
    const photo = safeProfileUrl(person.photoUrl);
    if (photo) document.querySelector('.portrait-image img').src = photo;
    const email = person.email;
    if (typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(link => link.href = `mailto:${email}`);
      document.querySelector('.contact-email').replaceChildren(document.createTextNode(`${email} `));
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      document.querySelector('.contact-email').append(arrow);
    }
    if (typeof person.phoneRaw === 'string' && /^\+?[\d\s-]+$/.test(person.phoneRaw)) {
      const phoneLink = document.querySelector('a[href^="tel:"]');
      phoneLink.href = `tel:${person.phoneRaw}`;
      if (typeof person.phone === 'string') phoneLink.firstChild.textContent = `${person.phone} `;
    }
    if (typeof person.linkedin === 'string') {
      const url = new URL(person.linkedin);
      if (url.protocol === 'https:' && /(^|\.)linkedin\.com$/.test(url.hostname)) document.querySelector('.contact-links a').href = url.href;
    }
    document.querySelectorAll('[data-skill-group]').forEach(group => {
      const skills = data.skills?.[group.dataset.skillGroup];
      if (Array.isArray(skills) && skills.length) {
        const fragments = skills.filter(skill => typeof skill.name === 'string').map(skill => {
          const chip = document.createElement('span');
          chip.textContent = skill.name;
          return chip;
        });
        if (fragments.length) group.replaceChildren(...fragments);
      }
    });
    if (Array.isArray(data.experience)) {
      document.querySelectorAll('.experience-item').forEach((item, index) => {
        const experience = data.experience[index];
        if (!experience) return;
        if (typeof experience.org === 'string') item.querySelector('.exp-company').textContent = experience.org.includes('Uralungal') ? 'ULCCS' : experience.org;
        if (typeof experience.period === 'string') item.querySelector('.exp-duration').textContent = experience.period.toUpperCase();
        if (typeof experience.role === 'string') {
          const role = item.querySelector('.exp-role');
          role.replaceChildren(document.createTextNode(`${experience.role} `));
          if (typeof experience.location === 'string') {
            const location = document.createElement('span');
            location.textContent = `· ${experience.location}`;
            role.append(location);
          }
        }
        if (Array.isArray(experience.bullets)) {
          const bullets = experience.bullets.filter(text => typeof text === 'string').map(text => {
            const bullet = document.createElement('li');
            bullet.textContent = text;
            return bullet;
          });
          if (bullets.length) item.querySelector('ul').replaceChildren(...bullets);
        }
        if (Array.isArray(experience.skillsUsed)) {
          const tags = experience.skillsUsed.filter(text => typeof text === 'string').map(text => {
            const tag = document.createElement('span');
            tag.textContent = text;
            return tag;
          });
          if (tags.length) item.querySelector('.tag-list').replaceChildren(...tags);
        }
      });
    }
    if (Array.isArray(data.education)) {
      document.querySelectorAll('.education-item').forEach((item, index) => {
        const education = data.education[index];
        if (!education) return;
        if (typeof education.degree === 'string') item.querySelector('h3').textContent = education.degree;
        if (typeof education.specialisation === 'string') item.querySelector('.degree-focus').textContent = education.specialisation;
        if (typeof education.institution === 'string') {
          const institution = item.querySelector('.institution');
          institution.replaceChildren(document.createTextNode(education.institution));
          if (typeof education.location === 'string') institution.append(document.createElement('br'), document.createTextNode(education.location));
        }
        if (typeof education.years === 'string') item.querySelector('.eyebrow').firstChild.textContent = `${education.years} `;
      });
    }
    if (Array.isArray(data.skills?.languages)) {
      const languages = [...data.skills.languages].sort((a, b) => (a.badge === 'Native' ? -1 : b.badge === 'Native' ? 1 : 0));
      document.querySelectorAll('.languages li').forEach((item, index) => {
        const language = languages[index];
        if (!language) return;
        if (typeof language.name === 'string') item.querySelector('span').textContent = language.name;
        if (typeof language.badge === 'string') item.querySelector('small').textContent = language.badge.toUpperCase();
      });
    }
    updateScroll();
  }).catch(() => { /* Keep the complete, accessible static content. */ });
})();
