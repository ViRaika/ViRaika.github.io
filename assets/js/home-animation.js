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

  var peaks = [ /* ... same peaks as before ... */ ];

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

  // ... (animatedPeak, surfaceHeight, isoFromBase, isoProject, mix, colorForHeight, traceBlob remain the same) ...

  function renderTerrain(t, iso, base) {
    terrainCtx.clearRect(0, 0, W, H);

    // Draw terrain cells
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

    // === IMPROVED SOFT RADIAL FADE ===
    var radius = Math.max(base.w, base.h) * 0.62;   // Slightly larger fade zone
    var fade = terrainCtx.createRadialGradient(
      base.cx, base.cy, radius * 0.65,     // Start fading earlier
      base.cx, base.cy, radius
    );
    fade.addColorStop(0,   'rgba(0,0,0,1)');
    fade.addColorStop(0.68,'rgba(0,0,0,1)');
    fade.addColorStop(0.88,'rgba(0,0,0,0.25)');
    fade.addColorStop(1,   'rgba(0,0,0,0)');

    terrainCtx.save();
    terrainCtx.globalCompositeOperation = 'destination-in';
    terrainCtx.fillStyle = fade;
    terrainCtx.fillRect(0, 0, W, H);
    terrainCtx.restore();
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

      // Ambient glow
      ctx.save();
      var amb = ctx.createRadialGradient(base.cx, base.cy * 0.95, 0, base.cx, base.cy, Math.max(W, H) * 0.78);
      amb.addColorStop(0, 'rgba(248,196,142,0.42)');
      amb.addColorStop(0.35, 'rgba(200,100,40,0.25)');
      amb.addColorStop(0.65, 'rgba(150,65,20,0.10)');
      amb.addColorStop(1, 'rgba(92,42,20,0)');
      ctx.fillStyle = amb;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // === MAIN BLUR LAYER - Increased for soft edge ===
      ctx.save();
      ctx.filter = 'blur(28px)';        // Increased from 18px
      ctx.globalAlpha = 0.94;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

      // Optional: Extra subtle ultra-soft layer for even better blending
      ctx.save();
      ctx.filter = 'blur(52px)';
      ctx.globalAlpha = 0.28;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

      drawLiquidGlass(glass, t);
    }

    raf = requestAnimationFrame(drawFrame);
  }

  // ... rest of the functions (onResize, onVisibility, cleanup, drawLiquidGlass) stay the same ...

  window.__vrHomeTerrainStop = cleanup;
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  raf = requestAnimationFrame(drawFrame);
})();
