/* Cairo FACE — the hero visual (luxury facial-aesthetics composition).
   Layer 1 is the reference artwork itself (img/face3-src.png, cropped to the
   portrait side and edge-masked) — it is NEVER redrawn or altered. Above it,
   independent transparent layers animate:
     2 · facial-mapping lines (hand-set paths riding the artwork's own curves,
         with slow light traveling along them)
     3 · anatomical markers (soft breathing glow dots + hairline connections)
     4 · HUD ring + dot column (slow counter-rotation, gentle pulses)
     5 · flowing silk ribbons (organic multi-frequency sway)
     6 · data particles (riding the mapping paths, never a starfield)
   Plus: a 3s cinematic intro, damped mouse depth (face ±3 / mapping ±6 /
   ribbons ±9 / HUD ±10 / particles ±13 px), cursor-proximity reactions, and
   a scrubbed scroll story: FACE → ANALYSIS → CONTOURS → DATA.
   One canvas, one rAF (paused offscreen), reduced-motion = still portrait. */
(function () {
  "use strict";

  var canvas = document.getElementById("faceCanvas");
  if (!canvas) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");
  var heroSection = document.getElementById("hero");

  /* ---------- source artwork (full image 1536×1024, cropped at x=576) ---- */
  var IW = 1536, IH = 1024, CROP_X = 576;
  var AW = IW - CROP_X; /* 960 */
  var artReady = false;
  var IMGD = null;
  function skin(x, y) {
    if (!IMGD) return [120, 130, 140];
    var ix = Math.max(0, Math.min(AW - 1, (x - CROP_X) | 0));
    var iy = Math.max(0, Math.min(IH - 1, y | 0));
    var i4 = (iy * AW + ix) * 4;
    return [IMGD[i4], IMGD[i4 + 1], IMGD[i4 + 2]];
  }
  var art = document.createElement("canvas");
  var refImg = new Image();
  var imgTries = 0;
  refImg.onerror = function () {
    /* a dropped request on a flaky connection must not leave the hero empty */
    if (imgTries++ < 4) setTimeout(function () {
      refImg.src = "img/face3-src.png?r=" + imgTries;
    }, 700 * imgTries);
  };
  refImg.src = "img/face3-src.png";
  refImg.onload = function () {
    art.width = AW; art.height = IH;
    var a = art.getContext("2d");
    a.drawImage(refImg, CROP_X, 0, AW, IH, 0, 0, AW, IH);
    IMGD = a.getImageData(0, 0, AW, IH).data; /* skin sampling, pre-mask */
    a.globalCompositeOperation = "destination-out";
    /* deep feathered fades on every side — the artwork must never end in a
       perceptible straight edge against the page ground */
    [
      [0, 0, 0, IH * 0.14, true],            /* top    */
      [0, IH, 0, IH - IH * 0.12, true],      /* bottom */
      [0, 0, AW * 0.24, 0, false],           /* left   */
      [AW, 0, AW - AW * 0.07, 0, false],     /* right  */
    ].forEach(function (g) {
      var gr = g[4]
        ? a.createLinearGradient(0, g[1], 0, g[3])
        : a.createLinearGradient(g[0], 0, g[2], 0);
      gr.addColorStop(0, "rgba(0,0,0,1)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      a.fillStyle = gr;
      a.fillRect(0, 0, AW, IH);
    });
    /* erase the mockup's own baked headline tail that survives the crop
       (full-image x 576–668, y 140–440 is clean ground behind it) */
    var tg = a.createLinearGradient(92, 0, 128, 0);
    tg.addColorStop(0, "rgba(0,0,0,1)");
    tg.addColorStop(1, "rgba(0,0,0,0)");
    a.fillStyle = tg;
    a.fillRect(0, 130, 128, 320);
    /* the artwork's own ground color (border average, pre-mask) — used to
       extend its ambience past the rect so no boundary can ever show */
    var hr = 0, hgn = 0, hb = 0, hn = 0;
    for (var by = 2; by < 40; by += 6) {
      for (var bx = 2; bx < AW; bx += 24) {
        var bi = (by * AW + bx) * 4;
        hr += IMGD[bi]; hgn += IMGD[bi + 1]; hb += IMGD[bi + 2]; hn++;
      }
    }
    HALO = ((hr / hn) | 0) + "," + ((hgn / hn) | 0) + "," + ((hb / hn) | 0);
    artReady = true;
    if (reduced) draw(0, 0);
  };
  var HALO = null;

  /* ---------- palette: restrained, medical, editorial ---------- */
  var LINE = "214,229,238";   /* pale porcelain    */
  var GLOW = "255,255,255";   /* traveling light   */
  var SOFT = "150,182,205";   /* dim steel accents */

  /* ---------- the choreography data (FULL-image coordinates) ---------- */
  function catmull(pts, seg) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i],
          p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var j = 0; j < seg; j++) {
        var u = j / seg, u2 = u * u, u3 = u2 * u;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
        ]);
      }
    }
    out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
    return out;
  }
  function makePath(raw) {
    var pts = catmull(raw, 14);
    var cum = [0];
    for (var i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    var cx = 0, cy = 0;
    for (var k = 0; k < pts.length; k++) { cx += pts[k][0]; cy += pts[k][1]; }
    return { pts: pts, cum: cum, len: cum[cum.length - 1], cx: cx / pts.length, cy: cy / pts.length };
  }
  function pathAt(P, d, out) {
    var lo = 0, hi = P.pts.length - 1;
    while (lo < hi - 1) { var m = (lo + hi) >> 1; if (P.cum[m] < d) lo = m; else hi = m; }
    var span = P.cum[hi] - P.cum[lo] || 1, u = (d - P.cum[lo]) / span;
    out.x = P.pts[lo][0] + (P.pts[hi][0] - P.pts[lo][0]) * u;
    out.y = P.pts[lo][1] + (P.pts[hi][1] - P.pts[lo][1]) * u;
    return out;
  }

  /* facial-mapping lines — set by hand along the artwork's own curves */
  var MAPS = [
    makePath([[1035, 112], [1092, 178], [1096, 258], [1062, 332], [1018, 424], [986, 508], [1012, 568]]),
    makePath([[998, 128], [1012, 212], [984, 300], [938, 392], [914, 472], [936, 548], [978, 604]]),
    makePath([[988, 468], [948, 532], [913, 592], [894, 658], [916, 724], [962, 776]]),
  ];
  MAPS[0].reveal = 0.2; MAPS[1].reveal = 0.3; MAPS[2].reveal = 0.4;

  /* anatomical markers: the artwork's callout dots + quiet feature points */
  var MARKERS = [
    { x: 1113, y: 168, r: 2.6, reveal: 0.56, cal: true },  /* harmony        */
    { x: 1096, y: 342, r: 2.6, reveal: 0.62, cal: true },  /* natural beauty */
    { x: 1069, y: 601, r: 2.6, reveal: 0.5, cal: true },   /* confidence     */
    { x: 1032, y: 142, r: 2, reveal: 0.68 },               /* temple         */
    { x: 938, y: 382, r: 2, reveal: 0.6 },                 /* cheek          */
    { x: 806, y: 318, r: 2, reveal: 0.66 },                /* nose           */
    { x: 812, y: 436, r: 2, reveal: 0.64 },                /* lips           */
    { x: 930, y: 604, r: 2, reveal: 0.52 },                /* jaw            */
  ];
  var MARKER_LINKS = [[3, 4], [4, 7]]; /* temple→cheek, cheek→jaw hairlines */

  /* features for cursor proximity (eye / nose / lips) */
  var FEATURES = [
    { x: 902, y: 208, r: 120 }, /* eye  */
    { x: 806, y: 318, r: 100 }, /* nose */
    { x: 812, y: 436, r: 100 }, /* lips */
  ];

  /* HUD */
  var HUD = { x: 1427, y: 235, r1: 60, r2: 28, lineTop: 84, lineBot: 536 };
  var HUD_DOTS = [[1427, 620], [1427, 730], [1427, 787]];

  /* flowing ribbons — guide splines around the lower/right */
  var RIBBONS = [
    { P: makePath([[600, 1030], [780, 912], [990, 836], [1210, 858], [1450, 762], [1560, 700]]), amp: 19, spd: 0.105, w: 46 },
    { P: makePath([[700, 1040], [910, 956], [1130, 902], [1360, 936], [1560, 856]]), amp: 15, spd: 0.052, w: 34 },
    { P: makePath([[1060, 720], [1240, 648], [1420, 566], [1560, 540]]), amp: 12, spd: 0.157, w: 26 },
  ];

  /* the dissolution edges — the face's own silhouette, where skin becomes
     signal. Front profile sheds inward-left; the crown sheds up into the
     network. Slow, sparse, elegant. */
  var EDGES = [
    { P: makePath([[884, 66], [826, 176], [792, 296], [798, 362], [814, 438], [836, 524], [884, 586]]), vx: -16, vy: -2 },
    { P: makePath([[906, 52], [1016, 92], [1096, 172], [1148, 300]]), vx: 14, vy: -14 },
    { P: makePath([[930, 604], [990, 660], [1046, 700]]), vx: 8, vy: 16 },
  ];
  var N_EMIT = window.innerWidth <= 800 ? 16 : 44;
  var emits = [];
  var Q0 = { x: 0, y: 0 };
  function seedEmit(E, i) {
    var edge = EDGES[(Math.random() * EDGES.length) | 0];
    pathAt(edge.P, Math.random() * edge.P.len, Q0);
    E.x = Q0.x; E.y = Q0.y;
    E.vx = edge.vx * (0.9 + Math.random() * 1.0);
    E.vy = edge.vy * (0.6 + Math.random() * 0.8) + (Math.random() - 0.5) * 8;
    E.ttl = 2.6 + Math.random() * 3;
    E.col = null;
    E.age = -Math.random() * (i === undefined ? 0 : 4); /* staggered births */
    E.sz = 1.0 + Math.random() * 1.3;
    E.sq = Math.random() < 0.18;
  }
  for (var ei0 = 0; ei0 < N_EMIT; ei0++) { var E0 = {}; seedEmit(E0, ei0); emits.push(E0); }

  /* conversion regions — where the face itself turns digital. The skin in a
     region visibly dissolves (a soft veil to the ground) while its OWN pixel
     colors float in its place as particles + a fine mesh, then the skin
     returns. One transient region cycles (forehead/temple/cheek/jaw); the
     back of the head stays permanently half-converted. */
  function hash(n) { var x = Math.sin(n) * 43758.5453; return x - Math.floor(x); }
  function lum(x, y) { var c = skin(x, y); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; }
  function buildRegion(cx, cy, R, K, si) {
    /* candidates scored by local contrast — the mesh clings to the face's
       actual structure (strands, contour shadows), never floats randomly */
    var cand = [];
    for (var k = 0; k < K * 4; k++) {
      var a = hash(si * 31 + k * 7.13) * 6.2832, rr = Math.sqrt(hash(si * 17 + k * 3.7)) * R;
      var px3 = cx + Math.cos(a) * rr, py3 = cy + Math.sin(a) * rr * 0.85;
      var g = Math.abs(lum(px3 + 3, py3) - lum(px3 - 3, py3)) +
              Math.abs(lum(px3, py3 + 3) - lum(px3, py3 - 3));
      cand.push({ x: px3, y: py3, g: g + hash(k * 1.7 + si) * 6,
                  ph: hash(si + k * 12.9) * 6.2832, jr: hash(k * 5.1 + si) * 6.2832, col: null });
    }
    cand.sort(function (a2, b2) { return b2.g - a2.g; });
    var pts = cand.slice(0, K);
    var edges = [];
    for (var u = 0; u < pts.length; u++) {
      var best = -1, best2 = -1, bd = 1e9, bd2 = 1e9;
      for (var v = 0; v < pts.length; v++) {
        if (v === u) continue;
        var dd = Math.hypot(pts[u].x - pts[v].x, pts[u].y - pts[v].y);
        if (dd < bd) { bd2 = bd; best2 = best; bd = dd; best = v; }
        else if (dd < bd2) { bd2 = dd; best2 = v; }
      }
      if (best > u) edges.push([u, best]);
      if (best2 > u) edges.push([u, best2]);
    }
    return { c: [cx, cy], r: R, pts: pts, edges: edges };
  }
  var REGIONS = null, BACKHEAD = null, FACEMESH = null, PERM = null;
  function initRegions() {
    /* the whole-face wireframe: points cling to real structure, identity
       zones (eye / nose / lips) are left untouched */
    FACEMESH = buildRegion(935, 340, 295, 56, 21);
    FACEMESH.pts = FACEMESH.pts.filter(function (p2) {
      if (lum(p2.x, p2.y) < 30) return false; /* off the head */
      for (var f2 = 0; f2 < FEATURES.length; f2++) {
        if (Math.hypot(p2.x - FEATURES[f2].x, p2.y - FEATURES[f2].y) < 80) return false;
      }
      return true;
    });
    FACEMESH.edges = [];
    for (var u2 = 0; u2 < FACEMESH.pts.length; u2++) {
      var b1 = -1, b2 = -1, d1 = 1e9, d2 = 1e9;
      for (var v2 = 0; v2 < FACEMESH.pts.length; v2++) {
        if (v2 === u2) continue;
        var dd2 = Math.hypot(FACEMESH.pts[u2].x - FACEMESH.pts[v2].x, FACEMESH.pts[u2].y - FACEMESH.pts[v2].y);
        if (dd2 > 170) continue;
        if (dd2 < d1) { d2 = d1; b2 = b1; d1 = dd2; b1 = v2; }
        else if (dd2 < d2) { d2 = dd2; b2 = v2; }
      }
      if (b1 > u2) FACEMESH.edges.push([u2, b1]);
      if (b2 > u2) FACEMESH.edges.push([u2, b2]);
    }
    REGIONS = [
      buildRegion(944, 122, 54, 24, 1),   /* forehead  */
      buildRegion(1014, 178, 48, 22, 2),  /* temple    */
      buildRegion(902, 352, 54, 24, 3),   /* cheek     */
      buildRegion(936, 556, 50, 22, 4),   /* jawline   */
    ];
    BACKHEAD = buildRegion(1122, 232, 92, 36, 9);
    /* the HYBRID state: the rear half of her head is permanently digital,
       three overlapping zones breathing on staggered phases — the front of
       her face (identity) stays photographic */
    PERM = [
      BACKHEAD,
      buildRegion(1145, 410, 150, 42, 22), /* rear cheek / ear / hair mass */
      buildRegion(1040, 128, 112, 28, 23), /* crown */
      buildRegion(1060, 620, 120, 30, 24), /* rear jaw into neck */
    ];
  }
  /* entry order tells the story: forehead → temple → cheek → jaw, then free */
  var patch = { idx: 0, seq: 0, start: 4.0, D: 4.2, gap: 1.6, shed: 0 };

  /* traveling lights + particles */
  var lights = [
    { path: 0, d: 0.05, spd: 0.022 },
    { path: 1, d: 0.38, spd: 0.018 },
    { path: 2, d: 0.72, spd: 0.026 },
  ];
  var mobile = window.innerWidth <= 800;
  var N_PART = mobile ? 6 : 10;
  var parts = [];
  for (var pi = 0; pi < N_PART; pi++) {
    parts.push({
      path: pi % MAPS.length,
      d: Math.random(),
      spd: 0.02 + Math.random() * 0.03,
      off: (Math.random() - 0.5) * 26, /* drifts alongside the line */
      sz: 0.8 + Math.random() * 1.2,
    });
  }

  /* ---------- the wind: streaks that fly through the composition ---------- */
  var N_WIND = window.innerWidth <= 800 ? 7 : 15;
  var winds = [];
  function seedWind(W2) {
    W2.x = -80 - Math.random() * 200;
    W2.y = Math.random();          /* canvas fraction */
    W2.spd = 60 + Math.random() * 70;
    W2.len = 0.12 + Math.random() * 0.14; /* trail seconds */
    W2.a = 0.1 + Math.random() * 0.14;
    W2.ph = Math.random() * 6.2832;
  }
  for (var wi0 = 0; wi0 < N_WIND; wi0++) { var W0 = {}; seedWind(W0); W0.x = Math.random() * 1800 - 200; winds.push(W0); }

  /* ---------- intro ---------- */
  var INTRO_D = 3.0;
  var introDone = reduced || !document.body.classList.contains("intro");
  var introStart = -1;
  var introE = introDone ? 1 : 0;

  /* the awakening: as the hero copy types in, she opens her eyes — done as
     a masked eye-area treatment (a resting shadow lifts + a light parts
     along the lash line), never by repainting the face. Plays once. */
  var EYE = { cx: 900, cy: 206, rx: 62, ry: 30, rot: -0.42 };
  var LASH = makePath([[858, 192], [898, 206], [940, 217]]);
  var wakeStart = -1, wakeE = reduced ? 1 : 0;
  function finishIntro() {
    introDone = true; introE = 1;
    document.body.classList.remove("intro");
  }

  /* ---------- layout: image space → canvas ---------- */
  var dpr = 1, cw = 0, ch = 0, S = 0, OX = 0, OY = 0, alphaAll = 1, PAR = 1;
  function layout() {
    mobile = window.innerWidth <= 800;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var box = canvas.parentElement.getBoundingClientRect();
    cw = Math.max(1, box.width); ch = Math.max(1, box.height);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    if (mobile) {
      /* recompose: the face large, high and readable */
      S = (cw * 1.35) / AW;
      OX = cw * 0.62 - (900 - CROP_X) * S; /* eye anchored right of centre */
      OY = ch * 0.34 - 208 * S;
      alphaAll = 0.92;
      PAR = 0.5;
    } else {
      S = ch / IH;
      if (S * AW > cw * 0.78) S = (cw * 0.78) / AW;
      OX = cw - S * AW;
      OY = (ch - S * IH) / 2;
      alphaAll = 1;
      PAR = 1;
    }
  }
  layout();
  function X(x) { return OX + (x - CROP_X) * S; }
  function Y(y) { return OY + y * S; }

  /* ---------- input ---------- */
  var mx = 0, my = 0, smx = 0, smy = 0, mpx = -1e4, mpy = -1e4;
  if (!reduced) {
    window.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      my = ((e.clientY - r.top) / r.height) * 2 - 1;
      mpx = e.clientX - r.left; mpy = e.clientY - r.top;
    });
    window.addEventListener("resize", layout);
  }

  function scrollProgress() {
    var span = heroSection.offsetHeight - window.innerHeight;
    if (span <= 0) return 0;
    var p = window.scrollY / span;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }
  function ease(t) { return t * t * (3 - 2 * t); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  var P = { x: 0, y: 0 };
  var pulses = [];            /* proximity-triggered lights */
  var featPulseAt = 0;
  var nextBlink = 6, blinkStart = -10; /* the natural blink cadence */

  function glowDot(x, y, r, core, halo) {
    ctx.fillStyle = "rgba(" + GLOW + "," + halo.toFixed(3) + ")";
    ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "rgba(" + GLOW + "," + core.toFixed(3) + ")";
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  /* ---------- draw ---------- */
  function draw(t, p) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.lineCap = ctx.lineJoin = "round";

    var pe = ease(clamp01((p - 0.1) / 0.9));
    var peLate = ease(clamp01((pe - 0.35) / 0.65));
    var ei = introE;
    /* the ambient breath: one ~6s cycle the whole hero shares */
    var BRM = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.0);
    /* the scroll story: REAL BEAUTY → ANATOMY → PRECISION → KNOWLEDGE */
    var stAnatomy = ease(clamp01((pe - 0.04) / 0.3));
    var stPrecision = ease(clamp01((pe - 0.24) / 0.3));
    var stKnowledge = ease(clamp01((pe - 0.48) / 0.34));

    /* mouse depth per layer (px) */
    var fx = smx * 3 * PAR, fy = smy * 2 * PAR;        /* face    */
    var gx = smx * 6 * PAR, gy = smy * 4 * PAR;        /* mapping */
    var rx = smx * 9 * PAR, ry = smy * 6 * PAR;        /* ribbons */
    var hx = smx * 10 * PAR, hy = smy * 7 * PAR;       /* HUD     */
    var px2 = smx * 13 * PAR, py2 = smy * 9 * PAR;     /* parts   */
    var lift = -ease(pe) * 72;                         /* scroll drift */

    /* the living camera: a perpetual, barely-perceptible drift + breath of
       the ENTIRE composition (raster and every overlay share it) */
    var faceCx2 = X(900), faceCy2 = Y(400);
    var kb = reduced ? 1 : (1 + 0.016 * Math.sin(t * 0.09)) * (1 + pe * 0.1);
    var kpx = reduced ? 0 : Math.sin(t * 0.062) * 7;
    var kpy = reduced ? 0 : Math.cos(t * 0.051) * 5;
    ctx.save();
    ctx.translate(faceCx2 + kpx, faceCy2 + kpy);
    ctx.scale(kb, kb);
    ctx.translate(-faceCx2, -faceCy2);

    /* ---- layer 1 · THE FACE (the artwork, untouched) ---- */
    var rasterA = alphaAll;
    if (ei < 1) rasterA *= 0.12 + 0.88 * ease(clamp01((ei - 0.08) / 0.74));
    rasterA *= 1 - ease(pe) * 0.74; /* she dissolves into data as you pass */
    /* ground ambience: the artwork's own ground color pools softly past its
       bounds, so the masked rect blends into the page with no seam */
    if (artReady && rasterA > 0.01 && HALO) {
      var hcx = X(935) + fx, hcy = Y(430) + fy + lift * 0.5;
      var hgr = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, 660 * S);
      hgr.addColorStop(0, "rgba(" + HALO + "," + (0.5 * rasterA).toFixed(3) + ")");
      hgr.addColorStop(0.55, "rgba(" + HALO + "," + (0.3 * rasterA).toFixed(3) + ")");
      hgr.addColorStop(1, "rgba(" + HALO + ",0)");
      ctx.fillStyle = hgr;
      ctx.fillRect(hcx - 670 * S, hcy - 670 * S, 1340 * S, 1340 * S);
    }
    if (artReady && rasterA > 0.01) {
      ctx.globalAlpha = rasterA;
      ctx.drawImage(art, X(CROP_X) + fx, OY + fy + lift * 0.5, AW * S, IH * S);
      ctx.globalAlpha = 1;
    }

    /* ambient illumination — the light itself breathes */
    if (rasterA > 0.05) {
      var ilx = X(900) + fx, ily = Y(320) + fy + lift * 0.5;
      var ig = ctx.createRadialGradient(ilx, ily, 0, ilx, ily, 430 * S);
      ig.addColorStop(0, "rgba(" + SOFT + "," + ((0.022 + 0.02 * BRM) * rasterA).toFixed(4) + ")");
      ig.addColorStop(1, "rgba(" + SOFT + ",0)");
      ctx.fillStyle = ig;
      ctx.fillRect(ilx - 460 * S, ily - 460 * S, 920 * S, 920 * S);
    }

    /* ---- the awakening (eye area only, once) ---- */
    if (!reduced && wakeE < 1.001 && rasterA > 0.05) {
      var ecx = X(EYE.cx) + fx, ecy = Y(EYE.cy) + fy + lift * 0.5;
      /* 1 · the resting shadow over the closed eye lifts away */
      var shadeA = 0.3 * (1 - wakeE) * rasterA;
      if (shadeA > 0.01) {
        ctx.save();
        ctx.translate(ecx, ecy);
        ctx.rotate(EYE.rot);
        var sg = ctx.createRadialGradient(0, 0, 0, 0, 0, EYE.rx * S);
        sg.addColorStop(0, "rgba(5,28,41," + shadeA.toFixed(3) + ")");
        sg.addColorStop(1, "rgba(5,28,41,0)");
        ctx.fillStyle = sg;
        ctx.scale(1, EYE.ry / EYE.rx);
        ctx.beginPath(); ctx.arc(0, 0, EYE.rx * S, 0, 6.2832); ctx.fill();
        ctx.restore();
      }
      /* 2 · light parts along the lash line as the lids open */
      if (wakeE > 0 && wakeE < 1) {
        var open = Math.sin(wakeE * Math.PI);
        for (var lidk = -1; lidk <= 1; lidk += 2) {
          ctx.strokeStyle = "rgba(" + GLOW + "," + (open * 0.22 * rasterA).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (var lq = 0; lq < LASH.pts.length; lq += 3) {
            var lx = X(LASH.pts[lq][0]) + fx;
            var ly = Y(LASH.pts[lq][1]) + fy + lift * 0.5 + lidk * wakeE * 3.5 * S;
            if (lq === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
          }
          ctx.stroke();
        }
        /* a faint iris glint at the peak */
        glowDot(ecx, ecy, 1.6, open * 0.26 * rasterA, open * 0.05 * rasterA);
      }
    }

    /* ---- layer 5 (behind graphics) · FLOWING RIBBONS ---- */
    var ribA = (ei < 1 ? ease(clamp01((ei - 0.66) / 0.32)) : 1) * alphaAll;
    if (ribA > 0.01) {
      for (var ri = 0; ri < RIBBONS.length; ri++) {
        var R = RIBBONS[ri];
        var sway = reduced ? 0 : 1.4 + pe * 1.6;
        for (var s2 = 0; s2 < 4; s2++) {
          var a2 = (0.03 - s2 * 0.005) * ribA * (1 + pe * 1.1);
          if (a2 <= 0.003) continue;
          ctx.strokeStyle = "rgba(" + LINE + "," + a2.toFixed(4) + ")";
          ctx.lineWidth = R.w * S * (1 - s2 * 0.18);
          ctx.beginPath();
          for (var q2 = 0; q2 < R.P.pts.length; q2 += 2) {
            var wob = reduced ? 0 :
              Math.sin(t * R.spd + q2 * 0.18 + ri * 2.1) * R.amp * sway +
              Math.sin(t * R.spd * 1.7 + q2 * 0.07 + s2) * R.amp * 0.4 * sway;
            var rxp = X(R.P.pts[q2][0]) + rx, ryp = Y(R.P.pts[q2][1]) + ry + wob * S + lift * 1.1;
            if (q2 === 0) ctx.moveTo(rxp, ryp); else ctx.lineTo(rxp, ryp);
          }
          ctx.stroke();
        }
      }
    }

    /* ---- layer 2 · FACIAL MAPPING ---- */
    for (var mi = 0; mi < MAPS.length; mi++) {
      var M = MAPS[mi];
      /* intro draw-in: the line writes itself along its length */
      var drawn = ei < 1 ? ease(clamp01((ei - M.reveal) / 0.3)) : 1;
      if (drawn <= 0) continue;
      /* proximity: closer cursor → brighter line */
      var dM = Math.hypot(mpx - (X(M.cx) + gx), mpy - (Y(M.cy) + gy));
      var near = clamp01(1 - dM / (260 * S + 120));
      /* scroll: the analysis layer comes forward */
      var strokeA = ((0.05 + 0.02 * BRM) + stAnatomy * 0.3 + near * 0.22 + (ei < 1 ? 0.22 * (1 - ei) + 0.1 : 0)) * alphaAll;
      strokeA *= 1 - peLate * 0.3;
      var maxD = M.len * drawn;
      if (strokeA > 0.012) {
        ctx.strokeStyle = "rgba(" + LINE + "," + strokeA.toFixed(3) + ")";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        var moved = false;
        for (var qi = 0; qi < M.pts.length; qi++) {
          if (M.cum[qi] > maxD) break;
          var qx = X(M.pts[qi][0]) + gx, qy = Y(M.pts[qi][1]) + gy + lift * 0.9;
          if (!moved) { ctx.moveTo(qx, qy); moved = true; } else ctx.lineTo(qx, qy);
        }
        ctx.stroke();
      }
      /* the slow traveling light */
      if (!reduced && drawn >= 1) {
        for (var li2 = 0; li2 < lights.length; li2++) {
          var L2 = lights[li2];
          if (L2.path !== mi) continue;
          L2.d += L2.spd * 0.016 * (1 + pe * 2.2);
          if (L2.d >= 1) L2.d = 0;
          pathAt(M, L2.d * M.len, P);
          var duty = Math.sin(L2.d * Math.PI); /* bright mid-path, dark at ends */
          var la = (0.42 * duty + near * 0.3) * alphaAll * (1 - peLate * 0.4);
          glowDot(X(P.x) + gx, Y(P.y) + gy + lift * 0.9, 1.5, la, la * 0.16);
        }
      }
    }

    /* proximity pulses (extra light fired when the cursor visits a feature) */
    for (var pu = pulses.length - 1; pu >= 0; pu--) {
      var PU = pulses[pu];
      PU.d += 0.014;
      if (PU.d >= 1) { pulses.splice(pu, 1); continue; }
      var MP = MAPS[PU.path];
      pathAt(MP, PU.d * MP.len, P);
      var pa2 = Math.sin(PU.d * Math.PI) * 0.5 * alphaAll;
      glowDot(X(P.x) + gx, Y(P.y) + gy + lift * 0.9, 1.6, pa2, pa2 * 0.2);
    }

    /* ---- the silk is a living fluid ----
       The artwork's fabric band is re-drawn as a fine tile grid. A wave
       radiates OUTWARD FROM THE FACE (phase = distance from the chin), so
       every part of the cloth moves with a traveling delay — subtle near
       her, deeper as it flows away — with a secondary ripple and a micro
       horizontal sway on independent frequencies. Offsets oscillate around
       zero, so the forms stay anchored and the motion never resets. */
    if (artReady && rasterA > 0.01 && !reduced) {
      var BAND_Y = 700, STW = 26, STH = 82;
      var SRCX = 900, SRCY = 650; /* the energy source: her chin/jaw */
      ctx.globalAlpha = rasterA;
      for (var syy = BAND_Y; syy < IH; syy += STH) {
        var rowRamp = Math.min(1, (syy - BAND_Y) / 150 + 0.18); /* quiet seam */
        var tileH = Math.min(STH, IH - syy);
        for (var sxx = 0; sxx < AW; sxx += STW) {
          var cxi = sxx + CROP_X + STW / 2, cyi = syy + tileH / 2;
          var dist = Math.hypot(cxi - SRCX, cyi - SRCY);
          /* amplitude: near-face stillness, growing as the wave travels out */
          var amp = (1.2 + 6.5 * clamp01((dist - 70) / 480)) * rowRamp * (1 + pe * 0.7);
          /* main outward wave + secondary ripple + slow counter-swell */
          var ph = dist * 0.013 - t * 1.05;
          var dyw = (Math.sin(ph) +
                     0.38 * Math.sin(dist * 0.031 + t * 1.7 + cxi * 0.006) +
                     0.5 * Math.sin(dist * 0.006 + t * 0.4)) * amp * S;
          var dxw = Math.cos(ph * 0.9 + 1.3) * amp * 0.35 * S;
          ctx.drawImage(art, sxx, syy, STW, tileH,
            X(CROP_X) + fx + sxx * S + dxw,
            OY + fy + lift * 0.5 + syy * S + dyw,
            STW * S, tileH * S);
        }
      }
      ctx.globalAlpha = 1;
    }

    /* ---- the holographic treatment: the face reads as an AI scan ---- */
    if (!reduced && rasterA > 0.05) {
      var fL = X(690), fR = X(1260), fT = Y(30), fB = Y(1000);
      /* a pale tint breathes over her — restrained, clinical, never neon.
         The fill rect fully contains the gradient so it has no edges. */
      var htx = X(920) + fx, hty = Y(360) + fy;
      var hg = ctx.createRadialGradient(htx, hty, 0, htx, hty, 430 * S);
      hg.addColorStop(0, "rgba(78,207,224," + ((0.028 + 0.014 * BRM) * rasterA).toFixed(4) + ")");
      hg.addColorStop(1, "rgba(78,207,224,0)");
      ctx.fillStyle = hg;
      ctx.fillRect(htx - 440 * S, hty - 440 * S, 880 * S, 880 * S);
      /* the reading: a fine light line drifts down the face every ~8s,
         fading out toward its ends — no rectangular sweep band */
      var scu = (t % 8) / 8;
      var scy = fT + (fB - fT) * scu;
      var scA = Math.sin(scu * Math.PI) * rasterA;
      var scx2 = (fL + fR) / 2;
      ctx.save();
      ctx.translate(scx2, scy - 18);
      ctx.scale((fR - fL) / 120, 1);
      var trail = ctx.createRadialGradient(0, 0, 0, 0, 0, 55);
      trail.addColorStop(0, "rgba(120,220,235," + (scA * 0.04).toFixed(4) + ")");
      trail.addColorStop(1, "rgba(120,220,235,0)");
      ctx.fillStyle = trail;
      ctx.fillRect(-58, -58, 116, 116);
      ctx.restore();
      var lng = ctx.createLinearGradient(fL, 0, fR, 0);
      lng.addColorStop(0, "rgba(180,235,245,0)");
      lng.addColorStop(0.5, "rgba(180,235,245," + (scA * 0.13).toFixed(4) + ")");
      lng.addColorStop(1, "rgba(180,235,245,0)");
      ctx.fillStyle = lng;
      ctx.fillRect(fL, scy, fR - fL, 1.2);
      /* luminous rim along her profile — the hologram's edge light */
      ctx.strokeStyle = "rgba(120,220,235," + ((0.16 + 0.07 * BRM) * rasterA).toFixed(4) + ")";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var rp = 0; rp < EDGES[0].P.pts.length; rp += 2) {
        var rpx = X(EDGES[0].P.pts[rp][0]) + fx, rpy = Y(EDGES[0].P.pts[rp][1]) + fy + lift * 0.5;
        if (rp === 0) ctx.moveTo(rpx, rpy); else ctx.lineTo(rpx, rpy);
      }
      ctx.stroke();
    }

    /* measurement ticks — a facial scan reading along her profile */
    if (!reduced && rasterA > 0.05) {
      ctx.strokeStyle = "rgba(160,225,238," + (0.22 * rasterA).toFixed(3) + ")";
      ctx.lineWidth = 1;
      var EP = EDGES[0].P;
      for (var tk = 4; tk < EP.pts.length - 4; tk += 7) {
        var tOn = 0.5 + 0.5 * Math.sin(t * 0.9 + tk * 1.3);
        if (tOn < 0.55) continue;
        var pA2 = EP.pts[tk], pB2 = EP.pts[tk + 1];
        var nx2 = -(pB2[1] - pA2[1]), ny2 = pB2[0] - pA2[0];
        var nl2 = Math.hypot(nx2, ny2) || 1;
        nx2 = (nx2 / nl2) * 7; ny2 = (ny2 / nl2) * 7;
        ctx.globalAlpha = (tOn - 0.55) * 2.2;
        ctx.beginPath();
        ctx.moveTo(X(pA2[0] - nx2) + fx, Y(pA2[1] - ny2) + fy + lift * 0.5);
        ctx.lineTo(X(pA2[0] + nx2) + fx, Y(pA2[1] + ny2) + fy + lift * 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      /* fine reading lines drift over the rear side — faded at BOTH ends
         so they can never draw a rectangle edge */
      var slDrift = (t * 6) % 16;
      for (var sl = Y(60) + slDrift; sl < Y(660); sl += 16 * S) {
        var slg = ctx.createLinearGradient(X(880), 0, X(1320), 0);
        slg.addColorStop(0, "rgba(120,214,232,0)");
        slg.addColorStop(0.62, "rgba(120,214,232," + (0.022 * rasterA).toFixed(4) + ")");
        slg.addColorStop(1, "rgba(120,214,232,0)");
        ctx.fillStyle = slg;
        ctx.fillRect(X(880) + fx, sl + fy, (1320 - 880) * S, 1);
      }
    }

    /* ---- the face's own life: a natural blink + living skin light ---- */
    if (!reduced && ei >= 1 && rasterA > 0.05) {
      /* blink: a soft lid shadow closes and lifts (smooth, occasional) */
      if (t > nextBlink) { blinkStart = t; nextBlink = t + 5 + Math.random() * 6; }
      var bu = (t - blinkStart) / 0.5;
      if (bu >= 0 && bu <= 1) {
        var bshade = Math.sin(bu * Math.PI);
        bshade = bshade * bshade;
        var bex = X(902) + fx, bey = Y(206) + fy + lift * 0.5;
        ctx.save();
        ctx.translate(bex, bey);
        ctx.rotate(-0.35);
        ctx.scale(1, 26 / 58);
        var bg2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 58 * S);
        bg2.addColorStop(0, "rgba(4,20,32," + (bshade * 0.34 * rasterA).toFixed(3) + ")");
        bg2.addColorStop(1, "rgba(4,20,32,0)");
        ctx.fillStyle = bg2;
        ctx.beginPath(); ctx.arc(0, 0, 58 * S, 0, 6.2832); ctx.fill();
        ctx.restore();
      }
      /* living light: a soft highlight wanders her profile and cheek */
      pathAt(EDGES[0].P, (0.5 + 0.5 * Math.sin(t * 0.055)) * EDGES[0].P.len, P);
      var l1x = X(P.x) + fx, l1y = Y(P.y) + fy + lift * 0.5;
      var lg1 = ctx.createRadialGradient(l1x, l1y, 0, l1x, l1y, 120 * S);
      lg1.addColorStop(0, "rgba(230,240,248," + (0.05 * rasterA).toFixed(3) + ")");
      lg1.addColorStop(1, "rgba(230,240,248,0)");
      ctx.fillStyle = lg1;
      ctx.fillRect(l1x - 130 * S, l1y - 130 * S, 260 * S, 260 * S);
      var chu = 0.5 + 0.5 * Math.sin(t * 0.041 + 2.1);
      var l2x = X(880 + 120 * chu) + fx, l2y = Y(300 + 150 * chu) + fy + lift * 0.5;
      var lg2 = ctx.createRadialGradient(l2x, l2y, 0, l2x, l2y, 150 * S);
      lg2.addColorStop(0, "rgba(214,229,238," + (0.036 * rasterA).toFixed(3) + ")");
      lg2.addColorStop(1, "rgba(214,229,238,0)");
      ctx.fillStyle = lg2;
      ctx.fillRect(l2x - 160 * S, l2y - 160 * S, 320 * S, 320 * S);
    }

    /* ---- the conversion: parts of HER become digital, then return ---- */
    function drawRegion(RG, depth) {
      if (depth <= 0.02) return;
      var dgx = fx + smx * 3 * PAR, dgy = fy + smy * 2 * PAR;
      var rcx = X(RG.c[0]) + fx, rcy = Y(RG.c[1]) + fy + lift * 0.5;
      /* the skin dissolves away beneath */
      var vg = ctx.createRadialGradient(rcx, rcy, 0, rcx, rcy, RG.r * 1.25 * S);
      vg.addColorStop(0, "rgba(5,28,41," + (depth * 0.72 * rasterA).toFixed(3) + ")");
      vg.addColorStop(0.7, "rgba(5,28,41," + (depth * 0.4 * rasterA).toFixed(3) + ")");
      vg.addColorStop(1, "rgba(5,28,41,0)");
      ctx.fillStyle = vg;
      var rr2 = RG.r * 1.3 * S;
      ctx.fillRect(rcx - rr2, rcy - rr2, rr2 * 2, rr2 * 2);
      /* ...and its own pixels float in its place */
      ctx.lineWidth = 0.55;
      for (var e2 = 0; e2 < RG.edges.length; e2++) {
        var ea = RG.pts[RG.edges[e2][0]], eb = RG.pts[RG.edges[e2][1]];
        var er = clamp01(depth * 1.7 - (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.4 + e2 * 2.7))));
        if (er <= 0.03) continue;
        ctx.strokeStyle = "rgba(" + LINE + "," + (er * depth * 0.3 * rasterA).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(X(ea.x) + dgx, Y(ea.y) + dgy + lift * 0.5);
        ctx.lineTo(X(eb.x) + dgx, Y(eb.y) + dgy + lift * 0.5);
        ctx.stroke();
      }
      for (var k2 = 0; k2 < RG.pts.length; k2++) {
        var q3 = RG.pts[k2];
        if (!q3.col) q3.col = skin(q3.x, q3.y);
        var tw = 0.55 + 0.45 * Math.sin(t * 1.1 + q3.ph);
        var scat = depth * (3 + 5 * hash(k2 * 9.7)); /* points loosen as skin converts */
        var brSc = 1 + (BRM - 0.5) * 0.08; /* the living mesh breathes */
        var qx = X(RG.c[0] + (q3.x - RG.c[0]) * brSc) + fx + Math.cos(q3.jr + t * 0.5) * scat;
        var qy = Y(RG.c[1] + (q3.y - RG.c[1]) * brSc) + fy + lift * 0.5 + Math.sin(q3.jr * 1.7 + t * 0.4) * scat;
        /* skin tone → digital pale-cyan as conversion deepens */
        var mixk = 0.3 + depth * 0.5;
        var cr = (q3.col[0] + (188 - q3.col[0]) * mixk) | 0;
        var cg = (q3.col[1] + (226 - q3.col[1]) * mixk) | 0;
        var cb = (q3.col[2] + (238 - q3.col[2]) * mixk) | 0;
        ctx.fillStyle = "rgba(" + cr + "," + cg + "," + cb + "," + (depth * tw * 0.9 * rasterA).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(qx, qy, 1.3 + depth * 0.6, 0, 6.2832);
        ctx.fill();
      }
    }
    if (!reduced && ei >= 1 && rasterA > 0.08 && IMGD) {
      if (!REGIONS) initRegions();
      /* the AI half: an organic pool deepens toward the rear of the head —
         skin → translucent → digital structure. Radial, so it can never
         read as a rectangle against the artwork. */
      var hvx = X(1155) + fx, hvy = Y(330) + fy + lift * 0.5;
      var hvg = ctx.createRadialGradient(hvx, hvy, 0, hvx, hvy, 420 * S);
      hvg.addColorStop(0, "rgba(5,28,41," + (0.46 * rasterA).toFixed(3) + ")");
      hvg.addColorStop(0.6, "rgba(5,28,41," + (0.26 * rasterA).toFixed(3) + ")");
      hvg.addColorStop(1, "rgba(5,28,41,0)");
      ctx.fillStyle = hvg;
      ctx.fillRect(hvx - 430 * S, hvy - 430 * S, 860 * S, 860 * S);
      /* the crown edge glows — the hologram's rear contour */
      ctx.strokeStyle = "rgba(120,220,235," + ((0.08 + 0.05 * BRM) * rasterA).toFixed(4) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var cr2 = 0; cr2 < EDGES[1].P.pts.length; cr2 += 2) {
        var crx = X(EDGES[1].P.pts[cr2][0]) + fx, cry = Y(EDGES[1].P.pts[cr2][1]) + fy + lift * 0.5;
        if (cr2 === 0) ctx.moveTo(crx, cry); else ctx.lineTo(crx, cry);
      }
      ctx.stroke();

      /* the hybrid: the rear half of the head is permanently digital */
      for (var pz = 0; pz < PERM.length; pz++) {
        var pd = Math.min(1, (0.52 + 0.16 * (0.5 + 0.5 * Math.sin(t * 0.5 + pz * 1.6)) + stKnowledge * 0.25 + pe * 0.4)) * clamp01(rasterA * 1.4);
        drawRegion(PERM[pz], pd);
      }
      /* CONTINUOUS life: every region simmers on its own slow phase... */
      for (var rg2 = 0; rg2 < REGIONS.length; rg2++) {
        if (rg2 === patch.idx) continue; /* the active one is drawn below, deeper */
        var amb2 = 0.12 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.33 + rg2 * 1.9)) + pe * 0.4;
        drawRegion(REGIONS[rg2], amb2 * (0.8 + stKnowledge * 0.4));
      }
      /* ...while one region at a time converts deeply and returns */
      var pAge = t - patch.start;
      if (pAge > patch.D + patch.gap) {
        patch.start = t;
        patch.seq++;
        patch.idx = patch.seq < 4
          ? patch.seq % 4
          : (patch.idx + 1 + ((Math.random() * 2) | 0)) % REGIONS.length;
        patch.shed = 0;
        pAge = 0;
      }
      if (pAge >= 0 && pAge <= patch.D) {
        var ph = pAge / patch.D;
        var env = ph < 0.32 ? ease(ph / 0.32) : ph > 0.6 ? 1 - ease((ph - 0.6) / 0.4) : 1;
        drawRegion(REGIONS[patch.idx], 0.18 + env * (0.62 + stKnowledge * 0.3));
        /* while dissolving, a few of its points detach into the network */
        if (ph > 0.6 && patch.shed < 4 && emits.length) {
          patch.shed++;
          var esc = emits[(Math.random() * emits.length) | 0];
          var pc = REGIONS[patch.idx].c;
          esc.x = pc[0] + (Math.random() - 0.5) * 50;
          esc.y = pc[1] + (Math.random() - 0.5) * 50;
          esc.vx = 16 + Math.random() * 16; esc.vy = -8 - Math.random() * 12;
          esc.ttl = 3 + Math.random() * 2; esc.age = 0;
          esc.col = skin(esc.x, esc.y);
        }
      }
    }

    /* ---- the living wireframe: a wave of digitization travels the face ---- */
    if (!reduced && ei >= 1 && rasterA > 0.08 && FACEMESH) {
      var mw = 0.55 + stKnowledge * 0.45;
      ctx.lineWidth = 0.5;
      for (var we = 0; we < FACEMESH.edges.length; we++) {
        var wa2 = FACEMESH.pts[FACEMESH.edges[we][0]], wb2 = FACEMESH.pts[FACEMESH.edges[we][1]];
        var wv = Math.sin(t * 0.7 - (wa2.x * 0.006 + wa2.y * 0.003));
        wv = clamp01(wv * 1.4 - 0.5);
        wv = Math.max(wv, clamp01((wa2.x - 930) / 320) * 0.85); /* AI side: always on */
        if (wv <= 0.03) continue;
        ctx.strokeStyle = "rgba(120,214,232," + (wv * 0.24 * mw * rasterA).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(X(wa2.x) + fx, Y(wa2.y) + fy + lift * 0.5);
        ctx.lineTo(X(wb2.x) + fx, Y(wb2.y) + fy + lift * 0.5);
        ctx.stroke();
      }
      for (var wp = 0; wp < FACEMESH.pts.length; wp++) {
        var q4 = FACEMESH.pts[wp];
        var wv2 = Math.sin(t * 0.7 - (q4.x * 0.006 + q4.y * 0.003));
        wv2 = clamp01(wv2 * 1.4 - 0.5);
        wv2 = Math.max(wv2, clamp01((q4.x - 930) / 320) * 0.9); /* AI side: always on */
        if (wv2 <= 0.03) continue;
        ctx.fillStyle = "rgba(170,230,242," + (wv2 * 0.55 * mw * rasterA).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(X(q4.x) + fx, Y(q4.y) + fy + lift * 0.5, 1, 0, 6.2832);
        ctx.fill();
      }
    }

    /* ---- layer 3 · ANATOMICAL MARKERS ---- */    /* ---- the living wireframe: a wave of digitization travels the face ---- */
    if (!reduced && ei >= 1 && rasterA > 0.08 && FACEMESH) {
      var mw = 0.55 + stKnowledge * 0.45;
      ctx.lineWidth = 0.5;
      for (var we = 0; we < FACEMESH.edges.length; we++) {
        var wa2 = FACEMESH.pts[FACEMESH.edges[we][0]], wb2 = FACEMESH.pts[FACEMESH.edges[we][1]];
        var wv = Math.sin(t * 0.7 - (wa2.x * 0.006 + wa2.y * 0.003));
        wv = clamp01(wv * 1.4 - 0.5);
        wv = Math.max(wv, clamp01((wa2.x - 930) / 320) * 0.85); /* AI side: always on */
        if (wv <= 0.03) continue;
        ctx.strokeStyle = "rgba(120,214,232," + (wv * 0.24 * mw * rasterA).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(X(wa2.x) + fx, Y(wa2.y) + fy + lift * 0.5);
        ctx.lineTo(X(wb2.x) + fx, Y(wb2.y) + fy + lift * 0.5);
        ctx.stroke();
      }
      for (var wp = 0; wp < FACEMESH.pts.length; wp++) {
        var q4 = FACEMESH.pts[wp];
        var wv2 = Math.sin(t * 0.7 - (q4.x * 0.006 + q4.y * 0.003));
        wv2 = clamp01(wv2 * 1.4 - 0.5);
        wv2 = Math.max(wv2, clamp01((q4.x - 930) / 320) * 0.9); /* AI side: always on */
        if (wv2 <= 0.03) continue;
        ctx.fillStyle = "rgba(170,230,242," + (wv2 * 0.55 * mw * rasterA).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(X(q4.x) + fx, Y(q4.y) + fy + lift * 0.5, 1, 0, 6.2832);
        ctx.fill();
      }
    }

    /* ---- layer 3 · ANATOMICAL MARKERS ---- */
    ctx.lineWidth = 0.6;
    for (var ln = 0; ln < MARKER_LINKS.length; ln++) {
      var A2 = MARKERS[MARKER_LINKS[ln][0]], B2 = MARKERS[MARKER_LINKS[ln][1]];
      var lnA = (ei < 1 ? ease(clamp01((ei - 0.6) / 0.26)) : 1) * (0.07 + stPrecision * 0.14) * alphaAll * (1 - peLate * 0.5);
      if (lnA > 0.01) {
        ctx.strokeStyle = "rgba(" + SOFT + "," + lnA.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(X(A2.x) + gx, Y(A2.y) + gy + lift * 0.9);
        ctx.lineTo(X(B2.x) + gx, Y(B2.y) + gy + lift * 0.9);
        ctx.stroke();
      }
    }
    for (var mk = 0; mk < MARKERS.length; mk++) {
      var MK = MARKERS[mk];
      var mrev = ei < 1 ? ease(clamp01((ei - MK.reveal) / 0.18)) : 1;
      if (mrev <= 0) continue;
      /* soft breathing, a touch stronger when the cursor is near */
      var breathe = reduced ? 0.8 : 0.62 + 0.38 * Math.sin(t * 0.8 + mk * 2.4);
      var dmk = Math.hypot(mpx - X(MK.x), mpy - Y(MK.y));
      var nearM = clamp01(1 - dmk / 140);
      var core = (MK.cal ? 0.46 : 0.26) * (1 + stPrecision * 0.7) * breathe * mrev * alphaAll * (1 - peLate * 0.4) + nearM * 0.3;
      glowDot(X(MK.x) + gx, Y(MK.y) + gy + lift * 0.9, MK.r, Math.min(0.85, core), core * 0.14);
    }

    /* ---- orbital arcs — always circling her ---- */
    if (!reduced) {
      var orbA = (ei < 1 ? ease(clamp01((ei - 0.6) / 0.3)) : 1) * alphaAll * (1 - pe * 0.5);
      if (orbA > 0.02) {
        var ocx = X(940) + hx * 0.6, ocy = Y(330) + hy * 0.6 + lift;
        var ORBS = [
          { r: 330, spd: 0.05, arc: 2.4, a: 0.16 },
          { r: 430, spd: -0.032, arc: 1.6, a: 0.11 },
          { r: 520, spd: 0.02, arc: 3.1, a: 0.07 },
        ];
        ctx.lineWidth = 0.9;
        for (var ob = 0; ob < ORBS.length; ob++) {
          var O = ORBS[ob];
          var ang = t * O.spd + ob * 2.1;
          ctx.strokeStyle = "rgba(" + LINE + "," + (orbA * O.a).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(ocx, ocy, O.r * S, ang, ang + O.arc);
          ctx.stroke();
          var dx2 = ocx + Math.cos(ang) * O.r * S, dy2 = ocy + Math.sin(ang) * O.r * S;
          glowDot(dx2, dy2, 1.6, orbA * 0.5, orbA * 0.08);
        }
      }
    }

    /* ---- layer 4 · HUD ---- */
    var hudA = (ei < 1 ? ease(clamp01((ei - 0.72) / 0.26)) : 1) * alphaAll * (0.42 + stKnowledge * 0.45);
    if (hudA > 0.01 && !mobile) {
      var hcx = X(HUD.x) + hx, hcy = Y(HUD.y) + hy + lift * 1.2;
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "rgba(" + LINE + "," + (hudA * 0.4).toFixed(3) + ")";
      var rot = reduced ? 0 : t * 0.07;
      ctx.beginPath(); ctx.arc(hcx, hcy, HUD.r1 * S, rot, rot + 5.9); ctx.stroke();
      ctx.strokeStyle = "rgba(" + LINE + "," + (hudA * 0.55).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(hcx, hcy, HUD.r2 * S, -rot * 2, -rot * 2 + 5.4); ctx.stroke();
      var hp = reduced ? 1 : 0.72 + 0.28 * Math.sin(t * 0.52);
      glowDot(hcx, hcy, 2, hudA * hp, hudA * 0.12);
      /* the vertical measure line + its quiet dots */
      ctx.strokeStyle = "rgba(" + LINE + "," + (hudA * 0.25).toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(hcx, Y(HUD.lineTop) + hy + lift * 1.2);
      ctx.lineTo(hcx, Y(HUD.lineBot) + hy + lift * 1.2);
      ctx.stroke();
      for (var hd = 0; hd < HUD_DOTS.length; hd++) {
        var hb = reduced ? 0.8 : 0.62 + 0.38 * Math.sin(t * 0.52 + hd * 2.1);
        glowDot(X(HUD_DOTS[hd][0]) + hx, Y(HUD_DOTS[hd][1]) + hy + lift * 1.2, 1.6, hudA * 0.5 * hb, hudA * 0.08);
      }
    }

    /* ---- edge dissolution: the silhouette sheds points into the network ---- */
    if (!reduced && ei > 0.5) {
      var shedGate = ease(clamp01((ei - 0.5) / 0.4)) * (0.8 + stKnowledge * 0.8);
      for (var ee = 0; ee < emits.length; ee++) {
        var EM = emits[ee];
        EM.age += 0.016;
        if (EM.age > EM.ttl) { seedEmit(EM); EM.col = null; }
        if (EM.age < 0) continue;
        var lp = EM.age / EM.ttl;
        var exx = X(EM.x + EM.vx * EM.age) + px2;
        var eyy = Y(EM.y + EM.vy * EM.age + Math.sin(EM.age * 1.4 + ee) * 4) + py2 + lift * 1.2;
        var ealpha = Math.sin(lp * Math.PI) * 0.55 * shedGate * alphaAll * (0.4 + rasterA * 0.6);
        if (ealpha <= 0.015) continue;
        if (!EM.col) EM.col = skin(EM.x, EM.y);
        var mk2 = 0.25 + lp * 0.65; /* skin → signal along its journey */
        var er2 = (EM.col[0] + (188 - EM.col[0]) * mk2) | 0;
        var eg2 = (EM.col[1] + (226 - EM.col[1]) * mk2) | 0;
        var eb2 = (EM.col[2] + (238 - EM.col[2]) * mk2) | 0;
        ctx.fillStyle = "rgba(" + er2 + "," + eg2 + "," + eb2 + "," + ealpha.toFixed(3) + ")";
        if (EM.sq) ctx.fillRect(exx - EM.sz, eyy - EM.sz, EM.sz * 2, EM.sz * 2);
        else { ctx.beginPath(); ctx.arc(exx, eyy, EM.sz, 0, 6.2832); ctx.fill(); }
      }
    }

    /* ---- layer 6 · DATA PARTICLES (along the mapping flow) ---- */
    if (!reduced) {
      var partA = (ei < 1 ? (0.4 * ease(clamp01((ei - 0.04) / 0.25)) + 0.6 * ease(clamp01((ei - 0.74) / 0.26))) : 1) * alphaAll;
      for (var pp = 0; pp < parts.length; pp++) {
        var PT = parts[pp];
        PT.d += PT.spd * 0.016 * (1 + pe * 2.4);
        if (PT.d >= 1) { PT.d = 0; PT.path = (Math.random() * MAPS.length) | 0; }
        var MPP = MAPS[PT.path];
        pathAt(MPP, PT.d * MPP.len, P);
        var pa3 = (0.1 + 0.26 * Math.sin(PT.d * Math.PI)) * partA * (0.3 + stKnowledge * 1.5);
        if (pa3 <= 0.02) continue;
        ctx.fillStyle = "rgba(" + LINE + "," + Math.min(0.6, pa3).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(X(P.x + PT.off) + px2, Y(P.y + PT.off * 0.4) + py2 + lift * 1.3, PT.sz, 0, 6.2832);
        ctx.fill();
      }
    }

    ctx.restore(); /* close the living-camera transform */

    /* ---- the hand-off: light rises from below as she resolves into the
       next scene (drawn outside the camera so it hugs the viewport) ---- */
    if (!reduced && pe > 0.05) {
      var hoA = ease(pe) * ease(pe) * 0.62;
      var hog = ctx.createLinearGradient(0, ch, 0, ch * 0.45);
      hog.addColorStop(0, "rgba(255,255,255," + hoA.toFixed(3) + ")");
      hog.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hog;
      ctx.fillRect(0, ch * 0.45, cw, ch * 0.55);
    }
  }

  /* ---------- loop ---------- */
  var heroVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
    }).observe(heroSection);
  }

  var clock0 = performance.now();
  var sizeCheck = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!heroVisible || document.hidden) return;
    /* resize events can be missed while backgrounded (mobile URL bar,
       tab switches) — re-measure periodically so the face never stretches */
    if (++sizeCheck >= 30) {
      sizeCheck = 0;
      var pb = canvas.parentElement.getBoundingClientRect();
      if (Math.abs(pb.width - cw) > 1 || Math.abs(pb.height - ch) > 1) layout();
    }
    var t = (now - clock0) / 1000;
    if (mobile) { mx = Math.sin(t * 0.12) * 0.4; my = Math.cos(t * 0.085) * 0.35; }
    smx += (mx - smx) * 0.05;
    smy += (my - smy) * 0.05;
    var p = scrollProgress();

    if (!introDone) {
      if (window.scrollY > window.innerHeight * 0.4) finishIntro();
      else {
        if (introStart < 0) introStart = t;
        var it = (t - introStart) / INTRO_D;
        if (it >= 1) finishIntro();
        else introE = ease(it < 0 ? 0 : it);
      }
    }
    /* she opens her eyes ~30% into the copy's entrance, over ~1s, once */
    if (introDone && wakeE < 1) {
      if (wakeStart < 0) wakeStart = t + 0.85;
      else if (t > wakeStart) wakeE = ease(clamp01((t - wakeStart) / 1.05));
    }

    /* cursor near eye / nose / lips → a light runs through nearby mapping */
    if (!reduced && introDone && t > featPulseAt) {
      for (var f = 0; f < FEATURES.length; f++) {
        var FF = FEATURES[f];
        if (Math.hypot(mpx - X(FF.x), mpy - Y(FF.y)) < FF.r * S + 40) {
          featPulseAt = t + 2.2;
          var bestP = 0, bestD = 1e9;
          for (var m2 = 0; m2 < MAPS.length; m2++) {
            var dd = Math.hypot(MAPS[m2].cx - FF.x, MAPS[m2].cy - FF.y);
            if (dd < bestD) { bestD = dd; bestP = m2; }
          }
          if (pulses.length < 3) pulses.push({ path: bestP, d: 0 });
          break;
        }
      }
    }

    draw(t, p);
  }

  if (reduced) {
    draw(0, 0);
    window.addEventListener("resize", function () { layout(); draw(0, 0); });
  } else {
    requestAnimationFrame(frame);
  }
})();
