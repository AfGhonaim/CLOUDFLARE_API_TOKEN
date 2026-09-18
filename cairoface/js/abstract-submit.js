/* Cairo FACE — the abstract submission screen.

   Same standing position as js/auth.js and js/registration.js: there is no
   endpoint, deliberately. Abstracts are received by the official Cairo FACE
   system; this front end has no server, and a submission form that silently
   posts nowhere is the worst outcome of all — someone believes their work is
   under review when it was never sent.

   So this validates, counts the words, and hands off. Nothing typed here is
   transmitted or stored: no fetch, no localStorage.

   To connect it: set ABS_ENDPOINT and fill in send(). */
(function () {
  "use strict";

  var ABS_ENDPOINT = null;                  /* ← the real API goes here */
  var OFFICIAL = "https://cairoface.com/abstract";

  var form = document.getElementById("absForm");
  if (!form) return;

  var body = form.querySelector("[name=body]");
  var count = document.getElementById("absCount");

  function words(v) {
    var t = v.trim();
    return t ? t.split(/\s+/).length : 0;
  }
  if (body && count) {
    var tally = function () { count.textContent = words(body.value); };
    body.addEventListener("input", tally);
    tally();
  }

  function fieldOf(i) { return i.closest(".field") || i.closest(".checkrow"); }
  function fail(i) {
    var f = fieldOf(i);
    if (f) f.classList.add("is-bad");
    i.setAttribute("aria-invalid", "true");
  }
  function clear(i) {
    var f = fieldOf(i);
    if (f) f.classList.remove("is-bad");
    i.removeAttribute("aria-invalid");
  }
  function emailOK(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

  form.querySelectorAll("input, select, textarea").forEach(function (el) {
    el.addEventListener("input", function () { clear(el); });
    el.addEventListener("change", function () { clear(el); });
  });

  function validate() {
    var bad = [];
    form.querySelectorAll("input, select, textarea").forEach(clear);

    [["first", 2], ["last", 2], ["country", 2], ["org", 2], ["head", 4]].forEach(function (pair) {
      var el = form.querySelector("[name=" + pair[0] + "]");
      if (el && el.value.trim().length < pair[1]) { fail(el); bad.push(el); }
    });

    var email = form.querySelector("[name=email]");
    if (email && !emailOK(email.value)) { fail(email); bad.push(email); }

    var topic = form.querySelector("[name=topic]");
    if (topic && !topic.value) { fail(topic); bad.push(topic); }

    /* no upper limit is enforced: Cairo FACE has not published a word count,
       and inventing one here could reject a perfectly valid abstract */
    if (body && words(body.value) < 20) { fail(body); bad.push(body); }

    var terms = form.querySelector("[name=terms]");
    if (terms && !terms.checked) { fail(terms); bad.push(terms); }

    if (bad.length) {
      bad[0].focus();
      bad[0].scrollIntoView({ block: "center", behavior: "smooth" });
    }
    return bad.length === 0;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;

    if (ABS_ENDPOINT) {
      /* send(ABS_ENDPOINT, form) — not implemented: no API to talk to yet */
      return;
    }

    var notice = form.querySelector('[data-notice="abstract"]');
    if (!notice) return;

    var head = form.querySelector("[name=head]");
    var note = document.getElementById("absNoticeBody");
    if (note && head) {
      note.textContent =
        'Abstracts are received by the official Cairo FACE system. Your abstract, "' +
        head.value.trim() + '", is ' + words(body ? body.value : "") +
        ' words. Nothing you typed here has been sent anywhere — carry it across ' +
        'on the next screen to submit it.';
    }
    var go = notice.querySelector("[data-official]");
    if (go) go.setAttribute("href", OFFICIAL);

    notice.hidden = false;
    notice.classList.add("is-on");
    notice.setAttribute("role", "status");
    notice.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
})();
