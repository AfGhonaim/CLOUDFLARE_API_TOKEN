/**
 * motion.js — shared motion engine for every concept page.
 *
 * Locked direction: premium/smooth, balanced impact and performance. So the
 * rules here are not per-page choices:
 *   - transform and opacity only, never a layout property;
 *   - one rAF-throttled scroll loop for every scroll-driven effect;
 *   - prefers-reduced-motion reveals everything in its final state;
 *   - pointer effects are switched off on coarse pointers, not degraded.
 *
 * Markup hooks:
 *   [data-reveal]              reveal on enter. Value: up (default)|fade|left|right|scale
 *   [data-reveal-clip]         mask-open reveal for a large visual
 *   [data-reveal-group]        staggers descendant [data-reveal] children
 *   [data-reveal-delay="120"]  explicit delay in ms
 *   [data-reveal-once="false"] re-hide when scrolled away (default: reveal once)
 *   [data-split]               split plain text into masked lines, revealed in sequence
 *   [data-parallax="0.18"]     vertical parallax, value is strength
 *   [data-scroll-scale="0.9"]  scale from value to 1 across the element's travel
 *   [data-hscroll]             horizontal scroll section (pins while translating X)
 *   [data-magnetic]            cursor-attracted button
 *   [data-cursor] on <body>    custom cursor
 */

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const fine = window.matchMedia('(pointer: fine)');

root.classList.add('js');

const STAGGER = 90;

/* ---------------------------------------------------------------- split text */

function splitLines(el) {
  const source = el.dataset.splitText ?? el.textContent.trim().replace(/\s+/g, ' ');
  el.dataset.splitText = source;

  // Lay the words out first, then group them by the line they landed on.
  el.textContent = '';
  const words = source.split(' ').map((word, i) => {
    const span = document.createElement('span');
    span.textContent = i === 0 ? word : ` ${word}`;
    span.style.display = 'inline-block';
    el.append(span);
    return span;
  });

  const lines = [];
  let top = null;
  for (const word of words) {
    const offset = Math.round(word.offsetTop);
    if (offset !== top) {
      lines.push([]);
      top = offset;
    }
    lines.at(-1).push(word.textContent);
  }

  el.textContent = '';
  lines.forEach((words, i) => {
    const line = document.createElement('span');
    line.className = 'rc-line';
    const inner = document.createElement('span');
    inner.className = 'rc-line__inner';
    inner.textContent = words.join('').trim();
    inner.style.setProperty('--line-delay', `${i * STAGGER}ms`);
    line.append(inner);
    el.append(line);
  });
}

function setupSplits() {
  for (const el of document.querySelectorAll('[data-split]')) splitLines(el);
}

/* ------------------------------------------------------------------ reveals */

function setupReveals() {
  for (const group of document.querySelectorAll('[data-reveal-group]')) {
    const children = group.querySelectorAll(':scope > [data-reveal], :scope > * > [data-reveal]');
    children.forEach((child, i) => {
      if (child.dataset.revealDelay === undefined) {
        child.style.setProperty('--reveal-delay', `${i * STAGGER}ms`);
      }
    });
  }

  for (const el of document.querySelectorAll('[data-reveal-delay]')) {
    el.style.setProperty('--reveal-delay', `${el.dataset.revealDelay}ms`);
  }

  const targets = document.querySelectorAll('[data-reveal], [data-reveal-clip], [data-split]');

  if (reduced.matches) {
    for (const el of targets) el.classList.add('is-revealed');
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const once = entry.target.dataset.revealOnce !== 'false';
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        if (once) observer.unobserve(entry.target);
      } else if (!once) {
        entry.target.classList.remove('is-revealed');
      }
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  for (const el of targets) observer.observe(el);
}

/* ------------------------------------------------- scroll-driven transforms */

const scrollItems = [];

function collectScrollItems() {
  scrollItems.length = 0;
  if (reduced.matches) return;

  for (const el of document.querySelectorAll('[data-parallax]')) {
    scrollItems.push({ el, kind: 'parallax', amount: parseFloat(el.dataset.parallax) || 0.15 });
  }
  for (const el of document.querySelectorAll('[data-scroll-scale]')) {
    scrollItems.push({ el, kind: 'scale', from: parseFloat(el.dataset.scrollScale) || 0.9 });
  }
  for (const el of document.querySelectorAll('[data-hscroll]')) {
    scrollItems.push({ el, kind: 'hscroll', track: el.firstElementChild });
  }
}

/** 0 while the element is below the viewport, 1 once it has passed above it. */
function progressOf(rect, viewport) {
  return Math.min(1, Math.max(0, (viewport - rect.top) / (viewport + rect.height)));
}

function onScroll() {
  const viewport = window.innerHeight;

  for (const item of scrollItems) {
    const rect = item.el.getBoundingClientRect();
    if (rect.bottom < -viewport || rect.top > viewport * 2) continue;

    if (item.kind === 'parallax') {
      const shift = (progressOf(rect, viewport) - 0.5) * rect.height * item.amount;
      item.el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
    } else if (item.kind === 'scale') {
      const scale = item.from + (1 - item.from) * progressOf(rect, viewport);
      item.el.style.transform = `scale(${scale.toFixed(4)})`;
    } else if (item.kind === 'hscroll' && item.track) {
      // The section is tall; the track slides across as that height is consumed.
      const travel = item.track.scrollWidth - window.innerWidth;
      const distance = rect.height - viewport;
      if (travel <= 0 || distance <= 0) continue;
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      item.track.style.transform = `translate3d(${(-travel * progress).toFixed(2)}px, 0, 0)`;
    }
  }
}

let ticking = false;
function requestScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    onScroll();
    ticking = false;
  });
}

/* ------------------------------------------------------------ pointer effects */

function setupMagnetic() {
  if (reduced.matches || !fine.matches) return;

  for (const el of document.querySelectorAll('[data-magnetic]')) {
    const strength = parseFloat(el.dataset.magnetic) || 0.32;

    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * strength;
      const y = (event.clientY - rect.top - rect.height / 2) * strength;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });

    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }
}

function setupCursor() {
  if (reduced.matches || !fine.matches || !document.body.hasAttribute('data-cursor')) return;

  const dot = document.createElement('div');
  dot.className = 'rc-cursor';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let currentX = x;
  let currentY = y;

  window.addEventListener('pointermove', (event) => { x = event.clientX; y = event.clientY; });

  (function follow() {
    currentX += (x - currentX) * 0.18;
    currentY += (y - currentY) * 0.18;
    dot.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(follow);
  })();

  for (const el of document.querySelectorAll('a, button, [data-cursor-grow]')) {
    el.addEventListener('pointerenter', () => dot.classList.add('is-grown'));
    el.addEventListener('pointerleave', () => dot.classList.remove('is-grown'));
  }
}

/* ------------------------------------------------------------------- startup */

function init() {
  setupSplits();
  setupReveals();
  collectScrollItems();
  onScroll();
  setupMagnetic();
  setupCursor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

window.addEventListener('scroll', requestScroll, { passive: true });

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    setupSplits();
    for (const el of document.querySelectorAll('[data-split]')) el.classList.add('is-revealed');
    collectScrollItems();
    onScroll();
  }, 180);
}, { passive: true });

// Honour a mid-session change to the reduced-motion setting.
reduced.addEventListener('change', () => {
  if (!reduced.matches) return;
  for (const el of document.querySelectorAll('[data-reveal], [data-reveal-clip], [data-split]')) {
    el.classList.add('is-revealed');
  }
  for (const item of scrollItems) item.el.style.transform = '';
  scrollItems.length = 0;
});
