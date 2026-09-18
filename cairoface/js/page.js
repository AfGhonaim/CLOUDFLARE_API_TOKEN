/* Cairo FACE — interior pages. Light companion to main.js: no film engine,
   just the nav, the speaker filters, the agenda tabs and the logo rails. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header + side menu ---------- */
  var pill = document.getElementById("menuPill");
  var header = document.getElementById("header");
  var dark = document.querySelector(".phero--dark");
  function onScroll() {
    if (pill) pill.classList.toggle("scrolling", window.scrollY > 5);
    /* the page hero is dark and the rest of the page is light — the nav has
       to follow, or its links sit dark-on-dark over the hero */
    if (header && dark) {
      var navBottom = pill ? pill.getBoundingClientRect().bottom : 92;
      header.dataset.theme = dark.getBoundingClientRect().bottom > navBottom ? "dark" : "light";
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  var menuBtn = document.getElementById("menuBtn");
  var side = document.getElementById("sidemenu");
  function setMenu(open) {
    if (!side) return;
    side.classList.toggle("is-open", open);
    side.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("menu-open", open);
    if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { setMenu(!side.classList.contains("is-open")); });
  if (side) side.addEventListener("click", function (e) { if (e.target.closest("[data-close]") || e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  var top = document.getElementById("to-top");
  if (top) top.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });

  /* ---------- self-running logo rails (same recipe as the landing page) ---------- */
  if (!reduced) {
    document.querySelectorAll(".logorail").forEach(function (rail) {
      var track = rail.querySelector(".logorail__track");
      if (!track || track.dataset.looped) return;
      Array.prototype.slice.call(track.children).forEach(function (el) {
        var c = el.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        track.appendChild(c);
      });
      track.dataset.looped = "1";
      var d = parseInt(rail.getAttribute("data-speed"), 10);
      if (d) track.style.setProperty("--dur", d + "s");
      rail.addEventListener("touchstart", function () { rail.classList.add("is-held"); }, { passive: true });
      rail.addEventListener("touchend", function () { rail.classList.remove("is-held"); }, { passive: true });
    });
  }

  /* ---------- speakers: search + faculty/session filters ----------
     "All speakers" sits beside the search box and is the resting state. The
     two filter rows below it are independent — Faculty (National /
     International) is the main cut, Session (Surgical / Non surgical) the
     secondary one — and each chip toggles, so tapping the active one returns
     that row to everything rather than stranding the reader in a filter they
     cannot clear. Whenever both rows are open, "All speakers" lights again. */
  var search = document.getElementById("spkSearch");
  if (search || document.querySelector("[data-filter]")) {
    var state = { scope: "all", kind: "all", q: "" };
    var allChip = document.getElementById("allChip");
    var count = document.getElementById("spkCount");

    function apply() {
      var shown = 0;
      document.querySelectorAll(".spk").forEach(function (card) {
        var ok = (state.scope === "all" || card.dataset.scope === state.scope) &&
                 (state.kind === "all" || card.dataset.kind === state.kind) &&
                 (!state.q || card.dataset.name.indexOf(state.q) > -1);
        if (ok) {
          /* re-trigger the entry so a filter change is something you SEE,
             not a grid that silently has fewer things in it */
          card.hidden = false;
          card.style.setProperty("--n", shown);
          card.classList.remove("spk--enter");
          void card.offsetWidth;
          card.classList.add("spk--enter");
          shown++;
        } else {
          card.hidden = true;
          card.classList.remove("spk--enter");
        }
      });
      /* a day heading with nothing left under it should go too */
      document.querySelectorAll(".dayband").forEach(function (b) {
        b.hidden = !b.querySelector(".spk:not([hidden])");
      });
      var empty = document.getElementById("spkEmpty");
      if (empty) empty.hidden = shown > 0;
      if (count) {
        count.textContent = shown === 0 ? "" :
          shown + (shown === 1 ? " speaker" : " speakers") +
          (state.scope === "all" && state.kind === "all" && !state.q ? "" : " shown");
      }
      if (allChip) {
        allChip.classList.toggle("is-on", state.scope === "all" && state.kind === "all");
      }
    }

    document.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var group = btn.dataset.filter;
        if (group === "all") {                      /* the reset */
          state.scope = "all"; state.kind = "all";
          document.querySelectorAll('[data-filter="scope"], [data-filter="kind"]')
            .forEach(function (b) { b.classList.remove("is-on"); });
          apply();
          return;
        }
        var already = btn.classList.contains("is-on");
        document.querySelectorAll('[data-filter="' + group + '"]').forEach(function (b) {
          b.classList.remove("is-on");
        });
        if (already) {
          state[group] = "all";                     /* tap again to clear */
        } else {
          btn.classList.add("is-on");
          state[group] = btn.dataset.val;
        }
        apply();
      });
    });

    if (search) search.addEventListener("input", function () {
      state.q = search.value.trim().toLowerCase();
      apply();
    });
    apply();
  }

  /* ---------- agenda: day + hall tabs ---------- */
  function tabs(btnAttr, panelSel, panelAttr) {
    document.querySelectorAll("[" + btnAttr + "]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var val = btn.getAttribute(btnAttr);
        document.querySelectorAll("[" + btnAttr + "]").forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-on", on);
          if (b.hasAttribute("role")) b.setAttribute("aria-selected", on ? "true" : "false");
        });
        document.querySelectorAll(panelSel).forEach(function (p) {
          p.hidden = p.getAttribute(panelAttr) !== val;
        });
      });
    });
  }
  tabs("data-day-btn", ".agday", "data-dayp");
  /* halls live inside every day panel, so switch them all together */
  document.querySelectorAll("[data-hall-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var val = btn.getAttribute("data-hall-btn");
      document.querySelectorAll("[data-hall-btn]").forEach(function (b) {
        b.classList.toggle("is-on", b === btn);
      });
      document.querySelectorAll(".aghall").forEach(function (p) {
        p.hidden = p.getAttribute("data-hall") !== val;
      });
    });
  });
})();
