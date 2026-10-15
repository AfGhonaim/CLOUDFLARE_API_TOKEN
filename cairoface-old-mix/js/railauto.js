/* Cairo FACE — the founders rail drifts on its own, on phones.

   Desktop runs it as a CSS marquee. On phones the rail is a native scroller
   (so it can be swiped and stepped with the arrows), which a CSS animation
   cannot drive — so this nudges scrollLeft instead, at the marquee's pace.
   Touch, wheel or the arrows pause it; it resumes a couple of seconds after
   the reader lets go, from wherever they left it. Only runs while on screen.
   main.js has already cloned the cards once, so the loop point is the
   distance from the first card to its clone. */
(function () {
  "use strict";
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var rail = document.querySelector(".leadrail");
  var track = document.getElementById("leadTrack");
  if (!rail || !track) return;

  var SPEED = 30;          /* px per second — the desktop marquee's pace */
  var RESUME_AFTER = 2200; /* ms of quiet before it drifts again */
  var pos = 0, last = 0, lastUser = 0, lastSet = -1, running = false, onScreen = false, loop = 0;

  function measure() {
    var kids = track.children;
    var n = kids.length / 2;               /* originals + one clone of each */
    loop = n >= 1 && kids[n] ? kids[n].offsetLeft - kids[0].offsetLeft : 0;
  }

  function touch() { lastUser = performance.now(); }
  ["touchstart", "touchmove", "touchend", "pointerdown", "wheel"].forEach(function (t) {
    rail.addEventListener(t, touch, { passive: true });
  });
  /* the arrows write navAt; momentum after a flick shows up as scroll events
     that are not ours */
  rail.addEventListener("scroll", function () {
    if (Math.abs(rail.scrollLeft - lastSet) > 2) touch();
  }, { passive: true });

  function frame(now) {
    if (!running) return;
    var dt = Math.min(64, now - last) / 1000; last = now;
    var navAt = +rail.dataset.navAt || 0;
    var quiet = now - lastUser > RESUME_AFTER && Date.now() - navAt > RESUME_AFTER;
    if (!loop) measure();
    if (quiet && loop) {
      if (lastSet < 0 || Math.abs(rail.scrollLeft - lastSet) > 2) pos = rail.scrollLeft;   /* pick up where they left it */
      pos += SPEED * dt;
      if (pos >= loop) pos -= loop;                                                       /* seamless: clone == original */
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
  window.addEventListener("resize", measure);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      onScreen = en[0].isIntersecting;
      onScreen ? start() : stop();
    }, { threshold: 0.1 }).observe(rail);
  } else { onScreen = true; start(); }
})();
