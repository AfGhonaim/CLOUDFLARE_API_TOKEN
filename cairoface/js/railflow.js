/* Cairo FACE — the experts and testimonial rails drift on their own,
   like the logo marquees, on every screen size.

   These rails are native scrollers (swipe, arrows, keyboard all keep
   working), so a CSS marquee cannot drive them: this nudges scrollLeft at a
   steady pace instead. Each rail is cloned once (inert copies) so the loop
   is seamless — when the drift passes the last original it jumps back by one
   loop length, which is invisible because clone == original. Touch,
   wheel, focus and the arrows pause it (hover does not); it resumes ~2s after the reader lets
   go, from wherever they left it. Only runs while a rail is on screen. */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var SPEED = 34;          /* px per second */
  var RESUME_AFTER = 2200; /* ms of quiet before it drifts again */

  function setup(rail) {
    var track = rail.querySelector(".docrail__track, .leadrail__track, .logorail__track") || rail;
    var originals = [].slice.call(track.children);
    if (originals.length < 2) return;
    /* the marquee rails (founders, partner logos) were already doubled by main.js for their CSS loop —
       on phones they become swipeable scrollers, so reuse that doubling instead of cloning again */
    var preLooped = !!track.dataset.looped;
    if (preLooped) originals = originals.slice(0, originals.length / 2);
    (preLooped ? [] : originals).forEach(function (c) {
      var k = c.cloneNode(true);
      k.setAttribute("aria-hidden", "true");
      k.setAttribute("data-clone", "");
      k.classList.add("seen");
      k.removeAttribute("id");
      k.querySelectorAll("a,button,[tabindex]").forEach(function (x) { x.setAttribute("tabindex", "-1"); });
      track.appendChild(k);
    });
    /* clones carry no handlers (play buttons, lightbox) — hand a click on one
       to its original */
    rail.addEventListener("click", function (e) {
      var clone = e.target.closest("[data-clone]");
      if (!clone) return;
      var idx = [].indexOf.call(track.children, clone) - originals.length;
      var orig = originals[idx];
      var hit = e.target.closest("a,button");
      if (!orig || !hit) return;
      var cls = hit.className && hit.className.split(" ")[0];
      var twin = (cls && orig.querySelector("." + cls)) || orig.querySelector("a,button");
      if (twin && twin !== hit) { e.preventDefault(); e.stopPropagation(); twin.click(); }
    }, true);
    /* free scrolling: scroll-snap would swallow every sub-pixel step */
    rail.style.scrollSnapType = "none";

    var pos = 0, last = 0, lastUser = 0, lastSet = -1, running = false, onScreen = false, loop = 0, hover = false;

    function measure() {
      var n = originals.length;
      var kids = track.children;
      loop = kids[n] ? kids[n].offsetLeft - kids[0].offsetLeft : 0;
    }
    function touch() { lastUser = performance.now(); }
    ["touchstart", "touchmove", "pointerdown", "keydown", "focusin"].forEach(function (t) {
      rail.addEventListener(t, touch, { passive: true });
    });
    /* a wheel over the rail only pauses it when the reader is scrolling the RAIL sideways;
       ordinary vertical scrolling past (or hovering over) the cards never stops the drift */
    rail.addEventListener("wheel", function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) touch(); }, { passive: true });
    /* hovering a card does NOT pause the drift (client) — only touch, wheel, keys and the arrows do */
    rail.addEventListener("scroll", function () {
      if (Math.abs(rail.scrollLeft - lastSet) > 2) touch();
      /* manual swiping into the clones wraps back invisibly */
      if (loop && rail.scrollLeft >= loop) { rail.scrollLeft -= loop; lastSet = -1; }
    }, { passive: true });

    function frame(now) {
      if (!running) return;
      var dt = Math.min(64, now - last) / 1000; last = now;
      if (rail.offsetParent === null) { requestAnimationFrame(frame); return; }   /* hidden tab panel */
      if (!loop) measure();
      var navAt = +rail.dataset.navAt || 0;
      var quiet = !hover && now - lastUser > RESUME_AFTER && Date.now() - navAt > RESUME_AFTER;
      if (quiet && loop) {
        if (lastSet < 0 || Math.abs(rail.scrollLeft - lastSet) > 2) pos = rail.scrollLeft;
        pos += SPEED * dt;
        if (pos >= loop) pos -= loop;
        lastSet = Math.round(pos);
        rail.scrollLeft = lastSet;
      } else {
        lastSet = -1;
      }
      requestAnimationFrame(frame);
    }
    function start() { if (running || !onScreen) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
    function stop() { running = false; }

    window.addEventListener("load", measure);
    window.addEventListener("resize", function () { loop = 0; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        onScreen = en[0].isIntersecting;
        onScreen ? start() : stop();
      }, { threshold: 0.1 }).observe(rail);
    } else { onScreen = true; start(); }
  }

  ["speakersRail", "quoteRail", "writtenRail"].forEach(function (id) {
    var r = document.getElementById(id);
    if (r) setup(r);
  });
  /* phones: founders + both logo rails swipe with a finger (and still drift on their own) */
  if (window.matchMedia("(max-width: 768px), (hover: none) and (pointer: coarse)").matches) {
    ["leadRail", "sciRail", "partnerRail"].forEach(function (id) {
      var r = document.getElementById(id);
      if (r) setup(r);
    });
  }
})();
