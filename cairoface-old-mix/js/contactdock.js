/* Cairo FACE — the floating contact dock.

   It used to be two buttons always on screen, which meant a 48x108 block
   permanently sitting over the bottom-left of the content, and a previous
   attempt to hide it when something interactive was underneath made it
   flicker: eight fade-outs and back over one pass down the home page, and
   worse on a phone where momentum scrolling crosses those boundaries fast.

   So it is one button now. Collapsed it is a single 52px circle; tapping it
   opens WhatsApp and the phone number above it. A third of the footprint,
   nothing driven by scroll position, and nothing that can flicker. */
(function () {
  "use strict";

  var dock = document.getElementById("contactDock");
  var toggle = document.getElementById("contactDockToggle");
  var list = document.getElementById("contactDockList");
  if (!dock || !toggle || !list) return;

  var open = false;

  function set(state) {
    open = state;
    dock.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      list.hidden = false;
    } else {
      /* wait for the collapse to finish before pulling it out of the tree,
         or the buttons vanish instead of folding away */
      window.setTimeout(function () { if (!open) list.hidden = true; }, 240);
    }
  }

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    set(!open);
  });

  /* tapping anywhere else, or Escape, puts it away again */
  document.addEventListener("click", function (e) {
    if (!open) return;
    if (!dock.contains(e.target)) set(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) { set(false); toggle.focus(); }
  });
  /* following one of the links closes it too, so it is not left open behind
     a WhatsApp handoff when the reader comes back */
  list.addEventListener("click", function () { set(false); });
})();
