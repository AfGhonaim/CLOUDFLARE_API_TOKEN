/* Cairo FACE — the event-photo deck.

   Ten photographs in one stack. The front print faces you and the next four
   fan out behind it; the arrows (or a swipe) shuffle one print at a time.

   Everything that moves is a transform or an opacity, written by ONE loop
   that eases each print toward its target pose — so a scroll, a click and a
   swipe all glide, and nothing is a CSS transition fighting a scrubbed value
   (which is what made the old deck stutter and flash). The loop sleeps as
   soon as every print has settled. */
(function () {
  "use strict";

  var deck = document.getElementById("photoDeck");
  var stage = document.getElementById("photoDeckStage");
  if (!deck || !stage) return;

  var cards = [].slice.call(stage.querySelectorAll(".pdeck__card"));
  var N = cards.length;
  if (N < 2) return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cap = document.getElementById("photoDeckCap");
  var controls = document.querySelector('[data-deck="#photoDeck"]');

  var front = 0;
  var spreadT = reduced ? 1 : 0, spreadC = spreadT;      /* the fan, scrubbed by scroll */
  var running = false, last = 0, W = 300;

  /* pose of a print by its distance from the front, at full spread.
     x is in card widths; r in degrees. Slots beyond 4 sit hidden behind. */
  var SLOT = [
    { x: 0,     r: 0,  s: 1,    o: 1,   z: 10 },
    { x: 0.56,  r: 5,  s: 0.93, o: 1,   z: 9 },
    { x: -0.56, r: -5, s: 0.93, o: 1,   z: 8 },
    { x: 1.04,  r: 9,  s: 0.86, o: 0.92, z: 7 },
    { x: -1.04, r: -9, s: 0.86, o: 0.92, z: 6 }
  ];
  var HIDE = { x: 0, r: 0, s: 0.8, o: 0, z: 1 };

  var st = cards.map(function () { return { x: 0, r: 0, s: 0.8, o: 0, z: 1, fly: 0 }; });

  function target(k, spread) {
    var t = k < SLOT.length ? SLOT[k] : HIDE;
    /* collapsed deck: a loose stack, slightly rotated */
    var open = spread;
    return {
      x: t.x * open * W,
      r: t.r * open,
      s: t.s + (1 - t.s) * (1 - open) * 0.6,
      o: k < SLOT.length ? (k === 0 ? 1 : 0.35 + 0.65 * open) * t.o : 0,
      z: t.z
    };
  }

  function apply() {
    for (var i = 0; i < N; i++) {
      var c = st[i], el = cards[i];
      el.style.transform = "translate3d(" + c.x.toFixed(1) + "px,0,0) rotate(" + c.r.toFixed(2) + "deg) scale(" + c.s.toFixed(3) + ")";
      el.style.opacity = c.o.toFixed(3);
      el.style.zIndex = c.z;
    }
  }

  function step(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    /* exponential easing: the same feel at any frame rate */
    var kPose = 1 - Math.exp(-dt * 9), kSpread = 1 - Math.exp(-dt * 6);
    spreadC += (spreadT - spreadC) * kSpread;
    var moving = Math.abs(spreadT - spreadC) > 0.001;
    for (var i = 0; i < N; i++) {
      var k = (i - front + N) % N;
      var tg = st[i].fly ? st[i].flyTarget : target(k, spreadC);
      var c = st[i];
      var dx = tg.x - c.x, dr = tg.r - c.r, ds = tg.s - c.s, dO = tg.o - c.o;
      c.x += dx * kPose; c.r += dr * kPose; c.s += ds * kPose; c.o += dO * kPose;
      c.z = tg.z;
      if (Math.abs(dx) > 0.4 || Math.abs(dr) > 0.05 || Math.abs(ds) > 0.002 || Math.abs(dO) > 0.004) moving = true;
    }
    apply();
    if (moving) requestAnimationFrame(step); else running = false;
  }
  function wake() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(step); }

  function measure() {
    W = cards[0].getBoundingClientRect().width || cards[0].offsetWidth || 300;
    if (reduced) { for (var i = 0; i < N; i++) { var t = target((i - front + N) % N, 1); st[i].x = t.x; st[i].r = t.r; st[i].s = t.s; st[i].o = t.o; st[i].z = t.z; } apply(); }
    else wake();
  }

  function caption() {
    if (cap) cap.textContent = "Photo " + (front + 1) + " of " + N + " — " + cards[front].getAttribute('data-alt');
  }

  /* one print at a time; the print leaving throws itself out to the side, the
     one arriving glides in from the opposite side */
  var busy = 0;
  function go(dir) {
    if (busy) return;
    busy = 1; setTimeout(function () { busy = 0; }, 260);
    var leaving = front, arriving;
    if (dir > 0) { front = (front + 1) % N; arriving = null; }
    else { front = (front - 1 + N) % N; arriving = front; }

    if (dir > 0) {
      /* the old front flies out, then tucks in behind */
      var lv = st[leaving];
      lv.fly = 1; lv.z = 20;
      lv.flyTarget = { x: -1.25 * W, r: -14, s: 0.96, o: 0, z: 20 };
      setTimeout(function () { lv.fly = 0; lv.z = 1; wake(); }, 380);
    } else {
      /* the print coming back starts off to the right and glides to the front */
      var ar = st[arriving];
      ar.x = 1.25 * W; ar.r = 14; ar.s = 0.96; ar.o = 0; ar.z = 20;
      ar.fly = 0;
    }
    caption();
    wake();
  }

  /* arrows */
  if (controls) controls.querySelectorAll("[data-dir]").forEach(function (b) {
    b.addEventListener("click", function () { go(+b.dataset.dir); });
  });

  /* swipe / drag on the stage */
  var sx = null, sy = 0;
  stage.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; }, { passive: true });
  stage.addEventListener("pointerup", function (e) {
    if (sx === null) return;
    var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  }, { passive: true });
  stage.addEventListener("pointercancel", function () { sx = null; }, { passive: true });
  stage.style.touchAction = "pan-y";
  deck.tabIndex = 0;
  deck.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
  });

  /* the fan opens as the deck scrolls into view (eased, so it is never a jump) */
  var vh = window.innerHeight;
  function onScroll() {
    if (reduced) return;
    var r = deck.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    var p = Math.max(0, Math.min(1, (vh * 0.95 - r.top) / (vh * 0.7)));
    p = p * p * (3 - 2 * p);
    if (Math.abs(p - spreadT) > 0.002) { spreadT = p; wake(); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { vh = window.innerHeight; measure(); onScroll(); });
  window.addEventListener("load", function () { measure(); onScroll(); });

  caption();
  measure();
  onScroll();
})();
