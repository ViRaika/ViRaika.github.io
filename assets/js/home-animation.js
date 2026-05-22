(function () {
  if (window.__vrHomeTerrainStop) window.__vrHomeTerrainStop();
 
  var canvas = document.getElementById('home-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  var terrainCanvas = document.createElement('canvas');
  var terrainCtx = terrainCanvas.getContext('2d', { alpha: true });

  var raf = 0, resizeTimer = 0;
  var W = 1, H = 1, DPR = 1;
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

  var blobMorph = [
    { amp: 0.07, freq: 2, sp: 0.16, ph: 0.0 },
    { amp: 0.04, freq: 3, sp: 0.10, ph: 1.5 },
    { amp: 0.02, freq: 5, sp: 0.07, ph: 2.9 }
  ];

  var glassMorph = [
    { amp: 0.06, freq: 2, sp: 0.18, ph: 2.4 },
    { amp: 0.03, freq: 3, sp: 0.12, ph: 0.6 }
  ];

  function rebuildCells() {
    cells = [];
    for (var j = 0; j < GRID; j++) {
      for (var i = 0; i < GRID; i++) {
        cells.push({ u0: i/GRID, v0: j/GRID, u1: (i+1)/GRID, v1: (j+1)/GRID, depth: i+j });
      }
    }
    cells.sort((a,b) => a.depth - b.depth);
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

  function glassGeometry(t, base) {
    var w = window.innerWidth < 900 ? 130 : 200;
    var h = window.innerWidth < 900 ? 118 : 180;
    var maxDrift = Math.max(base.w, base.h) * 0.52;
    var rawDx = W * 0.07 * Math.sin(t * 0.24 + 1.6);
    var rawDy = H * 0.06 * Math.cos(t * 0.20 + 0.9);
    var dist = Math.hypot(rawDx, rawDy);
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
      h += p.amp * Math.exp(-(dx*dx + dy*dy) / (2 * p.sig * p.sig));
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
      fill: `rgba(${r},${g},${b},${fillA.toFixed(3)})`,
      stroke: `rgba(${sr},${sg},${sb},${strokeA.toFixed(3)})`
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
      var x = cx + rx * (1 + d) * Math.cos(a);
      var y = cy + ry * (1 + d) * Math.sin(a);
      if (i === 0) target.moveTo(x, y);
      else target.lineTo(x, y);
    }
    target.closePath();
  }

  function renderTerrain(t, iso, base) {
    terrainCtx.clearRect(0, 0, W, H);

    // Draw full terrain
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
      terrainCtx.moveTo(pts[0].x, pts[0].y);
      terrainCtx.lineTo(pts[1].x, pts[1].y);
      terrainCtx.lineTo(pts[2].x, pts[2].y);
      terrainCtx.lineTo(pts[3].x, pts[3].y);
      terrainCtx.closePath();

      terrainCtx.fillStyle = col.fill;
      terrainCtx.strokeStyle = col.stroke;
      terrainCtx.lineWidth = 0.82;
      terrainCtx.fill();
      terrainCtx.stroke();
    }

    // === SOFT CIRCULAR MASK WITH WIDE FEATHER ===
    var radius = Math.max(base.w, base.h) * 0.68;
    var fade = terrainCtx.createRadialGradient(
      base.cx, base.cy, radius * 0.58,
      base.cx, base.cy, radius
    );
    fade.addColorStop(0,   'rgba(0,0,0,1)');
    fade.addColorStop(0.75,'rgba(0,0,0,1)');
    fade.addColorStop(0.92,'rgba(0,0,0,0.15)');
    fade.addColorStop(1,   'rgba(0,0,0,0)');

    terrainCtx.save();
    terrainCtx.globalCompositeOperation = 'destination-in';
    terrainCtx.fillStyle = fade;
    terrainCtx.fillRect(0, 0, W, H);
    terrainCtx.restore();
  }

  function drawLiquidGlass(glass, t) {
    // ... (I'll keep this as placeholder for now - paste your latest drawLiquidGlass if you want it updated) ...
    // For now assuming it's the same as before
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

      // Ambient background glow
      ctx.save();
      var amb = ctx.createRadialGradient(base.cx, base.cy * 0.95, 0, base.cx, base.cy, Math.max(W, H) * 0.85);
      amb.addColorStop(0, 'rgba(248,196,142,0.38)');
      amb.addColorStop(0.4, 'rgba(200,110,45,0.18)');
      amb.addColorStop(0.75, 'rgba(140,60,25,0.06)');
      amb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Main soft terrain with blur
      ctx.save();
      ctx.filter = 'blur(32px)';
      ctx.globalAlpha = 0.95;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

      // Extra ultra-soft layer for edge blending
      ctx.save();
      ctx.filter = 'blur(65px)';
      ctx.globalAlpha = 0.35;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

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
