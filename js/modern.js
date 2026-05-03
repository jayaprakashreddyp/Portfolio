(() => {
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Theme toggle =====
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', stored || (prefersDark ? 'dark' : 'light'));

  $('#themeToggle')?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    requestAnimationFrame(updateNavPill);
  });

  // ===== Mobile nav =====
  const navLinks = $('#navLinks');
  $('#navToggle')?.addEventListener('click', () => navLinks.classList.toggle('open'));
  $$('.nav-link').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

  // ===== Sticky nav border =====
  const navWrap = $('#nav');

  // ===== Scroll progress bar =====
  const progressBar = $('#scrollProgress');
  const updateProgress = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const total = h.scrollHeight - h.clientHeight;
    const p = total > 0 ? (scrolled / total) * 100 : 0;
    if (progressBar) progressBar.style.width = p + '%';
  };

  // ===== Nav pill FLIP indicator =====
  const navPill = $('#navPill');
  const updateNavPill = () => {
    if (!navPill || !navLinks) return;
    if (window.innerWidth <= 980) { navPill.classList.remove('ready'); return; }
    const active = navLinks.querySelector('.nav-link.active');
    if (!active) { navPill.classList.remove('ready'); return; }
    const aRect = active.getBoundingClientRect();
    const nRect = navLinks.getBoundingClientRect();
    const x = aRect.left - nRect.left;
    navPill.style.width = aRect.width + 'px';
    navPill.style.transform = `translate(${x}px, -50%)`;
    navPill.classList.add('ready');
  };

  // ===== Timeline draw progress =====
  const timeline = $('.timeline');
  const updateTimeline = () => {
    if (!timeline) return;
    const r = timeline.getBoundingClientRect();
    const vh = window.innerHeight;
    // start drawing when timeline top hits 75% of viewport, fully drawn when bottom hits 25%
    const startTrigger = vh * 0.75;
    const endTrigger = vh * 0.25;
    const total = (r.height) - (startTrigger - endTrigger);
    let progress = (startTrigger - r.top) / total;
    progress = Math.max(0, Math.min(1, progress));
    timeline.style.setProperty('--tl-progress', progress.toFixed(3));
  };

  // ===== Combined scroll handler (rAF-throttled) =====
  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      if (window.scrollY > 8) navWrap.classList.add('scrolled');
      else navWrap.classList.remove('scrolled');
      if (window.scrollY > 400) navWrap.classList.remove('hidden');
      else navWrap.classList.add('hidden');
      updateProgress();
      updateTimeline();
      scrollTicking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { updateNavPill(); updateTimeline(); });

  // ===== Active nav link via scroll-spy =====
  const sectionIds = ['home', 'about', 'resume', 'projects', 'contact'];
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  const linkMap = new Map($$('.nav-link').map(a => [a.getAttribute('href').slice(1), a]));
  const setActive = id => {
    linkMap.forEach(a => a.classList.remove('active'));
    linkMap.get(id)?.classList.add('active');
    updateNavPill();
  };
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sections.forEach(s => spy.observe(s));

  // ===== Section title word reveal =====
  $$('.section-title').forEach(el => {
    if (el.dataset.split) return;
    const text = el.textContent.trim();
    el.textContent = '';
    text.split(/\s+/).forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.style.setProperty('--i', i);
      span.textContent = word;
      el.appendChild(span);
      el.appendChild(document.createTextNode(' '));
    });
    el.dataset.split = 'true';
  });

  // ===== Index chips for staggered hover wave =====
  $$('.skill-card, .proj-card').forEach(card => {
    $$('.chips span', card).forEach((chip, i) => chip.style.setProperty('--i', i));
  });

  // ===== Index reveal-group children for staggered scroll-reveal =====
  ['.cert-grid', '.skill-grid', '.stats-grid', '.proj-grid'].forEach(sel => {
    $$(sel).forEach(grid => {
      grid.classList.add('reveal-group');
      Array.from(grid.children).forEach((child, i) => child.style.setProperty('--i', i));
    });
  });

  // ===== Reveal on scroll (single elements + groups) =====
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        revealer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  $$('.reveal, .reveal-group, .section-head').forEach(el => revealer.observe(el));

  // ===== Counter animation =====
  const animateCount = el => {
    const target = parseInt(el.dataset.count, 10) || 0;
    if (reduceMotion) {
      el.textContent = target.toString();
      el.parentElement?.classList.add('counted');
      return;
    }
    const dur = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * target).toString();
      if (t < 1) requestAnimationFrame(tick);
      else el.parentElement?.classList.add('counted');
    };
    requestAnimationFrame(tick);
  };
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(e.target);
        counterObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  $$('.stat-num').forEach(el => counterObs.observe(el));

  // ===== Footer year =====
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== Initial paint =====
  requestAnimationFrame(() => {
    onScroll();
    updateNavPill();
  });
})();
