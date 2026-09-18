/* Cairo FACE — the canvas film (z-0).
   One fixed canvas, scenes cross-faded by scroll, camera damped —
   never mapped raw. Reads the shared scroll store window.CF that main.js
   writes; there is exactly one scroll listener in the app.

   Scene arc (our palette): navy opening (ambient dust + data squares —
   the hero woman herself is the reference artwork, a DOM image layer in
   index.html, NOT drawn here) → bloom white-out under the stats → pale
   rings → a ring tunnel for the gains → a navy particle river that
   resolves into a face profile for the days → pale hush for the voices. */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("film");

let THREE = null;
if (!reduced && canvas) {
  try {
    THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
  } catch (e) {
    console.warn("film3d: three.js unavailable — flat gradients stay", e);
  }
}

if (THREE && canvas) {
  const CF = window.CF || { y: 0, vh: innerHeight, scenes: [], tailTop: 1e9 };

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  scene.add(world);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(0, 0, 7);
  scene.fog = new THREE.Fog(0x051c29, 9, 40);

  /* ---------- palette ---------- */
  const C = {
    navy: new THREE.Color("#051C29"), /* matches img/face3-src.png ground exactly */
    deep: new THREE.Color("#16405F"),
    steel: new THREE.Color("#2F5B85"),
    brand: new THREE.Color("#5288B0"),
    pale: new THREE.Color("#EEF4F9"),
    mist: new THREE.Color("#E7EFF6"),
    white: new THREE.Color("#FFFFFF"),
  };
  const SCENE_BG = {
    hero: C.navy,
    manifesto: C.white, /* ramped from navy inside its range */
    numbers: C.pale,
    plan: C.steel,
    days: C.navy,
    voices: C.mist,
  };

  /* ---------- helpers ---------- */
  const track = []; /* {group, mats:[{m, base}], key} for weight fades */
  function register(key, group) {
    const mats = [];
    group.traverse((o) => {
      if (o.material) mats.push({ m: o.material, base: o.material.opacity ?? 1 });
    });
    mats.forEach(({ m }) => { m.transparent = true; });
    track.push({ key, group, mats });
    world.add(group);
    return group;
  }
  function setWeight(entry, w) {
    entry.group.visible = w > 0.01;
    if (!entry.group.visible) return;
    entry.mats.forEach(({ m, base }) => { m.opacity = base * w; });
  }

  function dust(count, spread, hex, size, op) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: hex, size: size, transparent: true, opacity: op,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    return p;
  }

  function glowTexture() {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(220,236,250,0.55)");
    g.addColorStop(1, "rgba(220,236,250,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  }

  function circleLine(r, hex, op, segments) {
    const pts = [];
    const n = segments || 96;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op }));
  }

  /* the silhouette curve — used by the days scene's particle river */
  const PROFILE = [
    [0.02, 2.05], [0.18, 2.02], [0.34, 1.9], [0.44, 1.72], [0.5, 1.52],
    [0.5, 1.34], [0.46, 1.22], [0.48, 1.1], [0.56, 0.94], [0.66, 0.78],
    [0.72, 0.68], [0.58, 0.62], [0.6, 0.52], [0.66, 0.44], [0.6, 0.36],
    [0.62, 0.26], [0.56, 0.16], [0.6, 0.04], [0.56, -0.1], [0.4, -0.22],
    [0.18, -0.32], [0.0, -0.38],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const profileCurve = new THREE.CatmullRomCurve3(PROFILE);

  /* ---------- scene 1 · hero ----------
     The hero visual is the reference artwork itself — a DOM <img> layer in
     the hero section, which is opaque #051C29. This group is empty; it only
     keeps the hero's weight in the background-color blend. */
  register("hero", new THREE.Group());

  /* ---------- scene 2 · bloom ---------- */
  const bloomG = new THREE.Group();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glow.position.set(0, 0.6, -2);
  bloomG.add(glow);
  register("manifesto", bloomG);

  /* ---------- scene 3 · numbers: quiet rings ---------- */
  const numG = new THREE.Group();
  [2.6, 3.6, 4.8].forEach((r, i) => {
    const ring = circleLine(r, 0x5288b0, 0.35 - i * 0.08);
    ring.position.z = -1 - i * 0.6;
    ring.userData.spin = 0.011 + i * 0.007;
    numG.add(ring);
  });
  register("numbers", numG);

  /* ---------- scene 4 · gains: ring tunnel ---------- */
  const planG = new THREE.Group();
  const tunnelRings = [];
  for (let i = 0; i < 7; i++) {
    const ring = circleLine(2.2 + (i % 2) * 0.35, 0xffffff, 0.28);
    ring.position.z = -i * 3.2;
    ring.userData.spin = (i % 2 ? -1 : 1) * 0.028;
    tunnelRings.push(ring);
    planG.add(ring);
  }
  planG.add(dust(600, 14, 0xbcd4e8, 0.025, 0.28));
  register("plan", planG);

  /* ---------- scene 5 · days: particle river → the face profile ---------- */
  const N = 2200;
  const riverPos = new Float32Array(N * 3);
  const riverSeed = new Float32Array(N * 2);
  const faceTargets = new Float32Array(N * 3);
  const outline = profileCurve.getPoints(N / 2);
  for (let i = 0; i < N; i++) {
    riverSeed[i * 2] = Math.random() * 24;
    riverSeed[i * 2 + 1] = Math.random();
    const o = outline[i % outline.length];
    const jitter = 0.05;
    faceTargets[i * 3] = (o.x - 0.35) * 3.1 + (Math.random() - 0.5) * jitter;
    faceTargets[i * 3 + 1] = (o.y - 0.85) * 3.1 + (Math.random() - 0.5) * jitter;
    faceTargets[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }
  const riverGeo = new THREE.BufferGeometry();
  riverGeo.setAttribute("position", new THREE.BufferAttribute(riverPos, 3));
  const riverMat = new THREE.PointsMaterial({
    color: 0xcfe4f5, size: 0.04, transparent: true, opacity: 0.62,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const river = new THREE.Points(riverGeo, riverMat);
  river.frustumCulled = false;
  const daysG = new THREE.Group();
  daysG.add(river);
  register("days", daysG);

  /* ---------- scene 6 · voices: a hush ---------- */
  const voicesG = new THREE.Group();
  const hushRing = circleLine(3.4, 0x5288b0, 0.25);
  hushRing.userData.spin = 0.009;
  voicesG.add(hushRing);
  register("voices", voicesG);

  /* ---------- input ---------- */
  let mx = 0, my = 0, smx = 0, smy = 0;
  window.addEventListener("pointermove", (e) => {
    mx = (e.clientX / innerWidth) * 2 - 1;
    my = (e.clientY / innerHeight) * 2 - 1;
  });

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- scroll → scene weights ---------- */
  const bg = new THREE.Color();
  const tmp = new THREE.Color();
  let camZ = 7;

  function weightsAndBg() {
    const vh = CF.vh || innerHeight;
    const sample = CF.y + vh * 0.5;
    const fade = vh * 0.45;
    let total = 0;
    bg.setRGB(0, 0, 0);
    const locals = {};
    track.forEach((entry) => {
      const s = CF.scenes.find((x) => x.key === entry.key);
      if (!s) { setWeight(entry, 0); return; }
      const start = s.top, end = s.top + s.height;
      let w = 0;
      if (sample > start - fade && sample < end + fade) {
        const inA = Math.min(1, (sample - (start - fade)) / fade);
        const outA = Math.min(1, ((end + fade) - sample) / fade);
        w = Math.max(0, Math.min(inA, outA, 1));
      }
      setWeight(entry, w);
      const p = Math.max(0, Math.min(1, (sample - start) / s.height));
      locals[entry.key] = { w, p };
      if (w > 0) {
        tmp.copy(SCENE_BG[entry.key] || C.pale);
        if (entry.key === "manifesto") {
          /* the bloom ramp: white completes just as the hero's edge leaves,
             so the crossfade rides the scene weights — no flash, no seam */
          const pm = Math.max(0, Math.min(1, (sample - (start - vh * 0.4)) / (vh * 0.45)));
          tmp.copy(C.navy).lerp(C.white, pm * pm * (3 - 2 * pm));
        }
        bg.r += tmp.r * w; bg.g += tmp.g * w; bg.b += tmp.b * w;
        total += w;
      }
    });
    if (total > 0) { bg.r /= total; bg.g /= total; bg.b /= total; }
    else bg.copy(CF.y < vh ? C.navy : C.white);
    return locals;
  }

  /* ---------- frame ---------- */
  const clock = new THREE.Clock();

  function frame() {
    const t = clock.getElapsedTime();
    const vh = CF.vh || innerHeight;

    /* canvas hands over to the DOM tail */
    const tailFade = 1 - Math.max(0, Math.min(1, (CF.y + vh - CF.tailTop) / (vh * 0.6)));
    canvas.style.opacity = tailFade.toFixed(2);
    if (tailFade <= 0) { requestAnimationFrame(frame); return; }

    const locals = weightsAndBg();
    renderer.setClearColor(bg, 1);
    scene.fog.color.copy(bg);

    smx += (mx - smx) * 0.05;
    smy += (my - smy) * 0.05;
    world.rotation.y = smx * 0.07;
    world.rotation.x = smy * 0.035;

    /* bloom: the light rushes the camera */
    if (locals.manifesto && locals.manifesto.w > 0) {
      const p = locals.manifesto.p;
      const rush = Math.min(1, (p + 0.1) / 0.32);
      const sc = 3 + rush * 46;
      glow.scale.set(sc, sc, 1);
      glow.material.opacity = 0.9 * (1 - Math.max(0, (p - 0.2) / 0.25));
    }

    /* rings drift */
    numG.children.forEach((r) => { if (r.userData.spin) r.rotation.z += r.userData.spin * 0.016; });
    hushRing.rotation.z += hushRing.userData.spin * 0.016;

    /* gains: dolly through the tunnel */
    let camTarget = 7;
    if (locals.plan && locals.plan.w > 0.02) {
      camTarget = 7 - locals.plan.p * 9;
      tunnelRings.forEach((r) => { r.rotation.z += r.userData.spin * 0.016; });
      planG.position.z = 0;
    }
    camZ += (camTarget - camZ) * 0.08;
    camera.position.z = camZ;

    /* days: river resolves into the profile */
    if (locals.days && locals.days.w > 0) {
      const p = locals.days.p;
      const m = Math.max(0, Math.min(1, (p - 0.4) / 0.35));
      const mm = m * m * (3 - 2 * m);
      for (let i = 0; i < N; i++) {
        const u = ((riverSeed[i * 2] + t * 0.75) % 24) - 12;
        const lane = riverSeed[i * 2 + 1];
        const rx = u;
        const ry = u * 0.32 + Math.sin(u * 1.4 + lane * 9) * 0.5 + (lane - 0.5) * 2.4;
        const rz = Math.cos(u * 0.9 + lane * 7) * 1.2 - 1;
        riverPos[i * 3] = rx + (faceTargets[i * 3] - rx) * mm;
        riverPos[i * 3 + 1] = ry + (faceTargets[i * 3 + 1] - ry) * mm;
        riverPos[i * 3 + 2] = rz + (faceTargets[i * 3 + 2] - rz) * mm;
      }
      riverGeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* ---------- boot ---------- */
  document.body.classList.remove("film-flat");
  document.body.classList.add("film-gl");
  resize();
  /* the beats just grew from their flat heights — re-measure the scene map */
  if (CF.measure) { CF.measure(); requestAnimationFrame(() => CF.measure()); }
  requestAnimationFrame(frame);
}
