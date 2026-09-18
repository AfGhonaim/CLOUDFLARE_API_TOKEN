/* Cairo FACE — the registration screen.

   ─────────────────────────────────────────────────────────────────────────
   THERE IS NO ENDPOINT, AND THAT IS DELIBERATE — same as js/auth.js.

   Registration is a payment. This front end has no server, so there is
   nowhere here that could take one, and a form that silently posts nowhere
   is worse than no form at all: someone believes they have a place at a
   conference they are not registered for.

   So the screen does everything it honestly can — it holds the passes, the
   prices and the attendee's details, validates them, and shows the total —
   and then hands off to the official system for payment. Nothing typed here
   is transmitted or stored: no fetch, no localStorage.

   To connect it: set REG_ENDPOINT and fill in send(). Keep card details off
   this page entirely; they belong to whatever takes the payment.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var REG_ENDPOINT = null;                 /* ← the real API goes here */
  var OFFICIAL = "https://cairoface.com/register";

  var form = document.getElementById("regForm");
  if (!form) return;

  /* The published fees, and the only place they live in this file. They are
     the same numbers the fees page shows — if those change, change them in
     both, or neither is trustworthy. */
  var RATES = {
    eg:  { cur: "EGP", summit: 6000,  pre: 30000, sTitle: "Early bird",    pTitle: "Advanced experience" },
    int: { cur: "USD", summit: 500,   pre: 1000,  sTitle: "International", pTitle: "Advanced experience" }
  };
  var rate = "eg";

  function money(n, cur) {
    var s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return cur === "USD" ? "$" + s : s + " EGP";
  }
  function priceMarkup(n, cur) {
    var s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return cur === "USD" ? "$" + s : s + ' <small>EGP</small>';
  }

  var chips = [].slice.call(form.querySelectorAll(".regtoggle .fchip"));
  var boxes = [].slice.call(form.querySelectorAll('input[name=pass]'));
  var sumList = document.getElementById("regSumList");
  var totalEl = document.getElementById("regTotal");
  var passErr = document.getElementById("passErr");

  function paint() {
    var R = RATES[rate];

    form.querySelector('[data-price="summit"]').innerHTML = priceMarkup(R.summit, R.cur);
    form.querySelector('[data-price="pre"]').innerHTML = priceMarkup(R.pre, R.cur);
    form.querySelector('[data-title="summit"]').textContent = R.sTitle;
    form.querySelector('[data-title="pre"]').textContent = R.pTitle;

    var total = 0, rows = "";
    boxes.forEach(function (b) {
      b.closest(".passcard").classList.toggle("is-on", b.checked);
      if (!b.checked) return;
      var isSummit = b.value === "summit";
      var amount = isSummit ? R.summit : R.pre;
      total += amount;
      rows += '<li><span>' + (isSummit ? "Summit pass" : "Pre-Summit") + '</span><b>' +
              money(amount, R.cur) + '</b></li>';
    });

    sumList.innerHTML = rows || '<li class="regsum__empty"><span>No pass selected yet</span></li>';
    totalEl.textContent = money(total, R.cur);
    if (total) passErr.classList.remove("is-on");
  }

  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      rate = c.getAttribute("data-rate");
      chips.forEach(function (o) {
        var on = o === c;
        o.classList.toggle("is-on", on);
        o.setAttribute("aria-checked", on ? "true" : "false");
      });
      paint();
    });
  });
  boxes.forEach(function (b) { b.addEventListener("change", paint); });
  paint();

  /* ---------------- validation ---------------- */
  function fieldOf(input) { return input.closest(".field") || input.closest(".checkrow"); }
  function fail(input) {
    var f = fieldOf(input);
    if (f) f.classList.add("is-bad");
    input.setAttribute("aria-invalid", "true");
  }
  function clear(input) {
    var f = fieldOf(input);
    if (f) f.classList.remove("is-bad");
    input.removeAttribute("aria-invalid");
  }
  /* deliberately permissive — the server is the authority on an address */
  function emailOK(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

  form.querySelectorAll("input, select").forEach(function (el) {
    el.addEventListener("input", function () { clear(el); });
    el.addEventListener("change", function () { clear(el); });
  });

  function validate() {
    var bad = [];
    form.querySelectorAll("input, select").forEach(clear);

    if (!boxes.some(function (b) { return b.checked; })) {
      passErr.classList.add("is-on");
      bad.push(boxes[0]);
    }

    [["first", 2], ["last", 2], ["country", 2], ["phone", 6]].forEach(function (pair) {
      var el = form.querySelector("[name=" + pair[0] + "]");
      if (el && el.value.trim().length < pair[1]) { fail(el); bad.push(el); }
    });

    var email = form.querySelector("[name=email]");
    if (email && !emailOK(email.value)) { fail(email); bad.push(email); }

    var role = form.querySelector("[name=role]");
    if (role && !role.value) { fail(role); bad.push(role); }

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

    if (REG_ENDPOINT) {
      /* send(REG_ENDPOINT, form) — not implemented: no API to talk to yet */
      return;
    }

    var notice = form.querySelector('[data-notice="register"]');
    if (!notice) return;

    /* Say back exactly what was chosen, so the handoff is not a dead end —
       the reader can carry it across without re-deciding anything. */
    var R = RATES[rate];
    var picked = boxes.filter(function (b) { return b.checked; })
      .map(function (b) { return b.value === "summit" ? "Summit pass" : "Pre-Summit"; });
    var body = document.getElementById("regNoticeBody");
    if (body) {
      body.textContent =
        "Payment for Cairo FACE is taken by the official summit system. You chose " +
        picked.join(" and ") + " — " + totalEl.textContent +
        ". Nothing you typed here has been sent anywhere; carry it across on the " +
        "next screen to finish and pay.";
    }
    var go = notice.querySelector("[data-official]");
    if (go) go.setAttribute("href", OFFICIAL);

    notice.hidden = false;
    notice.classList.add("is-on");
    notice.setAttribute("role", "status");
    notice.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
})();
