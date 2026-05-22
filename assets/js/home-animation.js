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
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
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

  function rebuildCells() {
    cells = [];
    for (var j = 0; j < GRID; j++) {
      for (var i = 0; i < GRID; i++) {
        cells.push({
          u0: i / GRID,
          v0: j / GRID,
          u1: (i + 1) / GRID,
          v1: (j + 1) / GRID,
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

  function localRect(selector, fallback) {
    var el = document.querySelector(selector);
    if (!el) return fallback;

    var er = el.getBoundingClientRect();
    var cr = canvas.getBoundingClientRect();
    return {
      x: er.left - cr.left,
      y: er.top - cr.top,
      w: er.width,
      h: er.height,
      cx: er.left - cr.left + er.width * 0.5,
      cy: er.top - cr.top + er.height * 0.5
    };
  }

  function baseGeometry() {
    var s = Math.min(H * 0.54, 460);
    return localRect('.vr-base-blob', {
      x: W * 0.52 - s * 0.5,
      y: H * 0.50 - s * 0.5,
      w: s,
      h: s,
      cx: W * 0.52,
      cy: H * 0.50
    });
  }

  function glassGeometry() {
    var w = window.innerWidth < 900 ? 130 : 205;
    var h = window.innerWidth < 900 ? 118 : 185;
    var el = document.getElementById('glass');
    if (el && el.offsetParent) {
      return {
        x: el.offsetLeft,
        y: el.offsetTop,
        w: el.offsetWidth || w,
        h: el.offsetHeight || h,
        cx: el.offsetLeft + (el.offsetWidth || w) * 0.5,
        cy: el.offsetTop + (el.offsetHeight || h) * 0.5
      };
    }
    return {
      x: W * 0.55 - w * 0.5,
      y: H * 0.24 - h * 0.5,
      w: w,
      h: h,
      cx: W * 0.55,
      cy: H * 0.24
    };
  }

  function surfaceHeight(u, v, t) {
    var h = 0;
    for (var i = 0; i < peaks.length; i++) {
      var p = peaks[i];
      var dx = u - p.x;
      var dy = v - p.y;
      var dist2 = dx * dx + dy * dy;
      var breath = 1 + 0.06 * Math.sin(t * 0.35 + p.x * 9.1 + p.y * 6.3);
      h += p.amp * breath * Math.exp(-dist2 / (2 * p.sig * p.sig));
    }
    return Math.min(h, 1);
  }

  function isoProject(u, v, h, iso) {
    var ix = (u - 0.5) * GRID;
    var iy = (v - 0.5) * GRID;
    return {
      x: iso.cx + (ix - iy) * iso.tileW,
      y: iso.cy + (ix + iy) * iso.tileH - h * iso.peakH
    };
  }

  function isoFromBase(base) {
    var s = Math.min(base.w, base.h);
    return {
      cx: base.cx,
      cy: base.cy + s * 0.055,
      tileW: s * 0.0206,
      tileH: s * 0.0113,
      peakH: s * 0.178
    };
  }

  function mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function colorForHeight(h, sharp) {
    var p = Math.pow(h, 0.78);
    var fillA = sharp ? 0.78 + h * 0.18 : 0.64 + h * 0.22;
    var strokeA = sharp ? 0.36 + h * 0.54 : 0.22 + h * 0.42;
    return {
      fill: 'rgba(' +
        mix(92, 248, p) + ',' +
        mix(42, 196, p) + ',' +
        mix(20, 142, p) + ',' +
        fillA.toFixed(3) + ')',
      stroke: 'rgba(' +
        mix(173, 248, p) + ',' +
        mix(94, 228, p) + ',' +
        mix(49, 201, p) + ',' +
        strokeA.toFixed(3) + ')'
    };
  }

  function traceCell(target, pts) {
    target.beginPath();
    target.moveTo(pts[0].x, pts[0].y);
    target.lineTo(pts[1].x, pts[1].y);
    target.lineTo(pts[2].x, pts[2].y);
    target.lineTo(pts[3].x, pts[3].y);
    target.closePath();
  }

  function drawTerrainCell(cell, t, iso, sharp) {
    var h00 = surfaceHeight(cell.u0, cell.v0, t);
    var h10 = surfaceHeight(cell.u1, cell.v0, t);
    var h01 = surfaceHeight(cell.u0, cell.v1, t);
    var h11 = surfaceHeight(cell.u1, cell.v1, t);
    var hi = Math.max(h00, h10, h01, h11);
    var col = colorForHeight(hi, sharp);
    var pts = [
      isoProject(cell.u0, cell.v0, h00, iso),
      isoProject(cell.u1, cell.v0, h10, iso),
      isoProject(cell.u1, cell.v1, h11, iso),
      isoProject(cell.u0, cell.v1, h01, iso)
    ];

    traceCell(terrainCtx, pts);
    terrainCtx.fillStyle = col.fill;
    terrainCtx.strokeStyle = col.stroke;
    terrainCtx.lineWidth = sharp ? 0.72 : 0.45;
    terrainCtx.fill();
    terrainCtx.stroke();
  }

  function traceBlob(target, cx, cy, rx, ry, morph, t) {
    var steps = 110;
    target.beginPath();
    for (var i = 0; i <= steps; i++) {
      var a = (i / steps) * Math.PI * 2;
      var d = 0;
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

  var blobMorph = [
    { amp: 0.07, freq: 2, sp: 0.16, ph: 0.0 },
    { amp: 0.04, freq: 3, sp: 0.10, ph: 1.5 },
    { amp: 0.02, freq: 5, sp: 0.07, ph: 2.9 }
  ];

  var glassMorph = [
    { amp: 0.08, freq: 2, sp: 0.18, ph: 2.4 },
    { amp: 0.04, freq: 3, sp: 0.12, ph: 0.6 }
  ];

  function renderTerrain(t, iso) {
    terrainCtx.clearRect(0, 0, W, H);
    terrainCtx.save();
    for (var i = 0; i < cells.length; i++) {
      drawTerrainCell(cells[i], t, iso, true);
    }
    terrainCtx.restore();
  }

  function drawGlassSurface(glass, t) {
    var rx = glass.w * 0.50;
    var ry = glass.h * 0.50;

    ctx.save();
    traceBlob(ctx, glass.cx, glass.cy, rx, ry, glassMorph, t);
    var fill = ctx.createLinearGradient(glass.cx - rx, glass.cy - ry, glass.cx + rx, glass.cy + ry);
    fill.addColorStop(0, 'rgba(255,255,255,0.12)');
    fill.addColorStop(0.45, 'rgba(255,255,255,0.030)');
    fill.addColorStop(1, 'rgba(255,255,255,0.006)');
    ctx.fillStyle = fill;
    ctx.fill();

    traceBlob(ctx, glass.cx, glass.cy, rx, ry, glassMorph, t);
    ctx.strokeStyle = 'rgba(255,248,236,0.28)';
    ctx.lineWidth = 1.05;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(glass.cx - rx * 0.52, glass.cy - ry * 0.48);
    ctx.bezierCurveTo(
      glass.cx - rx * 0.30,
      glass.cy - ry * 0.75,
      glass.cx + rx * 0.18,
      glass.cy - ry * 0.68,
      glass.cx + rx * 0.36,
      glass.cy - ry * 0.36
    );
    ctx.shadowColor = 'rgba(255,255,255,0.28)';
    ctx.shadowBlur = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.52)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  function drawFrame(ts) {
    if (!document.body.contains(canvas)) {
      cleanup();
      return;
    }

    if (!start) start = ts;
    var t = (ts - start) / 1000;

    if (!paused) {
      var base = baseGeometry();
      var glass = glassGeometry();
      var iso = isoFromBase(base);
      var brx = base.w * 0.50;
      var bry = base.h * 0.46;
      var grx = glass.w * 0.50;
      var gry = glass.h * 0.50;

      renderTerrain(t, iso);

      ctx.clearRect(0, 0, W, H);

      ctx.save();
      var amb = ctx.createRadialGradient(base.cx, base.cy, 0, base.cx, base.cy, Math.max(brx, bry) * 1.55);
      amb.addColorStop(0, 'rgba(192,82,42,0.30)');
      amb.addColorStop(0.55, 'rgba(232,196,160,0.12)');
      amb.addColorStop(1, 'rgba(192,82,42,0)');
      ctx.fillStyle = amb;
      ctx.fillRect(base.cx - brx * 1.7, base.cy - bry * 1.7, brx * 3.4, bry * 3.4);
      ctx.restore();

      ctx.save();
      traceBlob(ctx, base.cx, base.cy, brx, bry, blobMorph, t);
      ctx.clip();
      ctx.filter = 'blur(12px)';
      ctx.globalAlpha = 0.98;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

      ctx.save();
      traceBlob(ctx, glass.cx, glass.cy, grx, gry, glassMorph, t);
      ctx.clip();
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

      drawGlassSurface(glass, t);
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
    if (window.__vrHomeTerrainStop === cleanup) {
      window.__vrHomeTerrainStop = null;
    }
  }

  window.__vrHomeTerrainStop = cleanup;
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  raf = requestAnimationFrame(drawFrame);
})();
