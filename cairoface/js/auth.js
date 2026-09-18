/* Cairo FACE — account screen (sign up / sign in as one tabbed card).

   ─────────────────────────────────────────────────────────────────────────
   NO ENDPOINT IS CONFIGURED, AND THAT IS DELIBERATE.

   Cairo FACE accounts live on the platform at cairoface.com. This front end
   has no server of its own, so there is nowhere here that could verify a
   password. Wiring the form to a guessed URL would send real credentials to
   an endpoint nobody has verified, and a form that silently posts nowhere is
   worse still: it looks like it worked.

   So until AUTH_ENDPOINT is set to the real API, submitting validates the
   input, CLEARS THE PASSWORD, and hands off to the official system. Nothing
   typed here is transmitted, logged, or stored — no fetch, no localStorage.

   To connect it: set AUTH_ENDPOINT to the API URL and fill in send(). Keep
   the password out of storage and off the query string.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var AUTH_ENDPOINT = null;               /* ← the real API goes here */
  var OFFICIAL = {
    login: "https://cairoface.com/login",
    signup: "https://cairoface.com/login"
  };

  var shell = document.querySelector(".authshell");
  if (!shell) return;

  /* ==============================================================
     Tabs — both panels live on the page, so switching is instant and
     never drops what someone has already typed into the other one.
     The URL follows so the tab survives a reload or a shared link.
     ============================================================== */
  var panels = {};
  document.querySelectorAll(".authpanel").forEach(function (p) {
    panels[p.getAttribute("data-panel")] = p;
  });
  var tabs = [].slice.call(document.querySelectorAll(".authtab"));

  function show(mode) {
    if (!panels[mode]) return;
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== mode; });
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-tab") === mode;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    shell.setAttribute("data-mode", mode);
    document.title = (mode === "signup" ? "Create an account" : "Log in") +
                     " — Cairo FACE World Summit 2027";
    try {
      var file = mode === "signup" ? "signup.html" : "login.html";
      history.replaceState(null, "", file + location.search + location.hash);
    } catch (e) { /* file:// has no history API — the tab still switched */ }
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { show(t.getAttribute("data-tab")); });
  });
  show(shell.getAttribute("data-mode") || "login");

  /* ==============================================================
     Each form validates itself. Both are wired, not just the visible
     one, so switching tabs never lands on an unwired form.
     ============================================================== */
  document.querySelectorAll("[data-auth]").forEach(function (form) {
    var mode = form.getAttribute("data-auth");
    var notice = document.querySelector('[data-notice="' + mode + '"]');

    form.querySelectorAll(".pwtoggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = btn.parentElement.querySelector("input");
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.textContent = show ? "Hide" : "Show";
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        input.focus();
      });
    });

    function fieldOf(input) { return input.closest(".field") || input.closest(".checkrow"); }

    function fail(input, message) {
      var f = fieldOf(input);
      if (!f) return;
      f.classList.add("is-bad");
      var err = f.querySelector(".field__err");
      if (err && message) err.textContent = message;
      input.setAttribute("aria-invalid", "true");
    }

    function clear(input) {
      var f = fieldOf(input);
      if (f) f.classList.remove("is-bad");
      input.removeAttribute("aria-invalid");
    }

    /* deliberately permissive: the server is the real authority on an
       address, and an over-strict pattern rejects addresses people own */
    function emailLooksValid(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

    function validate() {
      var bad = [];
      form.querySelectorAll("input, select").forEach(clear);

      var email = form.querySelector("[name=email]");
      if (email && !emailLooksValid(email.value)) {
        fail(email, "Enter a valid email address."); bad.push(email);
      }

      var pw = form.querySelector("[name=password]");
      if (pw && pw.value.length < 8) {
        fail(pw, "Use at least 8 characters."); bad.push(pw);
      }

      if (mode === "signup") {
        var first = form.querySelector("[name=first]");
        if (first && first.value.trim().length < 2) {
          fail(first, "Enter your first name."); bad.push(first);
        }
        var last = form.querySelector("[name=last]");
        if (last && last.value.trim().length < 2) {
          fail(last, "Enter your last name."); bad.push(last);
        }
        var confirm = form.querySelector("[name=confirm]");
        if (confirm && confirm.value !== (pw ? pw.value : "")) {
          fail(confirm, "Both passwords must match."); bad.push(confirm);
        }
        var terms = form.querySelector("[name=terms]");
        if (terms && !terms.checked) { fail(terms, ""); bad.push(terms); }
      }

      if (bad.length) {
        bad[0].focus();
        bad[0].scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return bad.length === 0;
    }

    form.querySelectorAll("input, select").forEach(function (el) {
      el.addEventListener("input", function () { clear(el); });
      el.addEventListener("change", function () { clear(el); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;

      if (AUTH_ENDPOINT) {
        /* send(AUTH_ENDPOINT, form) — not implemented: no API to talk to yet */
        return;
      }

      /* Nothing leaves this page. Wipe the password before showing anything. */
      form.querySelectorAll("input[type=password], input[type=text][name=password], input[type=text][name=confirm]")
        .forEach(function (i) { i.value = ""; i.type = "password"; });
      form.querySelectorAll(".pwtoggle").forEach(function (b) { b.textContent = "Show"; });

      if (notice) {
        notice.classList.add("is-on");
        notice.setAttribute("role", "status");
        var go = notice.querySelector("[data-official]");
        if (go) go.setAttribute("href", OFFICIAL[mode] || OFFICIAL.login);
        notice.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  });

  /* a reel that cannot play (data saver, decode failure) must not leave a
     blank rectangle where the brand image should be — the gradient wash
     underneath already carries the composition on its own */
  var reel = shell.querySelector(".authshell__reel");
  if (reel) {
    reel.addEventListener("error", function () { reel.style.display = "none"; });
    var play = reel.play && reel.play();
    if (play && play.catch) play.catch(function () { /* autoplay blocked; the still frame stands in */ });
  }
})();
