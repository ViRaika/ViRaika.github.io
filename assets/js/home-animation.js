(function () {
  if (window.__vrHomeTerrainStop) window.__vrHomeTerrainStop();

  var canvas = document.getElementById('home-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  var terrainCanvas = document.createElement('canvas');
  var terrainCtx = terrainCanvas.getContext('2d', { alpha: true });

  var raf = 0;
  var resizeTimer = 0;
  var W = 1;
  var H = 1;
  var DPR = 1;
  var GRID = 34;
  var start = 0;
  var paused = false;
  var cells = [];

  function seededRand(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return (s >>> 0) / 4294967295;
    };
  }

  var rng = seededRand(137);
  var peaks = [
    { x: 0.50, y: 0.46, amp: 1.00, sig: 0.14 },
    { x: 0.28, y: 0.35, amp: 0.62, sig: 0.10 },
    { x: 0.70, y: 0.30, amp: 0.48, sig: 0.09 },
    { x: 0.65, y: 0.65, amp: 0.55, sig: 0.11 },
    { x: 0.32, y: 0.68, amp: 0.40, sig: 0.08 },
    { x: 0.82, y: 0.52, amp: 0.30, sig: 0.07 },
    { x: 0.18, y: 0.55, amp: 0.28, sig: 0.07 }
  ];

  for (var i = 0; i < 10; i++) {
    peaks.push({
      x: 0.08 + rng() * 0.84,
      y: 0.08 + rng() * 0.84,
      amp: 0.08 + rng() * 0.14,
      sig: 0.04 + rng() * 0.05
    });
  }

  for (var p = 0; p < peaks.length; p++) {
    peaks[p].phase = rng() * Math.PI * 2;
  }

  function rebuildCells() {
    cells = [];
    for (var j = 0; j < GRID; j++) {
      for (var i = 0; i < GRID; i++) {
        cells.push({
          u0: i / GRID, v0: j / GRID,
          u1: (i + 1) / GRID, v1: (j + 1) / GRID,
          depth: i + j
        });
      }
    }
    cells.sort(function (a, b) { return a.depth - b.depth; });
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    DPR = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.35 : 1.75);
    GRID = window.innerWidth < 768 ? 24 : 34;

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    terrainCanvas.width = canvas.width;
    terrainCanvas.height = canvas.height;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    terrainCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rebuildCells();
  }

  function baseGeometry() {
    var s = Math.min(H * 0.60, 500);
    return { cx: W * 0.50, cy: H * 0.50, w: s, h: s };
  }

  // Glass drifts in Lissajous path, clamped so it never exits the visible terrain zone
  function glassGeometry(t, base) {
    var w = window.innerWidth < 900 ? 130 : 200;
    var h = window.innerWidth < 900 ? 118 : 180;
    var fadeR = Math.max(base.w, base.h) * 0.58;
    var maxDrift = fadeR * 0.52;
    var rawDx = W * 0.07 * Math.sin(t * 0.24 + 1.6);
    var rawDy = H * 0.06 * Math.cos(t * 0.20 + 0.9);
    var dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    if (dist > maxDrift) {
      var sc = maxDrift / dist;
      rawDx *= sc; rawDy *= sc;
    }
    return { w: w, h: h, cx: base.cx + rawDx, cy: base.cy + rawDy };
  }

  function animatedPeak(peak, t) {
    return {
      x: peak.x, y: peak.y,
      amp: peak.amp * (1 + 0.10 * Math.sin(t * 0.55 + peak.x * 9.1 + peak.y * 6.3)),
      sig: peak.sig
    };
  }

  function surfaceHeight(u, v, t) {
    var h = 0;
    for (var i = 0; i < peaks.length; i++) {
      var p = animatedPeak(peaks[i], t);
      var dx = u - p.x, dy = v - p.y;
      h += p.amp * Math.exp(-(dx * dx + dy * dy) / (2 * p.sig * p.sig));
    }
    return Math.min(h, 1);
  }

  function isoFromBase(base) {
    var s = Math.min(base.w, base.h);
    return {
      cx: base.cx,
      cy: base.cy + s * 0.055,
      tileW: s * 0.026,
      tileH: s * 0.0145,
      peakH: s * 0.205
    };
  }

  function isoProject(u, v, h, iso) {
    var ix = (u - 0.5) * GRID, iy = (v - 0.5) * GRID;
    return {
      x: iso.cx + (ix - iy) * iso.tileW,
      y: iso.cy + (ix + iy) * iso.tileH - h * iso.peakH
    };
  }

  function mix(a, b, t) { return Math.round(a + (b - a) * t); }

  function colorForHeight(h) {
    var p = Math.pow(Math.max(0, h), 0.58);
    var hot = Math.pow(Math.max(0, h - 0.42) / 0.58, 1.25);
    var r = mix(82, 222, p), g = mix(38, 126, p), b = mix(18, 58, p);
    if (hot > 0) { r = mix(r, 255, hot); g = mix(g, 224, hot); b = mix(b, 170, hot); }
    r = Math.min(255, r + 18); g = Math.min(255, g + 18); b = Math.min(255, b + 18);
    var fillA = Math.min(1, 0.88 + h * 0.12);
    var sr = Math.min(255, mix(168, 255, Math.max(p, hot)) + 28);
    var sg = Math.min(255, mix(84, 234, Math.max(p, hot)) + 28);
    var sb = Math.min(255, mix(40, 195, hot) + 28);
    var strokeA = Math.min(1, 0.42 + h * 0.52);
    return {
      fill: 'rgba(' + r + ',' + g + ',' + b + ',' + fillA.toFixed(3) + ')',
      stroke: 'rgba(' + sr + ',' + sg + ',' + sb + ',' + strokeA.toFixed(3) + ')'
    };
  }

  function traceBlob(target, cx, cy, rx, ry, morph, t) {
    var steps = 112;
    target.beginPath();
    for (var i = 0; i <= steps; i++) {
      var a = (i / steps) * Math.PI * 2, d = 0;
      for (var m = 0; m < morph.length; m++) {
        d += morph[m].amp * Math.sin(morph[m].freq * a + t * morph[m].sp + morph[m].ph);
      }
      var x = cx + rx * (1 + d) * Math.cos(a), y = cy + ry * (1 + d) * Math.sin(a);
      if (i === 0) target.moveTo(x, y); else target.lineTo(x, y);
    }
    target.closePath();
  }

  var glassMorph = [
    { amp: 0.06, freq: 2, sp: 0.18, ph: 2.4 },
    { amp: 0.03, freq: 3, sp: 0.12, ph: 0.6 }
  ];

  function renderTerrain(t, iso, base) {
    terrainCtx.clearRect(0, 0, W, H);
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var h00 = surfaceHeight(cell.u0, cell.v0, t);
      var h10 = surfaceHeight(cell.u1, cell.v0, t);
      var h01 = surfaceHeight(cell.u0, cell.v1, t);
      var h11 = surfaceHeight(cell.u1, cell.v1, t);
      var hi = Math.max(h00, h10, h01, h11);
      var col = colorForHeight(hi);
      var pts = [
        isoProject(cell.u0, cell.v0, h00, iso),
        isoProject(cell.u1, cell.v0, h10, iso),
        isoProject(cell.u1, cell.v1, h11, iso),
        isoProject(cell.u0, cell.v1, h01, iso)
      ];
      terrainCtx.beginPath();
      terrainCtx.moveTo(pts[0].x, pts[0].y); terrainCtx.lineTo(pts[1].x, pts[1].y);
      terrainCtx.lineTo(pts[2].x, pts[2].y); terrainCtx.lineTo(pts[3].x, pts[3].y);
      terrainCtx.closePath();
      terrainCtx.fillStyle = col.fill;
      terrainCtx.strokeStyle = col.stroke;
      terrainCtx.lineWidth = 0.82;
      terrainCtx.fill();
      terrainCtx.stroke();
    }
    // Pure radial fade — no blob clip, so no hard edge can appear
    var fade = terrainCtx.createRadialGradient(
      base.cx, base.cy, 0,
      base.cx, base.cy, Math.max(base.w, base.h) * 0.58
    );
    fade.addColorStop(0,    'rgba(0,0,0,1)');
    fade.addColorStop(0.52, 'rgba(0,0,0,1)');
    fade.addColorStop(0.78, 'rgba(0,0,0,0.5)');
    fade.addColorStop(1,    'rgba(0,0,0,0)');
    terrainCtx.save();
    terrainCtx.globalCompositeOperation = 'destination-in';
    terrainCtx.fillStyle = fade;
    terrainCtx.fillRect(0, 0, W, H);
    terrainCtx.restore();
  }

  function drawLiquidGlass(glass, t) {
    var rx = glass.w * 0.50, ry = glass.h * 0.50;

    // Layer 1: frosted blur inside glass
    ctx.save();
    traceBlob(ctx, glass.cx, glass.cy, rx, ry, glassMorph, t);
    ctx.clip();
    ctx.filter = 'blur(6px)';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(terrainCanvas, 0, 0, W, H);
    ctx.restore();

    // Layer 2: sharp terrain, magnified 1.06x to simulate lens zoom
    ctx.save();
    traceBlob(ctx, glass.cx, glass.cy, rx, ry, glassMorph, t);
    ctx.clip();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.translate(glass.cx, glass.cy);
    ctx.scale(1.06, 1.06);
    ctx.translate(-glass.cx, -glass.cy);
    ctx.drawImage(terrainCanvas, 0, 0, W, H);
    ctx.restore();

    // Layer 3: warm glass tint
    ctx.save();
    traceBlob(ctx, glass.cx, glass.cy, rx, ry, glassMorph, t);
    var tint = ctx.createRadialGradient(
      glass.cx - rx * 0.3, glass.cy - ry * 0.35, 0,
      glass.cx, glass.cy, rx * 1.1
    );
    tint.addColorStop(0,    'rgba(255,245,225,0.28)');
    tint.addColorStop(0.40, 'rgba(255,235,200,0.10)');
    tint.addColorStop(0.75, 'rgba(210,150,80,0.05)');
    tint.addColorStop(1,    'rgba(100,40,5,0.14)');
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.restore();

    // Layer 4: outer rim
    ctx.save();
    traceBlob(ctx, glass.cx, glass.cy, rx, ry, glassMorph, t);
    ctx.strokeStyle = 'rgba(255,240,200,0.55)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();

    // Layer 5: inner refraction ring
    ctx.save();
    traceBlob(ctx, glass.cx, glass.cy, rx * 0.94, ry * 0.94, glassMorph, t);
    ctx.strokeStyle = 'rgba(255,250,230,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Layer 6: specular highlight blob top-left (filled radial, not a line)
    ctx.save();
    traceBlob(ctx, glass.cx, glass.cy, rx, ry, glassMorph, t);
    ctx.clip();
    var spec = ctx.createRadialGradient(
      glass.cx - rx * 0.38, glass.cy - ry * 0.42, 0,
      glass.cx - rx * 0.20, glass.cy - ry * 0.22, rx * 0.52
    );
    spec.addColorStop(0,   'rgba(255,252,240,0.38)');
    spec.addColorStop(0.5, 'rgba(255,245,220,0.12)');
    spec.addColorStop(1,   'rgba(255,240,210,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(glass.cx - rx, glass.cy - ry, rx * 2, ry * 2);
    ctx.restore();

    // Layer 7: bottom-right shadow for glass depth
    ctx.save();
    traceBlob(ctx, glass.cx, glass.cy, rx, ry, glassMorph, t);
    ctx.clip();
    var shad = ctx.createRadialGradient(
      glass.cx + rx * 0.42, glass.cy + ry * 0.48, 0,
      glass.cx + rx * 0.42, glass.cy + ry * 0.48, rx * 1.0
    );
    shad.addColorStop(0, 'rgba(60,20,5,0.18)');
    shad.addColorStop(1, 'rgba(60,20,5,0)');
    ctx.fillStyle = shad;
    ctx.fillRect(glass.cx - rx, glass.cy - ry, rx * 2, ry * 2);
    ctx.restore();
  }

  function drawFrame(ts) {
    if (!document.body.contains(canvas)) { cleanup(); return; }
    if (!start) start = ts;
    var t = (ts - start) / 1000;

    if (!paused) {
      var base = baseGeometry();
      var glass = glassGeometry(t, base);
      var iso = isoFromBase(base);

      renderTerrain(t, iso, base);
      ctx.clearRect(0, 0, W, H);

      // Ambient — very wide radius so edge is invisible against parchment
      ctx.save();
      var amb = ctx.createRadialGradient(
        base.cx, base.cy * 0.95, 0,
        base.cx, base.cy, Math.max(W, H) * 0.75
      );
      amb.addColorStop(0,    'rgba(248,196,142,0.40)');
      amb.addColorStop(0.28, 'rgba(200,100,40,0.26)');
      amb.addColorStop(0.52, 'rgba(150,65,20,0.14)');
      amb.addColorStop(0.72, 'rgba(100,45,15,0.05)');
      amb.addColorStop(1,    'rgba(92,42,20,0)');
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Blurry terrain — no clip, radial fade on terrain canvas handles containment
      ctx.save();
      ctx.filter = 'blur(18px)';
      ctx.globalAlpha = 0.92;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

      // Liquid glass lens
      drawLiquidGlass(glass, t);
    }

    raf = requestAnimationFrame(drawFrame);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }

  function onVisibility() {
    paused = document.hidden;
    if (!paused) start = 0;
  }

  function cleanup() {
    cancelAnimationFrame(raf);
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    if (window.__vrHomeTerrainStop === cleanup) window.__vrHomeTerrainStop = null;
  }

  window.__vrHomeTerrainStop = cleanup;
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  resize();
  raf = requestAnimationFrame(drawFrame);
})();
