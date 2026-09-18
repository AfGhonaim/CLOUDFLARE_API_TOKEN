/* Cairo FACE — person pop-up.
   Any link to doctor.html?id=… and any .spk card opens a dialog instead of a
   page load. Content comes from window.CF_DOCTORS; the person's real sessions
   are looked up in window.CF_AGENDA, which is fetched on first open so the
   18 KB programme is not loaded by every page. */
(function () {
  "use strict";

  var modal, panel, lastFocus = null, agendaWanted = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function norm(s) {
    return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  }

  /* every talk this person appears in, from the published programme */
  function sessionsFor(name) {
    var ag = window.CF_AGENDA;
    if (!ag) return null;
    var parts = norm(name).split(" ").filter(Boolean);
    if (parts.length < 2) return [];
    var first = parts[0], last = parts[parts.length - 1];
    var out = [];
    Object.keys(ag.halls).forEach(function (hall) {
      var groups = ag.halls[hall];
      Object.keys(groups).forEach(function (g) {
        groups[g].forEach(function (t) {
          var who = norm(t[3]);
          if (!who) return;
          if (who.indexOf(first) > -1 && who.indexOf(last) > -1) {
            out.push({ start: t[0], end: t[1], title: t[2], hall: hall, group: g });
          }
        });
      });
    });
    return out;
  }
  function t24(t) {
    var p = String(t).split(":"), h = parseInt(p[0], 10);
    if (h < 8) h += 12;
    return (h < 10 ? "0" : "") + h + ":" + p[1];
  }

  function ensure() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "pmodal";
    modal.id = "personModal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="pmodal__scrim" data-close></div>' +
      '<div class="pmodal__panel" role="dialog" aria-modal="true" aria-labelledby="pmName" tabindex="-1">' +
        '<button class="pmodal__x" type="button" data-close aria-label="Close">&#215;</button>' +
        '<div class="pmodal__body"></div>' +
      "</div>";
    document.body.appendChild(modal);
    panel = modal.querySelector(".pmodal__panel");

    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      var f = panel.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function render(id, d) {
    var sess = sessionsFor(d.name);
    var html =
      '<div class="pmodal__head">' +
        (d.photo ? '<span class="pmodal__media"><img src="' + esc(d.photo) + '" alt="" loading="lazy" /></span>' : "") +
        '<div class="pmodal__id">' +
          '<h2 id="pmName">' + esc(d.name) + "</h2>" +
          (d.role ? '<p class="pmodal__role">' + esc(d.role) + "</p>" : "") +
          ((d.meta && d.meta.length)
            ? '<p class="pmodal__chips">' + d.meta.map(function (m) {
                return '<span class="pmodal__chip">' + esc(m) + "</span>"; }).join("") + "</p>"
            : "") +
        "</div>" +
      "</div>";

    if (d.bio) html += '<p class="pmodal__bio">' + esc(d.bio) + "</p>";

    if (sess === null) {
      html += '<p class="pmodal__note">Loading programme&hellip;</p>';
    } else if (sess.length) {
      html += '<section class="pmodal__sessions"><h3>In the published programme</h3><ol>' +
        sess.map(function (s) {
          return "<li><span class='pmodal__when'>" + esc(t24(s.start)) + " &ndash; " + esc(t24(s.end)) +
                 "</span><span class='pmodal__what'><b>" + esc(s.title || "—") + "</b>" +
                 "<span>" + esc(s.hall) + " · " + esc(s.group) + "</span></span></li>";
        }).join("") + "</ol></section>";
    } else {
      html += '<p class="pmodal__note">No sessions published for this speaker yet.</p>';
    }

    /* No "Full profile" button: this dialog already shows everything that is
       known about a speaker — portrait, role, bio and their published
       sessions — so the button led to a page that repeated it, and to an
       almost empty one for the faculty who have no bio yet. */
    modal.querySelector(".pmodal__body").innerHTML = html;
  }

  function open(id) {
    var all = window.CF_DOCTORS || {};
    var d = all[id];
    if (!d) return false;
    ensure();
    lastFocus = document.activeElement;
    render(id, d);
    modal.hidden = false;
    document.body.classList.add("pmodal-open");
    panel.focus();

    /* pull the programme once, then re-render so the sessions appear */
    if (!window.CF_AGENDA && !agendaWanted) {
      agendaWanted = true;
      var s = document.createElement("script");
      s.src = "js/agenda-data.js";
      s.onload = function () { if (!modal.hidden) render(id, d); };
      s.onerror = function () { if (!modal.hidden) { window.CF_AGENDA = { halls: {} }; render(id, d); } };
      document.head.appendChild(s);
    }
    return true;
  }

  function close() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("pmodal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* Capture phase + stopPropagation: js/pageout.js also listens for internal
     link clicks and schedules `location.href` for its page-transition curtain.
     It is loaded first, so a bubble-phase listener here would open the dialog
     and then get navigated away from 620ms later. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href*="doctor.html?id="]');
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      var id = decodeURIComponent((a.getAttribute("href").split("id=")[1] || "").split("&")[0]);
      if (open(id)) { e.preventDefault(); e.stopPropagation(); }
      return;
    }
    /* the speakers page renders cards without links — match on the name */
    var card = e.target.closest(".spk[data-name]");
    if (card) {
      var want = norm(card.getAttribute("data-name"));
      var all = window.CF_DOCTORS || {};
      var hit = Object.keys(all).filter(function (k) { return norm(all[k].name) === want; })[0];
      if (hit && open(hit)) { e.preventDefault(); e.stopPropagation(); }
    }
  }, true);
})();
