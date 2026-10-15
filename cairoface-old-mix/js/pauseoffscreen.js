/* Cairo FACE — animations only run where they can be seen.

   The scenes carry a lot of ambient motion: SVG contour lines breathing,
   glints twinkling, hazes drifting, sheens sliding across text. SVG and
   background-position animations run on the main thread, and they kept
   running for scenes thousands of pixels away — 46 live animations while the
   reader sat at the FAQ. This tags each section .is-offscreen when it is a
   screen or more away from the viewport, and the stylesheet pauses
   everything inside it. Scrolling back resumes from the same frame. */
(function () {
  "use strict";
  if (!("IntersectionObserver" in window)) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      e.target.classList.toggle("is-offscreen", !e.isIntersecting);
    });
  }, { rootMargin: "60% 0px 60% 0px" });

  document.querySelectorAll("main > section").forEach(function (s) { io.observe(s); });
})();
