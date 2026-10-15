/* Cairo FACE — the event-photo gallery.

   The deck on the home page deals four prints and the reader could only ever
   see them at a slant, part-covered by each other. "See all photos" opens
   them full size in a dialog.

   These are real photographs from Cairo FACE 2026, taken from the summit's
   own Instagram posts (each cropped to its subject). Add higher-resolution originals to
   PHOTOS when the organisers supply them and nothing else needs to change. */
(function () {
  "use strict";

  var PHOTOS = [
    { src: "img/event/deck-man65.jpg", alt: "A speaker presenting at Cairo FACE World Summit 2026" },
    { src: "img/event/deck-curly.jpg", alt: "An attendee smiling during a session at Cairo FACE 2026" },
    { src: "img/event/deck-spk76.jpg", alt: "A speaker on stage at Cairo FACE 2026" },
    { src: "img/event/deck-entrance.jpg", alt: "An attendee arriving at the entrance of Cairo FACE 2026" },
    { src: "img/event/deck-exhib.jpg", alt: "Delegates in conversation on the Cairo FACE 2026 exhibition floor" },
    { src: "img/event/deck-nahai.jpg", alt: "A senior faculty member lecturing at Cairo FACE 2026" },
    { src: "img/event/deck-chin.jpg", alt: "An attendee listening in a session at Cairo FACE 2026" },
    { src: "img/event/deck-old52.jpg", alt: "A faculty member speaking at the podium, Cairo FACE 2026" },
    { src: "img/event/deck-sami.jpg", alt: "A speaker at the podium, Cairo FACE 2026" }
  ];

  var trigger = document.querySelector("[data-gallery]");
  var singles = document.querySelectorAll("[data-lightbox]");
  if (!trigger && !singles.length) return;

  /* SET is whichever list the opener asked for — the event deck, or a single
     image such as the exhibition floor plan. Everything below is the same
     dialog either way; paging simply has nowhere to go with one item. */
  var SET = PHOTOS;
  var lb = null, idx = 0, lastFocus = null;

  function show(i) {
    idx = (i + SET.length) % SET.length;
    var p = SET[idx];
    var img = lb.querySelector(".pgal__img");
    img.src = p.src;
    img.alt = p.alt;
    lb.querySelector(".pgal__count").textContent = (idx + 1) + " / " + SET.length;
    lb.querySelector(".pgal__cap").textContent = p.alt;
  }

  function close() {
    if (!lb) return;
    lb.classList.remove("vlb--in");
    document.body.classList.remove("vlb-open");
    document.removeEventListener("keydown", onKey);
    var gone = lb;
    lb = null;
    window.setTimeout(function () { if (gone.parentNode) gone.parentNode.removeChild(gone); }, 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowRight") { show(idx + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { show(idx - 1); e.preventDefault(); }
  }

  function open(start) {
    if (lb) return;
    lastFocus = document.activeElement;

    lb = document.createElement("div");
    lb.className = "vlb pgal";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Event photos");
    lb.innerHTML =
      '<div class="vlb__scrim" data-close></div>' +
      '<div class="pgal__frame">' +
        '<button class="vlb__close" data-close aria-label="Close photos">&times;</button>' +
        '<img class="pgal__img" alt="" />' +
        '<div class="pgal__bar">' +
          '<button class="circle-arrow pgal__nav" data-step="-1" aria-label="Previous photo">&#8592;</button>' +
          '<span class="pgal__count" aria-live="polite"></span>' +
          '<button class="circle-arrow pgal__nav" data-step="1" aria-label="Next photo">&#8594;</button>' +
        '</div>' +
        '<p class="pgal__cap"></p>' +
      '</div>';

    if (SET.length < 2) lb.querySelector(".pgal__bar").hidden = true;
    document.body.appendChild(lb);
    document.body.classList.add("vlb-open");
    show(start || 0);

    lb.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) { close(); return; }
      var step = e.target.closest("[data-step]");
      if (step) show(idx + (+step.getAttribute("data-step")));
    });
    document.addEventListener("keydown", onKey);

    /* one frame, so the opacity transition has a start state to run from */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { if (lb) lb.classList.add("vlb--in"); });
    });
    lb.querySelector(".vlb__close").focus();
  }

  if (trigger) {
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      SET = PHOTOS;
      open(0);
    });
  }

  Array.prototype.forEach.call(singles, function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      SET = [{ src: el.getAttribute("data-lightbox"), alt: el.getAttribute("data-alt") || "" }];
      open(0);
    });
  });

  /* the prints themselves open the gallery at the one that was tapped */
  if (trigger) PHOTOS.forEach(function (p, i) {
    var hero = document.querySelector('.photo-feature > img');
    if (i === 0 && hero) {
      hero.style.cursor = "zoom-in";
      hero.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); open(0); });
    }
  });
})();
