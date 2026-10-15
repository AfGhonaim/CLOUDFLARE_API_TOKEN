/* Cairo FACE — "Meet our experts" lands itself.

   The faculty rail used to be a marquee that never stopped. It is now one
   motion that plays once, and the section is read in two phases that the
   page scrolls to on its own: one wheel gesture lands the heading, the next
   lands the cards, the next carries on down the page.

   Only wheel input on a fine pointer is steered. Touch keeps native scrolling
   (hijacking a swipe fights the browser) and simply plays the reveal when the
   rail comes into view. Reduced motion shows everything at once. */
(function () {
  "use strict";

  var sec = document.getElementById("speakers");
  var rail = sec && sec.querySelector(".docrail");
  if (!rail) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;

  var cards = rail.querySelectorAll(".scard");
  cards.forEach(function (c, i) { c.style.setProperty("--i", Math.min(i, 8)); });

  function land() { rail.classList.add("is-landed"); [].forEach.call(cards, function (c) { c.classList.add("seen"); }); }

  if (reduced || !("IntersectionObserver" in window)) { land(); return; }
  new IntersectionObserver(function (en, io) {
    if (en[0].isIntersecting) { io.disconnect(); land(); }
  }, { threshold: 0.35 }).observe(rail);

  if (!fine) return;

  var navClear = function () { return window.innerWidth <= 768 ? 92 : 108; };
  var locked = 0;

  /* the two stops: heading at the top of the viewport, cards centred */
  function stops() {
    var top = sec.getBoundingClientRect().top + window.scrollY;
    var r = rail.getBoundingClientRect();
    var railMid = r.top + window.scrollY + r.height / 2;
    return {
      head: Math.max(0, Math.round(top - navClear() + 2)),
      cards: Math.max(0, Math.round(railMid - window.innerHeight / 2))
    };
  }

  window.addEventListener("wheel", function (e) {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    var now = performance.now();

    /* mid-flight, and while trackpad inertia is still trickling in, the page
       belongs to the landing */
    if (now < locked) { e.preventDefault(); locked = Math.max(locked, now + 140); return; }
    if (Math.abs(e.deltaY) < 4) return;

    var st = stops(), y = window.scrollY, zone = window.innerHeight * 0.6, to = null;
    if (e.deltaY > 0) {
      if (y < st.head - 8 && y > st.head - zone) to = st.head;
      else if (Math.abs(y - st.head) <= 12) to = st.cards;
    } else {
      if (y > st.cards + 8 && y < st.cards + zone) to = st.cards;
      else if (Math.abs(y - st.cards) <= 12) to = st.head;
    }
    if (to === null) return;

    e.preventDefault();
    locked = now + 950;
    window.scrollTo({ top: to, behavior: "smooth" });
  }, { passive: false });
})();
