/* Cairo FACE — card icons.

   One 24px grid, 1.6 stroke, round caps, currentColor. Drawn rather than
   pulled from an icon library so the weight matches Graphik's and the set
   stays consistent: every glyph is built from the same few primitives.

   Usage:  <span class="vicon" data-icon="learn"></span>
   The span is decorative and aria-hidden — the card's heading already says
   what it is — so if this script never runs the card simply has no icon
   rather than a broken slot. */
(function () {
  "use strict";

  var P = {
    /* --- why Cairo FACE --- */
    learn:      '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    experience: '<circle cx="12" cy="12" r="8.5"/><path d="m10.4 9.2 4.6 2.8-4.6 2.8z"/>',
    connect:    '<circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="17" r="2.6"/><circle cx="12" cy="6" r="2.6"/><path d="M10.7 8.3 7.3 14.7M13.3 8.3l3.4 6.4M8.6 17h6.8"/>',
    lead:       '<path d="M5 21V4.5h9l-1.2 3 1.2 3H5"/><path d="M5 12h9"/>',

    /* --- what you can experience --- */
    surgery:    '<path d="M3.6 20.4 9 15"/><path d="m10.4 13.6 6.6-9a2 2 0 0 1 3 2.7l-7.2 7.9z"/><path d="m9 15 1.4-1.4 2.4 1.6L11.4 16z"/>',
    masterclass:'<rect x="3.5" y="4.5" width="17" height="11" rx="1.6"/><path d="M12 15.5V20M8.5 20h7M8 11l2.4-2.4L12.6 11 16 7.8"/>',
    handson:    '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5V6a1.5 1.5 0 0 1 3 0v5"/><path d="M15 11V8a1.5 1.5 0 0 1 3 0v6.5a6 6 0 0 1-6 6h-.6a5 5 0 0 1-3.7-1.7L5 15.4a1.6 1.6 0 0 1 2.3-2.2L9 15"/>',
    workshop:   '<path d="M14.5 6.2a3.6 3.6 0 0 1 4.9 4.6l-8.6 8.6a2 2 0 0 1-2.9-2.8z"/><path d="M4.6 4.6 7 4l1.6 3.4L11 9l-2 2-1.6-2.4L4 7z"/>',
    session:    '<rect x="9.4" y="3.5" width="5.2" height="10" rx="2.6"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6"/>',
    exhibition: '<path d="M4 9h16l-1 11H5z"/><path d="M4 9 6 4h12l2 5"/><path d="M9.5 9v2.5a2.5 2.5 0 0 0 5 0V9"/>',

    /* --- why exhibit --- */
    audience:   '<circle cx="9" cy="8.5" r="3"/><path d="M3.6 19a5.4 5.4 0 0 1 10.8 0"/><circle cx="17" cy="9.5" r="2.2"/><path d="M15 15.4a4 4 0 0 1 5.4 3.2"/>',
    innovation: '<path d="M9.2 16.5a6 6 0 1 1 5.6 0"/><path d="M9.6 16.5h4.8v2.2a2.4 2.4 0 0 1-4.8 0z"/><path d="M12 21v-.2"/>',
    network:    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c4.5 5 4.5 12 0 17-4.5-5-4.5-12 0-17"/>',
    brand:      '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/>',

    /* --- abstract topics --- */
    technique:  '<circle cx="6.5" cy="17.5" r="2.4"/><circle cx="17.5" cy="17.5" r="2.4"/><path d="m8.3 15.8 8-11.3M15.7 15.8l-8-11.3"/>',
    device:     '<rect x="4" y="4" width="16" height="16" rx="3"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.4"/><path d="M9 1.8V4M15 1.8V4M9 20v2.2M15 20v2.2M1.8 9H4M1.8 15H4M20 9h2.2M20 15h2.2"/>',
    skin:       '<path d="M12 3.5c3.4 3.6 5.4 6.3 5.4 9a5.4 5.4 0 0 1-10.8 0c0-2.7 2-5.4 5.4-9z"/><path d="M9.8 13.8a2.4 2.4 0 0 0 2.4 2.3"/>',
    trend:      '<path d="M3.5 16.5 9 11l3.5 3.5L20.5 6.5"/><path d="M15.5 6.5h5v5"/>',

    /* --- why present --- */
    share:      '<path d="M4 10.5 19.5 4.5l-2 15-5-4.3z"/><path d="m8.6 15.2-.1 4.6 3-3.2"/>',
    globe:      '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.8 2.6 14.2 0 17-2.6-2.8-2.6-14.2 0-17"/>',
    credible:   '<path d="M12 3.5 5 6.2v5.4c0 4 2.9 7.7 7 8.9 4.1-1.2 7-4.9 7-8.9V6.2z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    future:     '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5.2-5.2 2 2-5.2z"/>',

    /* --- rising star / awards --- */
    apply:      '<circle cx="10" cy="8.5" r="3.2"/><path d="M4 19.4a6 6 0 0 1 10.6-3.8"/><path d="m15.6 18.4 1.8 1.8 3.4-3.6"/>',
    trophy:     '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.5H5a2.2 2.2 0 0 0 2.5 3M16.5 5.5H19a2.2 2.2 0 0 1-2.5 3"/><path d="M12 13.5V17M8.6 20h6.8l-.7-3H9.3z"/>',

    /* --- registration / practical --- */
    calendar:   '<rect x="3.5" y="5.5" width="17" height="15" rx="2.2"/><path d="M3.5 10h17M8.5 3.5V7M15.5 3.5V7"/>',
    pin:        '<path d="M12 21s6.5-5.6 6.5-10.4a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.6"/>',
    policy:     '<path d="M6 3.5h8l4 4v13H6z"/><path d="M13.6 3.7V8h4.2M9 12.5h6M9 16h4"/>',
    ticket:     '<path d="M3.5 8.5V6.2h17v2.3a2.4 2.4 0 0 0 0 4.8v4.7h-17v-4.7a2.4 2.4 0 0 0 0-4.8z"/><path d="M12 7.6v1.8M12 11.1v1.8M12 14.6v1.8"/>',

    /* --- contact --- */
    message:    '<path d="M20.5 12.6c0 3.9-3.8 7-8.5 7a9.8 9.8 0 0 1-2.7-.4L4 21l1.4-4a6.5 6.5 0 0 1-1.9-4.4c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7z"/>',
    phone:      '<path d="M7.6 4.5h-2A1.6 1.6 0 0 0 4 6.2c0 7.6 6.2 13.8 13.8 13.8a1.6 1.6 0 0 0 1.7-1.6v-2a1.2 1.2 0 0 0-1-1.2l-2.7-.5a1.2 1.2 0 0 0-1.1.4l-1 1.2a12 12 0 0 1-5-5l1.2-1a1.2 1.2 0 0 0 .4-1.1l-.5-2.7a1.2 1.2 0 0 0-1.2-1z"/>',
    mail:       '<rect x="2.6" y="5" width="18.8" height="14" rx="2.4"/><path d="m3 7.4 9 6 9-6"/>',
    social:     '<circle cx="17.5" cy="6" r="2.6"/><circle cx="6.5" cy="12" r="2.6"/><circle cx="17.5" cy="18" r="2.6"/><path d="m8.9 10.8 6.2-3.4M8.9 13.2l6.2 3.4"/>'
  };

  var nodes = document.querySelectorAll("[data-icon]");
  if (!nodes.length) return;

  Array.prototype.forEach.call(nodes, function (el) {
    var d = P[el.getAttribute("data-icon")];
    if (!d) return;
    el.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" focusable="false">' + d + "</svg>";
    el.setAttribute("aria-hidden", "true");
  });
})();
