/* Cairo FACE — interior-page motion engine.
   Deliberately not the landing page's film engine: no pinned stages, no
   scroll hijacking. Sections stay normal-length and scannable; motion only
   adds depth and sequencing on top.

   Everything expensive is gated:
     - parallax runs on >=1024px with a fine pointer only
     - reveals run everywhere
     - reduced motion turns the whole file into a no-op that reveals content

   One rAF loop drives every scroll-linked effect. Adding a second listener
   here is how a page starts dropping frames, so keep it to the one. */
(function () {
  "use strict";

  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wide = window.matchMedia("(min-width: 1024px)");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* tells the inline head guard that the engine did load, so it must not
     strip .mo-ready and undo the reveals */
  window.__mo = true;

  if (reduced) {
    html.classList.remove("mo-ready");
    return;
  }

  /* ==============================================================
     1. Reveals
     Siblings that both carry [data-reveal] form a stagger group, so
     a four-card grid sequences without any hand-written delays in
     the markup. --i is capped: an eleven-item list should not make
     the reader wait 770ms for the last card.

     Two triggers, on purpose. IntersectionObserver is the fast path,
     but its callbacks are tied to the rendering lifecycle: a page in
     a background tab, or one the compositor is throttling, can go a
     long time without delivery — and a [data-reveal="wipe"] element
     that never reveals is clipped to nothing, i.e. an image the
     reader simply never sees. So the scroll loop below (section 3)
     also sweeps, which cannot be skipped while the page is scrolling,
     and `pending` shrinks to empty either way.
     ============================================================== */
  var pending = [];

  function revealSweep(force) {
    if (!pending.length) return;
    var vhNow = window.innerHeight;
    for (var i = pending.length - 1; i >= 0; i--) {
      var el = pending[i];
      var r = el.getBoundingClientRect();
      /* no `r.bottom > 0` test: an element the reader has already scrolled
         past must count as revealed. Requiring it to still be on screen meant
         a fast scroll, an anchor jump, or a throttled frame could step over
         an element and leave it hidden for the rest of the session. */
      if (force || r.top < vhNow * 0.88) {
        el.classList.add("is-in");
        pending.splice(i, 1);
        (function (node) {
          window.setTimeout(function () { node.classList.add("is-done"); }, 1400);
        })(el);
      }
    }
  }

  (function reveals() {
    var nodes = document.querySelectorAll("[data-reveal], .prule");
    if (!nodes.length) return;

    /* index within the parent, counting only revealing siblings */
    var seen = new Map();
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.hasAttribute("data-i")) {
        el.style.setProperty("--i", el.getAttribute("data-i"));
      } else {
        var p = el.parentNode;
        var n = seen.get(p) || 0;
        seen.set(p, n + 1);
        el.style.setProperty("--i", Math.min(n, 7));
      }
      pending.push(el);
    });

    /* whatever is already on screen reveals now, synchronously, rather than
       waiting for a scroll that may never come on a short page */
    revealSweep(false);

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        var hit = false;
        entries.forEach(function (e) { if (e.isIntersecting) hit = true; });
        if (hit) revealSweep(false);
      }, { rootMargin: "0px 0px -12% 0px", threshold: 0.06 });
      Array.prototype.forEach.call(nodes, function (el) { io.observe(el); });
    }

    /* content that arrives after load (the faculty strip, a late image)
       can push an element into view with no scroll of its own */
    window.addEventListener("load", function () { revealSweep(false); });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) revealSweep(false);
    });
    window.setTimeout(function () { revealSweep(false); }, 1200);
    window.setTimeout(function () { revealSweep(false); }, 3000);
  })();

  /* ==============================================================
     2. Counters
     ============================================================== */
  (function counters() {
    var nodes = document.querySelectorAll("[data-count]");
    if (!nodes.length || !("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        var to = parseFloat(el.getAttribute("data-count")) || 0;
        var suffix = el.getAttribute("data-suffix") || "";
        var t0 = 0;
        var dur = 1300;
        function step(t) {
          if (!t0) t0 = t;
          var k = Math.min(1, (t - t0) / dur);
          /* easeOutExpo — fast out of the gate, long settle */
          var e2 = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
          el.textContent = Math.round(to * e2).toLocaleString("en-US") + suffix;
          if (k < 1) window.requestAnimationFrame(step);
        }
        /* the zero is written here, not at init: if this observer never
           fires — a background tab, a browser without a working rendering
           lifecycle — the figure authored in the HTML stays on screen.
           Pre-zeroing would publish "0 attendees" to that reader. */
        el.textContent = "0" + suffix;
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(nodes, function (el) { io.observe(el); });
  })();

  /* ==============================================================
     3. The single scroll loop: parallax layers + progress bar
     ============================================================== */
  var layers = [];
  var prog = null;
  var ticking = false, tickAt = 0;
  var vh = window.innerHeight;

  function collect() {
    layers = [];
    if (!wide.matches) {
      /* clear anything a previous wide layout had written, or the layers
         stay frozen at their last offset after a resize down */
      document.querySelectorAll("[data-px]").forEach(function (el) {
        el.style.removeProperty("--py");
      });
      return;
    }
    document.querySelectorAll("[data-px]").forEach(function (el) {
      var speed = parseFloat(el.getAttribute("data-px")) || 0.1;
      /* the element that decides whether we are on screen is the layer's
         own clipping box, not the layer (which is intentionally oversized) */
      var scope = el.closest("[data-px-scope]") || el.parentElement || el;
      layers.push({ el: el, speed: speed, scope: scope });
    });
  }

  function frame() {
    ticking = false;
    revealSweep(false);

    if (prog) {
      var max = document.documentElement.scrollHeight - vh;
      prog.style.setProperty("--p", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : "0");
    }

    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var r = L.scope.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      /* 0 when the scope's centre sits on the viewport centre, negative
         above, positive below — so the layer drifts through its own frame
         rather than jumping when it enters */
      var centre = r.top + r.height / 2 - vh / 2;
      L.el.style.setProperty("--py", (-centre * L.speed).toFixed(1) + "px");
    }
  }

  function onScroll() {
    /* The reveal sweep runs HERE, synchronously, not inside the frame below.
       Reveals are content — an element that misses one is not a flourish the
       reader loses, it is a heading or a card they never see — so they must
       not depend on a frame ever being delivered. It is only rect reads over
       a list that shrinks to empty, so it is cheap enough to run raw.

       And `ticking` must not be able to latch. It was set true here and
       cleared only at the top of frame(), so a single rAF that the browser
       throttled away (a backgrounded tab, low power mode, a phone busy with
       momentum scrolling) left it true for good: every later scroll returned
       early, and the page stopped revealing anything for the rest of the
       session. Measured on speakers.html, that stranded 17 of 23 elements at
       opacity 0, the three day headings among them. The timestamp lets a new
       frame be asked for once the last request has clearly been dropped. */
    revealSweep(false);

    if (ticking && Date.now() - tickAt < 400) return;
    ticking = true;
    tickAt = Date.now();
    window.requestAnimationFrame(frame);
  }

  (function progress() {
    prog = document.createElement("div");
    prog.className = "moprog";
    prog.setAttribute("aria-hidden", "true");
    document.body.appendChild(prog);
  })();

  collect();
  frame();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    vh = window.innerHeight;
    collect();
    frame();
  });
  /* a tab picker or filter can add layers after load */
  window.CF_MOTION = { refresh: function () { collect(); frame(); } };

  /* ==============================================================
     3b. Sticky page CTA
     The abstract page carries a fixed submit bar that repeats the hero's
     own button. On a short viewport (a landscape phone at 844x390) the two
     land on top of each other. A sticky CTA should only stand in for the
     real one once the real one has gone, so hide it while the hero is on
     screen. Default is visible: if the observer never fires, the reader
     keeps the call to action.
     ============================================================== */
  (function stickyCta() {
    var bar = document.querySelector(".stickybar");
    var pageHero = document.querySelector(".phero");
    if (!bar || !pageHero || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { bar.classList.toggle("is-hidden", e.isIntersecting); });
    }, { threshold: 0 }).observe(pageHero);
  })();

  /* ==============================================================
     4. Pointer depth on the hero, and the cursor sheen on cards.
     Both are pointer-driven, so both are desktop-with-a-mouse only.
     ============================================================== */
  if (fine.matches) {
    var depth = document.querySelector(".pdepth");
    if (depth) {
      var hero = depth.parentElement;
      /* NOT `pending` — that name is the reveal queue above, and `var` shares
         one function scope, so a second `var pending` here silently
         overwrote the queue with a boolean. revealSweep then read
         `false.length`, returned early every time, and nothing past the
         first screen ever revealed. */
      var mouseTick = false;
      var mx = 0, my = 0;
      hero.addEventListener("mousemove", function (e) {
        var r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width * 2 - 1;
        my = (e.clientY - r.top) / r.height * 2 - 1;
        if (mouseTick) return;
        mouseTick = true;
        window.requestAnimationFrame(function () {
          mouseTick = false;
          depth.style.setProperty("--mx", mx.toFixed(3));
          depth.style.setProperty("--my", my.toFixed(3));
        });
      }, { passive: true });
      hero.addEventListener("mouseleave", function () {
        depth.style.setProperty("--mx", "0");
        depth.style.setProperty("--my", "0");
      });
    }

    /* the sheen reads the cursor position as a percentage of the card */
    document.addEventListener("mousemove", function (e) {
      var card = e.target.closest && e.target.closest(".vcard");
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty("--hx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      card.style.setProperty("--hy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    }, { passive: true });

    /* magnetic pull on the primary buttons — 6px is the most you can do
       before the button stops feeling like it is where you clicked */
    document.querySelectorAll(".btn-pill, .pill-sm").forEach(function (b) {
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        b.style.transform = "translate(" + (dx * 6).toFixed(1) + "px," + (dy * 4).toFixed(1) + "px)";
      }, { passive: true });
      b.addEventListener("mouseleave", function () { b.style.transform = ""; });
    });
  }
})();
