/* Cairo FACE — page transition. The facial-contour motif draws itself over a
   navy curtain while the next page loads, then lifts on arrival. */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var veil = document.createElement("div");
  veil.className = "pageout";
  veil.setAttribute("aria-hidden", "true");
  veil.innerHTML =
    '<div class="pageout__logo">' +
      '<img src="img/logo-white.png" alt="" />' +
      '<span class="pageout__sheen"></span>' +
    '</div>' +
    '<span class="pageout__bar"><span></span></span>';
  document.body.appendChild(veil);

  function leaving(url) {
    veil.classList.add("is-on");
    setTimeout(function () { window.location.href = url; }, 620);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || a.target === "_blank" ||
        /^(mailto:|tel:|javascript:)/.test(href)) return;
    if (a.origin && a.origin !== location.origin) return;  /* off-site: no curtain */
    e.preventDefault();
    leaving(a.href);
  });

  /* coming back via the bfcache must not leave the curtain down */
  window.addEventListener("pageshow", function () { veil.classList.remove("is-on"); });
})();
