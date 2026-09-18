/* Cairo FACE — the DOM layer of the film.
   One scroll listener drives everything: beat progress (--bp),
   per-character reveals, the scene-dot rail, the CTA pill stack,
   and the header theme. The canvas reads the same store. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mqFlow = window.matchMedia("(max-width: 768px)");
  var vh = window.innerHeight;

  /* ---------- shared scroll store (read by film3d.js) ---------- */
  var CF = (window.CF = {
    y: 0,
    vh: vh,
    reduced: reduced,
    scenes: [],   /* {key, el, top, height, theme} */
    tailTop: 0,
  });

  /* ---------- count-up ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function runCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduced) { el.textContent = target.toLocaleString("en-US"); return; }
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / 1600, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        /* A horizontally scrolling rail clips its own children, so the numbers
           parked off its right edge never reach the threshold by themselves and
           would sit at 0 forever. Observe the rail and run the whole group. */
        if (e.target.hasAttribute("data-count")) { runCount(e.target); return; }
        Array.prototype.forEach.call(
          e.target.querySelectorAll("[data-count]"), runCount);
      });
    }, { threshold: 0.4 });
    var groups = [];
    counters.forEach(function (c) {
      var rail = c.closest ? c.closest(".statrail") : null;
      if (!rail) { cio.observe(c); return; }
      if (groups.indexOf(rail) === -1) { groups.push(rail); cio.observe(rail); }
    });
  } else {
    counters.forEach(runCount);
  }

  /* ---------- per-character split ---------- */
  function splitChars(el) {
    var chars = [];
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (word) {
            if (!word) return;
            if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(" ")); return; }
            var wd = document.createElement("span");
            wd.style.display = "inline-block";
            wd.style.whiteSpace = "nowrap";
            for (var i = 0; i < word.length; i++) {
              var ch = document.createElement("span");
              ch.className = "ch";
              ch.textContent = word[i];
              wd.appendChild(ch);
              chars.push(ch);
            }
            frag.appendChild(wd);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    }
    walk(el);
    return chars;
  }

  /* film splits live inside beats; tail splits reveal on viewport pass */
  var beatSplits = [];
  var tailSplits = [];
  document.querySelectorAll("[data-split-progress]").forEach(function (el) {
    beatSplits.push({ el: el, beat: el.closest("[data-beat]"), chars: splitChars(el), lit: -1 });
  });
  document.querySelectorAll("[data-split]").forEach(function (el) {
    tailSplits.push({ el: el, chars: splitChars(el), lit: -1 });
  });

  /* ---------- scene map ---------- */
  var sceneEls = document.querySelectorAll("[data-scene]");
  var beatEls = document.querySelectorAll("[data-beat]");
  /* the DOM tail begins where the film ends — after the last film scene,
     not at the first light section (speakers/pricing sit between scenes) */
  var tailEl = document.getElementById("tailstart") || document.querySelector(".tail");

  function measure() {
    vh = window.innerHeight;
    CF.vh = vh;
    /* flowing beats (static inner) reveal by viewport entry; pinned beats
       scrub by pin distance — detect actual pinning per layout */
    beatEls.forEach(function (b) {
      var inner = b.querySelector(".beat__inner");
      b.__flow = !inner || getComputedStyle(inner).position !== "sticky";
    });
    CF.scenes = [];
    sceneEls.forEach(function (el) {
      CF.scenes.push({
        key: el.dataset.scene,
        el: el,
        top: el.offsetTop,
        height: el.offsetHeight,
        theme: el.dataset.theme || "light",
      });
    });
    CF.tailTop = tailEl ? tailEl.offsetTop : document.body.scrollHeight;
  }
  CF.measure = measure;

  /* ---------- rail ---------- */
  var railDots = document.querySelectorAll(".rail__dot");
  railDots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      var target = document.getElementById(dot.dataset.go === "top" ? "hero" : dot.dataset.go);
      /* clear the floating nav — scroll-padding-top does not apply to scrollTo */
      var navClear = window.innerWidth <= 768 ? 92 : 108;
      if (target) window.scrollTo({ top: Math.max(0, target.offsetTop - navClear + 2), behavior: reduced ? "auto" : "smooth" });
    });
  });

  /* ---------- CTA pill stack ---------- */
  var PILL_REG = { label: "Register now", href: "https://cairoface.com/register", ext: true };
  var PILLS = {
    hero: PILL_REG, manifesto: PILL_REG, numbers: PILL_REG, plan: PILL_REG,
    days: PILL_REG, voices: PILL_REG, tail: PILL_REG,
  };
  var stack = document.getElementById("pillstack");
  var pillA = stack ? stack.querySelector(".pill-cta--front") : null;
  var pillB = stack ? stack.querySelector(".pill-cta--back") : null;
  var pillKey = "hero";

  function applyPill(el, cfg) {
    el.querySelector(".pill-cta__label").textContent = cfg.label;
    el.setAttribute("href", cfg.href);
    if (cfg.ext) { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener"); }
    else { el.removeAttribute("target"); el.removeAttribute("rel"); }
  }

  function swapPill(key) {
    if (key === pillKey || !pillA || !pillB) return;
    pillKey = key;
    var cfg = PILLS[key] || PILLS.tail;
    /* deal a new card: back gets the new label, comes to front;
       the old front fades up and out */
    applyPill(pillB, cfg);
    var oldFront = pillA;
    var newFront = pillB;
    oldFront.classList.remove("pill-cta--front");
    oldFront.classList.add("pill-cta--gone");
    newFront.classList.remove("pill-cta--back", "pill-cta--gone");
    newFront.classList.add("pill-cta--front");
    newFront.removeAttribute("aria-hidden");
    newFront.removeAttribute("tabindex");
    setTimeout(function () {
      oldFront.classList.remove("pill-cta--gone");
      oldFront.classList.add("pill-cta--back");
      oldFront.setAttribute("aria-hidden", "true");
      oldFront.setAttribute("tabindex", "-1");
    }, 460);
    pillA = newFront;
    pillB = oldFront;
  }

  /* ---------- portrait + stat + editorial reveals ---------- */
  /* the motif draws itself: normalize every path so CSS dash math holds */
  document.querySelectorAll(".motif path").forEach(function (p) {
    p.setAttribute("pathLength", "100");
  });
  var revealEls = document.querySelectorAll(".scard, .stat, [data-reveal], .motif");
  if ("IntersectionObserver" in window && !reduced) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        rio.unobserve(e.target);
        var sibs = e.target.parentElement.children;
        var idx = Array.prototype.indexOf.call(sibs, e.target);
        e.target.style.transitionDelay = (idx * 0.09).toFixed(2) + "s";
        e.target.classList.add("seen");
      });
    }, { threshold: 0.35 });
    revealEls.forEach(function (el) { rio.observe(el); });

    /* The same guarantee the split headlines and the card items already get,
       for the last path that did not have one. These reveal purely on the
       observer, and under a fast scroll the observer falls behind: measured
       at 390px, 24 elements — the partner logos, the leadership block, the
       whole FAQ — went past the top third of the screen without even being
       told to reveal. They caught up afterwards here, but "afterwards" is
       exactly what the reader does not get on a phone that drops the
       callback for good. A plain scroll listener, no rAF, no observer. */
    var unrevealed = [].slice.call(revealEls);
    var revealQueued = false;

    var sweepReveals = function () {
      revealQueued = false;
      for (var i = unrevealed.length - 1; i >= 0; i--) {
        var el = unrevealed[i];
        if (el.classList.contains("seen")) { unrevealed.splice(i, 1); continue; }
        if (el.getBoundingClientRect().top > window.innerHeight * 0.88) continue;
        el.classList.add("seen");
        unrevealed.splice(i, 1);
      }
      if (!unrevealed.length) {
        window.removeEventListener("scroll", queueReveals);
        window.removeEventListener("resize", queueReveals);
      }
    };

    var queueReveals = function () {
      if (revealQueued) return;
      revealQueued = true;
      window.setTimeout(sweepReveals, 300);   /* the observer gets first go */
    };

    window.addEventListener("scroll", queueReveals, { passive: true });
    window.addEventListener("resize", queueReveals, { passive: true });
    queueReveals();
  } else {
    revealEls.forEach(function (el) { el.classList.add("seen"); });
  }

  /* mobile card items reveal ONE AT A TIME: each fires only when it crosses
     the lower third of the viewport, so a scroll gesture reveals one card */
  var cardItems = document.querySelectorAll(".cardgrid > *, .audience--rich li, .whoitem, .gitem");
  if ("IntersectionObserver" in window && !reduced) {
    var cardIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cardIO.unobserve(e.target);
        e.target.classList.add("seen");
      });
    }, { rootMargin: "0px 0px -32% 0px", threshold: 0.05 });
    function wireCards() {
      cardItems.forEach(function (el) {
        if (mqFlow.matches) cardIO.observe(el);
        else { cardIO.unobserve(el); el.classList.remove("seen"); }
      });
    }
    wireCards();
    mqFlow.addEventListener ? mqFlow.addEventListener("change", wireCards) : mqFlow.addListener(wireCards);

    /* ...and the same guarantee the split headlines get, for the same
       reason. On a phone these items are held at `opacity: 0 !important`
       until `.seen` lands, so a dropped callback does not cost a flourish —
       it costs the content. Four of the five programme chapters stayed
       invisible while still holding their 369px of layout, which is how a
       section ends up reading as one item above a large empty panel.

       A plain scroll listener re-checks the same line the observer watches
       (the lower third of the viewport, per its rootMargin), so the cards
       still arrive one per scroll step — this only catches the ones the
       observer never reported. */
    var unseenCards = [].slice.call(cardItems);
    var cardSweepQueued = false;

    var sweepCards = function () {
      cardSweepQueued = false;
      if (!mqFlow.matches) return;              /* desktop reveals by its own path */
      for (var i = unseenCards.length - 1; i >= 0; i--) {
        var el = unseenCards[i];
        if (el.classList.contains("seen")) { unseenCards.splice(i, 1); continue; }
        if (el.getBoundingClientRect().top > window.innerHeight * 0.68) continue;
        el.classList.add("seen");
        unseenCards.splice(i, 1);
      }
      if (!unseenCards.length) {
        window.removeEventListener("scroll", queueCardSweep);
        window.removeEventListener("resize", queueCardSweep);
      }
    };

    var queueCardSweep = function () {
      if (cardSweepQueued) return;
      cardSweepQueued = true;
      window.setTimeout(sweepCards, 420);       /* the observer goes first */
    };

    window.addEventListener("scroll", queueCardSweep, { passive: true });
    window.addEventListener("resize", queueCardSweep, { passive: true });
    queueCardSweep();
  } else {
    cardItems.forEach(function (el) { el.classList.add("seen"); });
  }

  /* A panel a click has just un-hidden has no scroll to ride, and an
     IntersectionObserver does not reliably report an element that went from
     0x0 straight to laid out without one. That is how "Written testimonials"
     opened onto four 335x274 cards at opacity 0 — present, occupying the
     space, and invisible. The reader asked for this panel, so there is
     nothing left to stagger: show its contents outright. */
  /* A Web Animation only advances while the page is being given frames. A
     backgrounded tab, a phone in low power mode, or a page busy with
     something heavy can leave one unfinished indefinitely — and every
     animation on this page gates something the reader actually needs. The
     price panel sits at opacity 0 for as long as its 440ms entrance stays
     unfinished; an FAQ answer stays clamped to its collapsed height with
     overflow hidden. Measured: after 2.5s of a stalled entrance the pricing
     panel was still fully transparent, and finishing the animation by hand
     put it right. The motion is decoration. What it uncovers is not. So
     every animation gets a deadline. */
  function guaranteeFinish(anim, ms) {
    if (!anim) return anim;
    window.setTimeout(function () {
      try { if (anim.playState !== "finished") anim.finish(); } catch (e) { /* cancelled */ }
    }, ms);
    return anim;
  }

  function revealWithin(root) {
    if (!root) return;
    if (root.classList) root.classList.add("seen");
    var nodes = root.querySelectorAll("[data-reveal], .scard, .stat, .motif, .quotecard, .qvcard");
    Array.prototype.forEach.call(nodes, function (el) { el.classList.add("seen"); });
  }

  /* ---------- rail arrows + pricing toggle ---------- */
  /* the rail arrows moved to js/railnav.js — a second page needed them */
  var ptabs = document.querySelectorAll(".pricing__toggle:not(#voiceTabs) .ptab");
  ptabs.forEach(function (tb) {
    tb.addEventListener("click", function () {
      ptabs.forEach(function (o) {
        o.classList.toggle("is-active", o === tb);
        o.setAttribute("aria-selected", o === tb ? "true" : "false");
      });
      document.querySelectorAll(".price-panel").forEach(function (p) {
        var show = p.dataset.panel === tb.dataset.plan;
        if (show) revealWithin(p);
        if (show && p.hidden && !reduced && p.animate) {
          p.hidden = false;
          guaranteeFinish(p.animate(
            [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
            { duration: 440, easing: "cubic-bezier(0.22, 0.8, 0.3, 1)" }
          ), 900);
        } else {
          p.hidden = !show;
        }
      });
    });
  });

  /* ---------- FAQ: the answer unfolds instead of snapping ---------- */
  if (!reduced && "animate" in Element.prototype) {
    document.querySelectorAll(".faq__item").forEach(function (item) {
      var summary = item.querySelector("summary");
      if (!summary) return;
      var anim = null;
      summary.addEventListener("click", function (e) {
        e.preventDefault();
        if (anim) anim.cancel();
        var startH = item.offsetHeight;
        item.style.overflow = "hidden";

        /* The close used to happen inside onfinish — `item.open = false` ran
           only when the height animation reported it was done. But an
           animation event is not guaranteed to arrive: when the page is not
           being given frames the animation ends and onfinish never fires, so
           the answer simply would not close, and `overflow: hidden` stayed
           clamped on it. Opening had the same hole one step further on.
           The state change is the point of the click; the height animation is
           how it looks getting there. So a timer owns the state change, and
           the animation event only gets there first. */
        var mine, done = false;
        function finishUp(close) {
          if (done || anim !== mine) return;    /* a later click owns it now */
          done = true;
          /* Stop the animation before letting go of it. These keyframes start
             at the collapsed height, so one that is still running pins the
             element there — and releasing the handle without stopping it left
             the next click with nothing to cancel, so they stacked up and the
             answer could never expand past 67px no matter how many times it
             was clicked. */
          try { if (mine && mine.playState !== "finished") mine.finish(); } catch (e) {}
          if (close) item.open = false;
          anim = null;
          item.style.overflow = "";
        }

        if (item.open) {
          mine = anim = item.animate(
            { height: [startH + "px", summary.offsetHeight + "px"] },
            { duration: 360, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
          );
          mine.onfinish = function () { finishUp(true); };
          window.setTimeout(function () { finishUp(true); }, 800);
        } else {
          item.open = true;
          mine = anim = item.animate(
            { height: [startH + "px", item.offsetHeight + "px"] },
            { duration: 480, easing: "cubic-bezier(0.22, 0.8, 0.3, 1)" }
          );
          mine.onfinish = function () { finishUp(false); };
          mine.oncancel = function () { finishUp(false); };
          window.setTimeout(function () { finishUp(false); }, 950);
        }
      });
    });
  }

  /* ---------- CTAs lean toward the cursor ---------- */
  if (!reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".btn-pill, .pill-sm, .btn-ghost, .railnav__btn").forEach(function (b) {
      if (b.closest(".photo-feature")) return; /* its pill is transform-positioned */
      b.classList.add("mag");
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" +
          (((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(1) + "px," +
          (((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }


  /* ---------- video testimonials ----------
     Fill VIDEO_TESTIMONIALS with { url, name, quote } — YouTube or Vimeo
     links in any form. Cards are the entire #quoteRail, each with an auto
     thumbnail (YouTube), opening a clean lightbox on click. */
  var VIDEO_TESTIMONIALS = [
    { url: "https://youtu.be/8oVS-dnPylE", name: "The CairoFACE experience", quote: "“Every face has a story. Every moment leaves a mark.”" },
    { url: "https://youtu.be/qT0nvXh8fsg", name: "More than a congress", quote: "Three days. One unforgettable experience." },
    { url: "https://youtu.be/kWD2o55SZt0", name: "Official opening ceremony", quote: "Where the world's leading minds in facial aesthetics meet." },
    { url: "https://youtu.be/0F1GqVavjiw", name: "Cadaver course — CairoFACE 2026", quote: "Turn knowledge into practical skills through immersive training." }
  ];
  function videoEmbed(v) {
    var m = v.match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([\w-]{6,})/);
    if (m) return { src: "https://www.youtube-nocookie.com/embed/" + m[1] + "?autoplay=1&rel=0", thumb: "https://i.ytimg.com/vi/" + m[1] + "/hqdefault.jpg" };
    m = v.match(/vimeo\.com\/(\d+)/);
    if (m) return { src: "https://player.vimeo.com/video/" + m[1] + "?autoplay=1", thumb: "" };
    return { src: v, thumb: "" };
  }
  function openVideoLightbox(src) {
    var lb = document.createElement("div");
    lb.className = "vlb";
    lb.innerHTML = '<div class="vlb__scrim"></div>' +
      '<div class="vlb__frame"><button class="vlb__close" aria-label="Close video">×</button>' +
      '<iframe src="' + src + '" title="Testimonial video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>';
    document.body.appendChild(lb);
    document.body.classList.add("vlb-open");
    function close() {
      lb.remove();
      document.body.classList.remove("vlb-open");
      window.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    lb.querySelector(".vlb__scrim").addEventListener("click", close);
    lb.querySelector(".vlb__close").addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(function () { lb.classList.add("vlb--in"); });
  }
  var quoteRail = document.getElementById("quoteRail");
  if (quoteRail && VIDEO_TESTIMONIALS.length) {
    VIDEO_TESTIMONIALS.forEach(function (t) {
      var v = videoEmbed(t.url);
      var card = document.createElement("button");
      card.type = "button";
      card.className = "qvcard";
      card.setAttribute("data-reveal", "");
      card.innerHTML =
        '<span class="qvcard__poster"' + (v.thumb ? ' style="background-image:url(' + v.thumb + ')"' : "") + '>' +
        '<span class="qvcard__play" aria-hidden="true">▶</span></span>' +
        '<span class="heading qvcard__title">' + t.name + "</span>" +
        (t.quote ? '<span class="body qvcard__quote">' + t.quote + "</span>" : "");
      card.addEventListener("click", function () { openVideoLightbox(v.src); });
      /* the rail is videos only now — append so they keep authored order
         (prepending was to sit ahead of the old text quote cards) */
      quoteRail.appendChild(card);
      card.classList.add("seen");
    });
  }
  window.CF_openVideo = openVideoLightbox; /* console/demo access */

  /* ---------- hero: the supplied Cairo FACE reel ----------
     It occupies the same right-hand column as the portrait, so when it fades
     in the column simply comes alive. Only fetched once the hero is on screen
     and only where the motion is wanted. */
  var reel = document.getElementById("heroReel");
  if (reel && !reduced) {
    var armed = false;
    function armReel() {
      if (armed) return;
      armed = true;
      reel.addEventListener("playing", function () { reel.classList.add("is-playing"); }, { once: true });
      /* play() must wait for load() to settle, or the request is cancelled
         ("interrupted by a new load request") and the poster just sits there */
      function go() {
        var p = reel.play();
        if (p && p.catch) p.catch(function () { /* autoplay refused: poster stays */ });
      }
      reel.preload = "auto";
      if (reel.readyState >= 3) { go(); }
      else { reel.addEventListener("canplay", go, { once: true }); reel.load(); }
    }
    /* the hero is always above the fold, so arm it directly — an
       IntersectionObserver here simply never fired for this element, and
       gating the page's primary visual behind one buys nothing. Deferred to
       window load so it does not compete with first paint. */
    if (document.readyState === "complete") setTimeout(armReel, 400);
    else window.addEventListener("load", function () { setTimeout(armReel, 400); });
    /* it loops, and the clip ramps dark -> bright, so dip across the seam */
    reel.addEventListener("timeupdate", function () {
      if (!reel.duration) return;
      reel.classList.toggle("is-looping", reel.duration - reel.currentTime < 0.36);
    });
    reel.addEventListener("seeked", function () { reel.classList.remove("is-looping"); });
    /* a hidden tab can leave it paused mid-play; never restart a finished clip */
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && armed && reel.paused) {
        reel.play().catch(function () {});
      }
    });
  }

  /* ---------- Who should attend: the reel scrubs with the scroll ----------
     The same clip as the hero, but here the playhead is driven by how far
     through the pinned beat you are, so scrolling *is* the playback. */
  var whoReel = document.getElementById("whoReel");
  if (whoReel && !reduced) {
    var whoBeat = whoReel.closest("[data-beat]");
    var whoDur = 0, whoWant = -1, whoSeeking = false, whoArmed = false;

    /* `is-ready` fades the reel up AND drops the still underneath to 25%, so
       it has to mean "the reel is actually showing a frame" — not "we know
       its duration". Marking it on loadedmetadata left any phone that refuses
       autoplay (Low Power Mode is the common one) with a dimmed still behind
       a dead video frame: a near-black panel where the scene should be. */
    function whoShow() { whoReel.classList.add("is-ready"); }
    function whoHide() { whoReel.classList.remove("is-ready"); }

    /* Both of these have to cope with having ALREADY happened. The element
       carries preload="auto", so it starts loading during parse, and over a
       CDN the metadata can be in before this script ever runs — in which
       case the event has been and gone and the listener hears nothing.
       whoDur then stays 0 and scrubWho returns on its first line, so the
       reel never moves. It went unnoticed because a local server answers in
       range requests and is slow enough to lose the race; production, on one
       cached response, wins it. So: subscribe, then check the state we may
       have missed. */
    function whoNoteDuration() { whoDur = whoReel.duration || 0; }
    function whoArm() {
      if (whoArmed) return;
      whoArmed = true;
      try { whoReel.currentTime = 0.01; } catch (e) {}
    }

    /* ---------- the clip has to be local before it can be scrubbed ----------
       Cloudflare Pages answers a Range request for this file with the whole
       thing, `200`, and no Accept-Ranges — and Chrome will not seek a
       resource it cannot range-request. It does not complain: it accepts
       `currentTime = t`, reports the clip as fully seekable AND fully
       buffered, and quietly leaves the playhead at 0. The scrub was
       computing exactly the right times in production (0.06, 1.58, 3.03,
       4.44, identical to local) and not one of them landed, which is a
       failure that cannot be seen from the code or from a local server —
       python answers the same requests with 206, so seeking works there.

       Fetching the clip once and handing the element a blob URL takes the
       host out of it: the bytes are local, so every seek is local too. That
       is also the only sane way to scrub on a phone, where a seek that costs
       a network round trip is no scrub at all. If the fetch fails we leave
       the element on its network source, which can still PLAY where it
       cannot seek — and the loop fallback below covers exactly that. */
    var whoSource = whoReel.querySelector("source");
    var whoNetURL = whoSource ? whoSource.getAttribute("src") : whoReel.getAttribute("src");
    var whoFetched = false;

    function whoLoadLocal() {
      if (whoFetched || !whoNetURL || !window.fetch) return;
      whoFetched = true;
      fetch(whoNetURL)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(function (b) {
          whoArmed = false;                 /* the new source needs arming again */
          whoReel.src = URL.createObjectURL(b);   /* src wins over <source> */
          whoReel.load();
        })
        .catch(function () { whoReel.load(); });  /* stay on the network copy */
    }

    /* start well before the reel is due, so the bytes are there by the time
       the scrub wants them, but not on page load for readers who never
       reach the section */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries, obs) {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        whoLoadLocal();
      }, { rootMargin: "200% 0px" }).observe(whoReel);
    } else {
      whoLoadLocal();
    }

    whoReel.addEventListener("loadedmetadata", whoNoteDuration);
    /* a paused video still needs one decoded frame to show anything */
    whoReel.addEventListener("loadeddata", whoArm);

    if (whoReel.readyState >= 1) whoNoteDuration();   /* HAVE_METADATA */
    if (whoReel.readyState >= 2) whoArm();            /* HAVE_CURRENT_DATA */
    whoReel.addEventListener("seeked", function () {
      whoSeeking = false;
      /* the reel is scrubbed rather than played, so a completed seek is the
         proof that there is a frame to look at. On a phone that proof is not
         quite good enough on its own — see whoPainted below — so there the
         reel is only shown once a frame has actually been presented. */
      if (!mqFlow.matches) whoShow();
      /* a newer target arrived while we were seeking — chase it */
      if (whoWant >= 0 && Math.abs(whoWant - whoReel.currentTime) > 0.04) seekWho(whoWant);
    });
    whoReel.addEventListener("playing", whoShow);
    whoReel.addEventListener("error", whoHide);

    /* `whoSeeking` is what stops a scrub from queueing seeks faster than the
       decoder retires them, but it is a latch: if a seek is ever dropped
       without firing `seeked`, it stays raised and every later seek bails,
       killing the scrub for the rest of the session. So it expires. */
    var whoSeekAt = 0;
    function seekWho(t) {
      if (whoReel.readyState < 2) return;
      if (whoSeeking && Date.now() - whoSeekAt < 600) return;
      whoSeeking = true;
      whoSeekAt = Date.now();
      try { whoReel.currentTime = t; } catch (e) { whoSeeking = false; }
    }

    /* ---------- phones scrub too, but off their own progress ----------
       This clip used to loop on a phone, on the assumption that mobile
       browsers seek too erratically to scrub. Measured, they do not: the
       file is 1MB at 480x656 and fully buffered, and a seek completes in
       2-8ms. What is genuinely different on a phone is WHAT the scrub should
       follow. Desktop rides `beat.__p`, but the beat there is pinned; on a
       phone it flows, and its progress reaches 1.000 while the reel is still
       400px down the screen — reuse that and the clip would finish before
       the reader ever saw it. So the phone scrub rides the reel's own
       traverse of the viewport instead, and the clip plays out across
       exactly the stretch of scrolling where the reel is on screen. */
    var whoPainted = false;

    /* A completed seek is not quite proof of a visible frame on a phone:
       iOS can settle a seek on a video whose decoder it never woke, which is
       how `is-ready` once dimmed the still behind a frame that never
       arrived. requestVideoFrameCallback fires only when a frame is actually
       presented, so where it exists that is the signal; elsewhere a
       completed seek is the best available and is taken at its word. */
    function whoFramePainted() {
      if (whoPainted) return;
      whoPainted = true;
      whoShow();
    }
    if (mqFlow.matches) {
      if (whoReel.requestVideoFrameCallback) {
        whoReel.requestVideoFrameCallback(whoFramePainted);
      } else {
        whoReel.addEventListener("seeked", whoFramePainted, { once: true });
      }
    }

    if (mqFlow.matches) {
      whoReel.loop = false;

      /* the loop is what the phone falls back to if scrubbing never produces
         a frame — a section that plays is better than a section that does
         not move at all */
      var whoLooping = false;
      var whoTry = function () {
        var pr = whoReel.play();
        if (pr && pr.catch) pr.catch(function () {
          /* refused: leave the still at full strength rather than dimming it
             behind a frame that will never move */
          whoHide();
        });
      };
      var whoFallBackToLoop = function () {
        if (whoLooping || whoPainted || whoReel.readyState < 2) return;
        whoLooping = true;
        whoReel.loop = true;
        whoTry();
      };

      /* iOS will not paint a frame for a video it has never played, so the
         decoder is woken with a muted play that is stopped as soon as it
         starts. That is also what makes the first seek land. Only once
         there is data: calling play() on an empty element would force it to
         load the network source we are deliberately not using. */
      var whoWake = function () {
        if (whoLooping || whoReel.readyState < 2) return;
        var pr = whoReel.play();
        if (pr && pr.then) {
          pr.then(function () { if (!whoLooping) whoReel.pause(); })
            .catch(function () { /* refused — the seek path may still work */ });
        }
      };

      /* The fallback has to be timed from the moment the clip is READY, not
         from the moment the section appears. Timed from the section, it fired
         while the local copy was still downloading, latched whoLooping, and
         so guaranteed the very outcome it exists to avoid — the scrub was
         switched off before it had a chance to run at all. */
      whoReel.addEventListener("loadeddata", function () {
        whoWake();
        window.setTimeout(whoFallBackToLoop, 1800);
      });

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) { if (whoLooping && !whoReel.paused) whoReel.pause(); return; }
            whoWake();
          });
        }, { threshold: 0.15 }).observe(whoReel);
      } else {
        whoWake();
      }

      /* iOS refuses a scripted play in Low Power Mode but allows one raised
         inside a gesture, so the reader's first touch is a second chance */
      ["touchstart", "click"].forEach(function (ev) {
        var once = function () {
          document.removeEventListener(ev, once);
          if (whoLooping && whoReel.paused) whoTry();
          else if (!whoPainted) whoWake();
        };
        document.addEventListener(ev, once, { passive: true });
      });
    }

    CF.scrubWho = function () {
      if (!whoDur) return;
      var p;
      if (mqFlow.matches) {
        if (whoLooping) return;            /* playing itself, not scrubbed */
        var r = whoReel.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        /* 0 as the reel clears the bottom edge, 1 once it has left the top */
        p = (vh * 0.92 - r.top) / (r.height + vh * 0.55);
      } else {
        if (!whoBeat || whoBeat.__p === undefined) return;
        p = whoBeat.__p;
        /* hold the first and last beats of the clip either side of the scrub */
        p = (p - 0.08) / 0.78;
      }
      var t = Math.max(0, Math.min(1, p)) * (whoDur - 0.05);
      if (Math.abs(t - whoWant) < 0.03) return;
      whoWant = t;
      seekWho(t);
    };
  }

  /* ---------- leadership rail ---------- */
  if (!reduced) {
    var lead = document.querySelector(".leadrail");
    if (lead) autoRail(lead, ".leadrail__track");
  }

  /* ---------- event photos: the scroll-driven fan, with arrows ----------
     The deck fans open as the page scrolls (--fan is written in the frame
     loop); the arrows swap which four prints it is holding. */
  var fan = document.getElementById("photoFan");
  if (fan) {
    /* [l, r, l2, r2, centre] — the four real Cairo FACE images the client
       supplied. Four prints across five slots, so one repeats per set; the
       repeat always sits in an outer slot, never beside its twin. */
    var SETS = [
      ["img/ev-artwork.jpg?v=164", "img/ev-dates.jpg?v=164", "img/ev-abstract.jpg?v=164", "img/ev-artwork.jpg?v=164", "img/ev-hero.jpg?v=164"],
      ["img/ev-hero.jpg?v=164", "img/ev-artwork.jpg?v=164", "img/ev-abstract.jpg?v=164", "img/ev-hero.jpg?v=164", "img/ev-dates.jpg?v=164"],
      ["img/ev-abstract.jpg?v=164", "img/ev-hero.jpg?v=164", "img/ev-dates.jpg?v=164", "img/ev-abstract.jpg?v=164", "img/ev-artwork.jpg?v=164"]
    ];
    var order = [".photo-fan--l", ".photo-fan--r", ".photo-fan--l2", ".photo-fan--r2"];
    SETS.forEach(function (set) { set.forEach(function (src) { new Image().src = src; }); });
    var setIdx = 0, swapping = false;

    /* The arrows used to cross-fade the prints in place, which read as a
       flicker rather than as paging through a deck. Now the whole deck
       travels: it slides out the way you are going, the images are swapped
       while it is off screen, and it comes back in from the other side.
       The slide rides the independent `translate` property, so it composes
       with the fan's own scroll-scrubbed `transform` instead of fighting it. */
    function showSet(i, dir) {
      if (swapping) return;
      swapping = true;
      var out = dir < 0 ? "is-out-prev" : "is-out-next";
      var back = dir < 0 ? "is-in-prev" : "is-in-next";
      setIdx = (i + SETS.length) % SETS.length;
      var set = SETS[setIdx];

      fan.classList.add("is-swapping", out);
      setTimeout(function () {
        order.forEach(function (sel, n) {
          var el = fan.querySelector(sel);
          if (el) el.style.backgroundImage = 'url("' + set[n] + '")';
        });
        var hero = fan.querySelector("img");
        if (hero) hero.src = set[4];

        /* jump to the far side without animating, then let it travel back */
        fan.classList.remove(out);
        fan.classList.add("is-jump", back);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            fan.classList.remove("is-jump", back, "is-swapping");
            swapping = false;
          });
        });
      }, 420);
    }
    document.querySelectorAll('[data-fan="#photoFan"] [data-dir]').forEach(function (b) {
      b.addEventListener("click", function () {
        var d = +b.dataset.dir;
        showSet(setIdx + d, d);
      });
    });
  }

  /* ---------- testimonials drift on their own ---------- */
  (function () {
    var rail = document.getElementById("quoteRail");
    if (!rail || reduced) return;
    var t = null, paused = false;
    function tick() {
      if (paused || rail.hidden) return;
      var atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
      rail.scrollTo({ left: atEnd ? 0 : rail.scrollLeft + rail.clientWidth * 0.8, behavior: "smooth" });
    }
    function start() { clearInterval(t); t = setInterval(tick, 5200); }
    ["pointerenter", "focusin", "touchstart"].forEach(function (e) {
      rail.addEventListener(e, function () { paused = true; }, { passive: true });
    });
    ["pointerleave", "focusout", "touchend"].forEach(function (e) {
      rail.addEventListener(e, function () { paused = false; }, { passive: true });
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (e) { e.isIntersecting ? start() : clearInterval(t); });
      }, { threshold: 0.25 }).observe(rail);
    } else { start(); }
  })();

  /* ---------- self-running rails ----------
     The faculty carousel and the sponsor/partner rails scroll themselves.
     Each track is duplicated once so translateX(-50%) loops seamlessly, and
     pointing at (or touching) a card pauses it. */
  function autoRail(rail, trackSel) {
    var track = rail.querySelector(trackSel);
    if (!track || track.dataset.looped) return;
    var originals = Array.prototype.slice.call(track.children);
    if (!originals.length) return;
    originals.forEach(function (el) {
      var copy = el.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      copy.tabIndex = -1;
      track.appendChild(copy);
    });
    track.dataset.looped = "1";
    var dur = parseInt(rail.getAttribute("data-speed"), 10);
    if (dur) track.style.setProperty("--dur", dur + "s");
    /* touch: hold to stop on a card, release to resume */
    var hold = function () { rail.classList.add("is-held"); };
    var free = function () { rail.classList.remove("is-held"); };
    rail.addEventListener("touchstart", hold, { passive: true });
    rail.addEventListener("touchend", free, { passive: true });
    rail.addEventListener("touchcancel", free, { passive: true });
  }
  if (!reduced) {
    var docRail = document.querySelector(".docrail");
    if (docRail) autoRail(docRail, ".docrail__track");
    document.querySelectorAll(".logorail").forEach(function (r) { autoRail(r, ".logorail__track"); });
  }

  /* ---------- testimonials: video / written ---------- */
  var voiceTabs = document.getElementById("voiceTabs");
  if (voiceTabs) {
    var voiceNav = document.getElementById("voiceNav");
    voiceTabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".ptab");
      if (!btn) return;
      var set = btn.dataset.tset;
      voiceTabs.querySelectorAll(".ptab").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll("[data-tpanel]").forEach(function (p) {
        var show = p.dataset.tpanel === set;
        p.hidden = !show;
        if (show) revealWithin(p);
      });
      /* the arrows drive whichever rail is showing */
      if (voiceNav) voiceNav.dataset.rail = set === "written" ? "#writtenRail" : "#quoteRail";
    });
  }


  /* ---------- scene directors: hovered items steer their scene ---------- */
  [["whoscene", ".whoitem", "data-focus"], ["gainscene", ".gitem", "data-glow"]].forEach(function (cfg) {
    var scene = document.getElementById(cfg[0]);
    if (!scene) return;
    var items = scene.querySelectorAll(cfg[1]);
    items.forEach(function (it) {
      function on() {
        scene.setAttribute(cfg[2], it.getAttribute(cfg[2]));
        items.forEach(function (o) { o.classList.toggle("is-focus", o === it); });
      }
      function off() {
        scene.removeAttribute(cfg[2]);
        items.forEach(function (o) { o.classList.remove("is-focus"); });
      }
      it.addEventListener("pointerenter", on);
      it.addEventListener("pointerleave", off);
      it.addEventListener("focus", on);
      it.addEventListener("blur", off);
    });
  });


  /* ---------- the gain chapters light as you scroll past them ----------
     Hover only tells the story to someone with a pointer who happens to move
     it over the list. Reading the section top to bottom should be enough: the
     chapter nearest the reading line becomes the live one, its marker lights
     on the face, and the face itself leans toward that marker.

     Scroll-driven, not rAF-driven — a dropped frame here would leave the
     wrong chapter lit for the rest of the section. */
  (function gainScroll() {
    var scene = document.getElementById("gainscene");
    if (!scene || reduced) return;
    var items = [].slice.call(scene.querySelectorAll(".gitem"));
    var stage = scene.querySelector(".gainscene__stage");
    var svg = scene.querySelector(".gv-map");
    if (!items.length) return;

    var hovering = false, queued = false, current = null;
    /* The pointer only wins while it is on a CHAPTER. Watching the whole
       scene meant simply moving the mouse into the section — over the face,
       or into the gap between two chapters — froze the scroll-driven glow on
       whatever happened to be lit at the time. */
    /* Hover wins only while the pointer is actually MOVING over a chapter.
       Latching on pointerenter meant a cursor left resting on the list froze
       the whole section: every chapter scrolled past underneath it while the
       glow stayed on whichever one the mouse happened to be over. Scrolling
       is an intent of its own, so it clears the latch (see queue). */
    items.forEach(function (it) {
      it.addEventListener("pointermove", function () {
        hovering = true;
        if (current === it) return;
        current = it;
        var k = it.getAttribute("data-glow");
        scene.setAttribute("data-glow", k);
        items.forEach(function (o) { o.classList.toggle("is-focus", o === it); });
        var org = markerOrigin(k);
        if (org && stage) {
          stage.style.setProperty("--face-x", org.x);
          stage.style.setProperty("--face-y", org.y);
        }
      });
      it.addEventListener("pointerleave", function () { hovering = false; });
    });

    /* where each marker sits, as a share of the stage — the face zooms toward
       whichever one is live, so the movement means something */
    /* A line from the live chapter to its point on the face. The two halves
       of this section were only related by colour before — this says which
       card belongs to which mark, which was the whole idea of putting the
       chapters on a face. Drawn in SVG user units matched to the scene box,
       so it survives any column width. */
    var connect = document.getElementById("gconnect");

    function drawConnector(card, key) {
      if (!connect || !svg) return;
      if (window.matchMedia("(max-width: 900px)").matches) { connect.style.opacity = 0; return; }
      var core = svg.querySelector('.gpt[data-pt="' + key + '"] .gpt__core');
      if (!core) return;
      var sr = scene.getBoundingClientRect();
      var mr = core.getBoundingClientRect();
      var cr = card.getBoundingClientRect();
      connect.setAttribute("viewBox", "0 0 " + Math.round(sr.width) + " " + Math.round(sr.height));

      var x1 = mr.left + mr.width / 2 - sr.left, y1 = mr.top + mr.height / 2 - sr.top;
      var x2 = cr.left - sr.left - 10, y2 = cr.top + 26 - sr.top;
      /* a flat-ish S so it reads as a leader line, not a swoosh */
      var mid = x1 + (x2 - x1) * 0.55;
      var d = "M" + x1.toFixed(1) + " " + y1.toFixed(1) +
              " C" + mid.toFixed(1) + " " + y1.toFixed(1) +
              " " + mid.toFixed(1) + " " + y2.toFixed(1) +
              " " + x2.toFixed(1) + " " + y2.toFixed(1);
      connect.querySelector(".gconnect__line").setAttribute("d", d);
      var end = connect.querySelector(".gconnect__end");
      end.setAttribute("cx", x2.toFixed(1));
      end.setAttribute("cy", y2.toFixed(1));
      connect.style.opacity = "";
    }

    function markerOrigin(key) {
      if (!svg) return null;
      var g = svg.querySelector('.gpt[data-pt="' + key + '"] .gpt__core');
      if (!g) return null;
      var vb = svg.viewBox.baseVal;
      if (!vb || !vb.width) return null;
      return {
        x: (parseFloat(g.getAttribute("cx")) / vb.width * 100).toFixed(1) + "%",
        y: (parseFloat(g.getAttribute("cy")) / vb.height * 100).toFixed(1) + "%"
      };
    }

    var list = scene.querySelector(".gchapters");
    /* deliberately uneven: equal rates would read as one moving block */
    var PAR = [0.020, 0.055, 0.032, 0.068, 0.042];

    function pick() {
      queued = false;
      if (hovering) return;                       /* the pointer wins while it is there */

      /* Picking the chapter nearest a reading line sounds right and is not:
         at the top of the section only the first chapter is on screen, so it
         wins for as long as it takes the rest to arrive. Measured, chapter 01
         owned 540px of scroll and 05 owned 450, while 02, 03 and 04 got about
         115px each — they flickered past, and a normal scroll could skip one
         entirely. Divide the list's own travel evenly instead: each chapter
         owns exactly its share, in order, every time. */
      var best = null;
      if (list) {
        var lr = list.getBoundingClientRect();
        var line = window.innerHeight * 0.45;
        var prog = lr.height > 0 ? (line - lr.top) / lr.height : -1;
        if (prog >= -0.12 && prog <= 1.12) {
          var slot = Math.max(0, Math.min(0.999, prog)) * items.length;
          var idx = Math.floor(slot);
          best = items[idx] || null;
          /* --gp is this chapter's OWN progress, 0 to 1 across its share of
             the scroll. Every layer's animation is expressed against it, so
             the contour draws, the scan travels and the orbit turns exactly
             as far as the reader has scrolled — nothing runs on a timer of
             its own. */
          scene.style.setProperty("--gp", (slot - idx).toFixed(4));
        }
      }

      /* Each card arrives on its own, and keeps drifting after it has.
         --ip is the card's entry, 0 to 1 against its own position, so they
         come in one at a time rather than all together on the section's
         progress. --pary is the parallax: every card carries a different
         coefficient, so they travel at different rates against the scroll
         and the column has depth instead of moving as one slab. */
      var vh = window.innerHeight;
      for (var n = 0; n < items.length; n++) {
        var ir = items[n].getBoundingClientRect();
        if (ir.bottom < -vh || ir.top > vh * 1.6) continue;
        var ip = (vh * 0.94 - ir.top) / (vh * 0.40);
        ip = ip < 0 ? 0 : ip > 1 ? 1 : ip;
        ip = ip * ip * (3 - 2 * ip);                 /* ease it in */
        items[n].style.setProperty("--ip", ip.toFixed(3));
        var centre = (ir.top + ir.bottom) / 2 - vh / 2;
        var k = PAR[n % PAR.length];
        items[n].style.setProperty("--pary", (-centre * k).toFixed(1) + "px");
      }

      if (!best) {
        if (current) { scene.removeAttribute("data-glow"); items.forEach(function (o) { o.classList.remove("is-focus"); }); current = null; }
        return;
      }
      if (best === current) return;
      current = best;
      var key = best.getAttribute("data-glow");
      scene.setAttribute("data-glow", key);
      drawConnector(best, key);
      items.forEach(function (o) { o.classList.toggle("is-focus", o === best); });
      var o = markerOrigin(key);
      if (o && stage) {
        stage.style.setProperty("--face-x", o.x);
        stage.style.setProperty("--face-y", o.y);
      }
    }

    function queue() {
      if (queued) return;
      queued = true;
      window.setTimeout(pick, 90);
    }
    /* scrolling is its own intent — it releases a parked pointer's hold */
    window.addEventListener("scroll", function () {
      hovering = false;
      pick();                 /* cheap: one rect read and two style writes */
    }, { passive: true });
    window.addEventListener("resize", function () {
      if (current) drawConnector(current, current.getAttribute("data-glow"));
      queue();
    }, { passive: true });
    queue();
  })();


  /* ---------- mobile life: timed type waves + scenes that breathe ----------
     Small screens lack the long scrub distances and hover states that make
     desktop feel alive. Instead: headings settle as a timed character wave
     the moment they enter, and the two scene sections cycle their focus on
     their own while in view (a tap still directs them). */
  if (mqFlow.matches && !reduced && "IntersectionObserver" in window) {
    var waveIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        waveIO.unobserve(e.target);
        e.target.__waveDone = true;
        var chars = e.target.querySelectorAll(".ch");
        chars.forEach(function (ch2, i) {
          ch2.style.transitionDelay = Math.min(i * 24, 1500) + "ms";
          ch2.classList.add("on");
        });
        setTimeout(function () {
          chars.forEach(function (ch2) { ch2.style.transitionDelay = ""; });
        }, 2400);
      });
    }, { threshold: 0.45 });
    document.querySelectorAll("[data-split], [data-split-progress]").forEach(function (el) {
      waveIO.observe(el);
    });

    [["whoscene", ".whoitem", "data-focus"], ["gainscene", ".gitem", "data-glow"]].forEach(function (cfg) {
      var scene = document.getElementById(cfg[0]);
      if (!scene) return;
      var items = scene.querySelectorAll(cfg[1]);
      var idx = 0, timer = null;
      function step() {
        var it = items[idx % items.length];
        idx++;
        scene.setAttribute(cfg[2], it.getAttribute(cfg[2]));
        items.forEach(function (o) { o.classList.toggle("is-focus", o === it); });
      }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !timer) {
            step();
            timer = setInterval(step, 3200);
          } else if (!e.isIntersecting && timer) {
            clearInterval(timer); timer = null;
            scene.removeAttribute(cfg[2]);
            items.forEach(function (o) { o.classList.remove("is-focus"); });
          }
        });
      }, { threshold: 0.2 }).observe(scene);
    });
  }


  /* ---------- the split headlines always finish ----------
     A headline is lit by one of two paths, and both can stall. The mobile
     wave rides an IntersectionObserver, which drops callbacks under fast
     momentum scrolling; the scrub rides the rAF loop, which the browser
     throttles whenever it decides the page is not worth the frames. Either
     way the reader is left looking at a line that stopped halfway — and an
     unlit character sits at a fraction of full ink on a shifted baseline,
     so a stalled headline does not read as an effect in flight. It reads as
     broken text.

     So, on phones, a plain scroll listener that owes nothing to rAF or to
     IntersectionObserver finishes any headline that has settled into the
     reading half of the screen. The wave still plays whenever it is
     keeping up; this only ever collects what it dropped. Desktop is left
     alone: there the headline is scrubbed against scroll position on
     purpose, and a partly lit line is the reader's own place in the scrub.
     ---------------------------------------------------------------- */
  if (mqFlow.matches && !reduced) {
    var unfinished = beatSplits.concat(tailSplits);
    var sweepQueued = false;

    var sweepSplits = function () {
      sweepQueued = false;
      for (var i = unfinished.length - 1; i >= 0; i--) {
        var s = unfinished[i];
        if (s.el.__waveDone && s.lit >= s.chars.length) { unfinished.splice(i, 1); continue; }
        if (s.el.getBoundingClientRect().top > vh * 0.55) continue;
        s.el.__waveDone = true;            /* the scrub must stop overwriting it */
        s.lit = s.chars.length;
        for (var k = 0; k < s.chars.length; k++) s.chars[k].classList.add("on");
        unfinished.splice(i, 1);
      }
      if (!unfinished.length) {
        window.removeEventListener("scroll", queueSweep);
        window.removeEventListener("resize", queueSweep);
      }
    };

    var queueSweep = function () {
      if (sweepQueued) return;
      sweepQueued = true;
      /* late enough that the wave gets its run at the headline first */
      window.setTimeout(sweepSplits, 420);
    };

    window.addEventListener("scroll", queueSweep, { passive: true });
    window.addEventListener("resize", queueSweep, { passive: true });
    queueSweep();
  }


  /* ---------- mobile side menu ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var sidemenu = document.getElementById("sidemenu");
  if (menuBtn && sidemenu) {
    var setMenu = function (open) {
      document.body.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      sidemenu.setAttribute("aria-hidden", open ? "false" : "true");
    };
    menuBtn.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });
    sidemenu.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]") || e.target.closest("a")) setMenu(false);
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
    });
  }

  /* ---------- the one scroll loop ---------- */
  var header = document.getElementById("header");
  var menuPill = document.getElementById("menuPill");
  var footFace = document.querySelector(".section-face--footer");
  var photoFan = document.querySelector(".photo-feature");
  var parEls = [];
  document.querySelectorAll("[data-par]").forEach(function (el) {
    parEls.push({ el: el, k: parseFloat(el.getAttribute("data-par")) || 0 });
  });
  var heroSec = document.getElementById("hero");
  /* .btn-ghost was missing, so the floating pill never stepped aside for a
   section's secondary action and sat on top of it — "Become a sponsor",
   "Explore the programme" and the rest. */
  var pageCtas = document.querySelectorAll("main .btn-pill, main .pill-sm, main .btn-ghost, main .photo-feature__cta");
  var heroBeat = heroSec ? heroSec.querySelector("[data-beat]") : null;
  var activeIdx = -1;

  function frame() {
    CF.y = window.scrollY;
    var sample = CF.y + vh * 0.5;

    /* depth: the header gains weight in motion; the footer contour drifts
       on its own plane */
    if (menuPill) menuPill.classList.toggle("scrolling", CF.y > 5);
    /* mobile depth: tagged layers drift by their distance to centre frame */
    if (!reduced && mqFlow.matches) {
      for (var pe2 = 0; pe2 < parEls.length; pe2++) {
        var pr2 = parEls[pe2].el.getBoundingClientRect();
        if (pr2.bottom < -60 || pr2.top > vh + 60) continue;
        parEls[pe2].el.style.setProperty("--pary",
          (((pr2.top + pr2.bottom) / 2 - vh / 2) * parEls[pe2].k).toFixed(1) + "px");
      }
    }
    if (photoFan && !reduced) {
      var pfr = photoFan.getBoundingClientRect();
      if (pfr.bottom > -80 && pfr.top < vh + 80) {
        var fp = Math.max(0, Math.min(1, (vh * 0.92 - pfr.top) / (vh * 0.72)));
        fp = fp * fp * (3 - 2 * fp); /* eased spread */
        var fp2 = Math.max(0, Math.min(1, (fp - 0.22) / 0.78)); /* the right print deals a beat later */
        fp2 = fp2 * fp2 * (3 - 2 * fp2);
        photoFan.style.setProperty("--fan", fp.toFixed(3));
        photoFan.style.setProperty("--fan2", fp2.toFixed(3));
      }
    }
    if (footFace && !reduced) {
      var fr = footFace.getBoundingClientRect();
      if (fr.bottom > 0 && fr.top < vh) {
        footFace.style.setProperty("--par", (((fr.top + fr.bottom) / 2 - vh / 2) * -0.06).toFixed(1) + "px");
      }
    }

    /* active scene */
    var idx = -1;
    for (var i = 0; i < CF.scenes.length; i++) {
      var s = CF.scenes[i];
      if (sample >= s.top && sample < s.top + s.height) { idx = i; break; }
    }
    var inTail = sample >= CF.tailTop || (idx === -1 && CF.y > vh);
    var key = inTail ? "tail" : idx >= 0 ? CF.scenes[idx].key : "hero";

    if (inTail) {
      if (activeIdx !== 99) {
        activeIdx = 99;
        header.dataset.theme = CF.y + 80 >= document.querySelector(".footer").offsetTop ? "dark" : "light";
        document.body.dataset.sceneTheme = "light";
        railDots.forEach(function (d, j) { d.setAttribute("aria-current", j === railDots.length - 1 ? "true" : "false"); });
      }
      /* footer flips the header back to dark as it arrives */
      header.dataset.theme = CF.y + 100 >= document.querySelector(".footer").offsetTop - vh * 0.5 ? "dark" : "light";
    } else if (idx !== activeIdx && idx >= 0) {
      activeIdx = idx;
      header.dataset.theme = CF.scenes[idx].theme === "dark" ? "dark" : "light";
      document.body.dataset.sceneTheme = CF.scenes[idx].theme;
      railDots.forEach(function (d, j) { d.setAttribute("aria-current", j === idx ? "true" : "false"); });
    }
    swapPill(key);
    /* the floating pill steps aside in scenes that carry their own CTAs,
       and whenever it would physically overlap any section button */
    if (stack) {
      var pillHide = key === "hero" || key === "plan";
      if (!pillHide) {
        var sr = stack.getBoundingClientRect();
        for (var pc = 0; pc < pageCtas.length; pc++) {
          var cr = pageCtas[pc].getBoundingClientRect();
          if (cr.bottom > sr.top - 28 && cr.top < sr.bottom + 28 &&
              cr.right > sr.left - 28 && cr.left < sr.right + 28) { pillHide = true; break; }
        }
      }
      stack.classList.toggle("pillstack--hidden", pillHide);
    }
    /* the hero's second act takes the clicks once it holds the stage */
    if (heroBeat) heroSec.classList.toggle("hero--p2", (heroBeat.__p || 0) > 0.28);

    /* beats: progress var + splits */
    if (!reduced && !document.body.classList.contains("film-flat-static")) {
      beatEls.forEach(function (b) {
        var r = b.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;
        var denom = r.height - vh;
        /* pinned beats scrub by pin distance; flowing beats (static inner)
           and beats shorter than the viewport reveal by entry instead */
        var p = !b.__flow && denom > 40
          ? -r.top / denom
          : (vh * 0.88 - r.top) / Math.max(Math.min(r.height * 0.9, vh * 0.75), 1);
        p = Math.max(0, Math.min(1, p));
        /* desktop tracked raw scroll 1:1, which reads as stiff next to the
           transition-eased mobile build — ease --bp toward its target */
        if (!mqFlow.matches) {
          var prev = b.__p === undefined ? p : b.__p;
          p = prev + (p - prev) * 0.18;
          if (Math.abs(p - prev) < 0.0005) p = prev;
        }
        b.style.setProperty("--bp", p.toFixed(3));
        b.__p = p;
      });
      /* the who-scene reel rides the beat progress just written above */
      if (CF.scrubWho) CF.scrubWho();
      beatSplits.forEach(function (s) {
        if (s.el.__waveDone) return;
        var p = s.beat && s.beat.__p !== undefined ? s.beat.__p : 1;
        var lit = Math.round(Math.max(0, Math.min(1, (p - 0.06) / 0.42)) * s.chars.length);
        if (lit === s.lit) return;
        s.lit = lit;
        for (var k = 0; k < s.chars.length; k++) s.chars[k].classList.toggle("on", k < lit);
      });
      tailSplits.forEach(function (s) {
        if (s.el.__waveDone) return;
        var r = s.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = Math.max(0, Math.min(1, (vh * 0.88 - r.top) / (r.height + vh * 0.4)));
        var lit = Math.round(p * s.chars.length * 1.08);
        if (lit === s.lit) return;
        s.lit = lit;
        for (var k = 0; k < s.chars.length; k++) s.chars[k].classList.toggle("on", k < lit);
      });
    }

    requestAnimationFrame(frame);
  }

  if (reduced) {
    document.querySelectorAll(".ch").forEach(function (c) { c.classList.add("on"); });
  }

  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  requestAnimationFrame(frame);

  /* ---------- back to top ---------- */
  var toTop = document.getElementById("to-top");
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
  }
})();
