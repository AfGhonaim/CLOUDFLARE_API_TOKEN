/* Cairo FACE — the arrows that page a rail.

   This used to live inside main.js, which only index.html loads — so the
   moment a second page wanted arrows (the exhibition rails) the markup was
   there and nothing listened. It is its own file now, loaded by whichever
   page has a .railnav, rather than copied into page.js alongside it.

   Two kinds of rail, one control:
   · data-marquee — a CSS-animated track. There is no scroll to nudge, so the
     arrows step its animation-delay instead.
   · data-rail — a genuinely scrollable container, nudged by one card. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".railnav").forEach(function (nav) {
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dir]");
      if (!b) return;

      var mq = nav.getAttribute("data-marquee");
      var track = mq && document.querySelector(mq);
      /* a marquee that is not animating (phones swipe it natively) is just a scroller */
      if (track && getComputedStyle(track).animationName === "none") track = null;
      if (track) {
        var dur = parseFloat(getComputedStyle(track).animationDuration) || 72;
        var first = track.firstElementChild;
        var stepPx = first ? first.getBoundingClientRect().width + 20 : 300;
        var loopPx = track.getBoundingClientRect().width / 2;
        track.__off = (track.__off || 0) + (+b.dataset.dir) * (stepPx / loopPx) * dur;
        track.style.animationDelay = -track.__off + "s";
        return;
      }

      /* resolved per click: the testimonial tabs swap data-rail at runtime */
      var rail = document.querySelector(nav.getAttribute("data-rail"));
      if (!rail) return;
      var card = rail.firstElementChild;
      /* a rail whose only child is a flex track: the card is inside it */
      if (card && card.childElementCount > 1 && card.scrollWidth > rail.clientWidth * 1.2 && card.getBoundingClientRect().width > rail.clientWidth * 1.2) card = card.firstElementChild;
      var gapPx = card && card.parentElement ? (parseFloat(getComputedStyle(card.parentElement).columnGap) || 28) : 28;
      var step = card ? card.getBoundingClientRect().width + gapPx : rail.clientWidth * 0.8;
      /* the drift timer in main.js reads this so it stops fighting the arrows */
      rail.dataset.navAt = Date.now();
      var dir = +b.dataset.dir, max = rail.scrollWidth - rail.clientWidth;
      var beh = reduced ? "auto" : "smooth";
      /* wrap at the ends instead of leaving the arrow dead */
      if (dir > 0 && rail.scrollLeft >= max - 4) rail.scrollTo({ left: 0, behavior: beh });
      else if (dir < 0 && rail.scrollLeft <= 4) rail.scrollTo({ left: max, behavior: beh });
      else rail.scrollBy({ left: step * dir, behavior: beh });
    });
  });

  /* A tier with four sponsors in it does not scroll, so its arrows would be
     two dead buttons. Hide the control unless its rail actually overflows,
     and re-check on resize because the plates are fixed width. */
  var scrollNavs = [].slice.call(document.querySelectorAll(".railnav[data-rail]"));
  function syncNavs() {
    scrollNavs.forEach(function (nav) {
      var rail = document.querySelector(nav.getAttribute("data-rail"));
      nav.hidden = !rail || rail.scrollWidth - rail.clientWidth < 8;
    });
  }
  syncNavs();
  document.addEventListener("click", function (e) {
    if (e.target.closest("#voiceTabs")) setTimeout(syncNavs, 0);
  });
  window.addEventListener("resize", syncNavs);
  window.addEventListener("load", syncNavs);
})();
