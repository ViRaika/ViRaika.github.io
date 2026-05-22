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
  var GRID = 30;
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
    { x: 0.50, y: 0.46, amp: 1.00, sig: 0.14, phase: 0.2 },
    { x: 0.28, y: 0.35, amp: 0.62, sig: 0.10, phase: 1.7 },
    { x: 0.70, y: 0.30, amp: 0.48, sig: 0.09, phase: 2.9 },
    { x: 0.65, y: 0.65, amp: 0.55, sig: 0.11, phase: 4.1 },
    { x: 0.32, y: 0.68, amp: 0.40, sig: 0.08, phase: 5.4 },
    { x: 0.82, y: 0.52, amp: 0.30, sig: 0.07, phase: 2.4 },
    { x: 0.18, y: 0.55, amp: 0.28, sig: 0.07, phase: 3.7 }
  ];

  for (var i = 0; i < 10; i++) {
    peaks.push({
      x: 0.08 + rng() * 0.84,
      y: 0.08 + rng() * 0.84,
      amp: 0.08 + rng() * 0.14,
      sig: 0.04 + rng() * 0.05,
      phase: rng() * Math.PI * 2
    });
  }

  function rebuildCells() {
    cells = [];
    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        cells.push({
          x0: x / GRID,
          y0: y / GRID,
          x1: (x + 1) / GRID,
          y1: (y + 1) / GRID,
          depth: x + y
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
    GRID = window.innerWidth < 768 ? 20 : 30;

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    terrainCanvas.width = canvas.width;
    terrainCanvas.height = canvas.height;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    terrainCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rebuildCells();
  }

  function getLocalRect(selector, fallback) {
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
    var s = Math.min(H * 0.55, 460);
    return getLocalRect('.vr-base-blob', {
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
    return getLocalRect('#glass', {
      x: W * 0.55 - w * 0.5,
      y: H * 0.24 - h * 0.5,
      w: w,
      h: h,
      cx: W * 0.55,
      cy: H * 0.24
    });
  }

  function heightAt(u, v, t) {
    var h = 0;
    for (var i = 0; i < peaks.length; i++) {
      var p = peaks[i];
      var dx = u - p.x;
      var dy = v - p.y;
      var breath = 1 + 0.055 * Math.sin(t * 0.35 + p.x * 9.1 + p.y * 6.3 + p.phase);
      h += p.amp * breath * Math.exp(-(dx * dx + dy * dy) / (2 * p.sig * p.sig));
    }
    return Math.min(h, 1);
  }

  function isoProject(u, v, h, base) {
    var scale = Math.min(base.w, base.h);
    var ix = (u - 0.5) * GRID;
    var iy = (v - 0.5) * GRID;
    return {
      x: base.cx + (ix - iy) * scale * 0.019,
      y: base.cy + scale * 0.08 + (ix + iy) * scale * 0.010 - h * scale * 0.18
    };
  }

  function mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function colors(hi, sharp) {
    var peak = Math.pow(hi, 0.82);
    var fillA = sharp ? 0.72 + hi * 0.20 : 0.52 + hi * 0.24;
    var lineA = sharp ? 0.34 + hi * 0.50 : 0.13 + hi * 0.24;

    return {
      fill: 'rgba(' +
        mix(92, 248, peak) + ',' +
        mix(42, 196, peak) + ',' +
        mix(20, 142, peak) + ',' +
        fillA.toFixed(3) + ')',
      stroke: 'rgba(' +
        mix(192, 248, peak) + ',' +
        mix(96, 228, peak) + ',' +
        mix(42, 201, peak) + ',' +
        lineA.toFixed(3) + ')',
      glow: 'rgba(' +
        mix(192, 248, peak) + ',' +
        mix(82, 228, peak) + ',' +
        mix(42, 201, peak) + ',' +
        (0.08 + hi * 0.25).toFixed(3) + ')'
    };
  }

  function drawTerrainCell(cell, t, base) {
    var h00 = heightAt(cell.x0, cell.y0, t);
    var h10 = heightAt(cell.x1, cell.y0, t);
    var h11 = heightAt(cell.x1, cell.y1, t);
    var h01 = heightAt(cell.x0, cell.y1, t);
    var hi = Math.max(h00, h10, h11, h01);
    var col = colors(hi, true);

    var p00 = isoProject(cell.x0, cell.y0, h00, base);
    var p10 = isoProject(cell.x1, cell.y0, h10, base);
    var p11 = isoProject(cell.x1, cell.y1, h11, base);
    var p01 = isoProject(cell.x0, cell.y1, h01, base);

    terrainCtx.beginPath();
    terrainCtx.moveTo(p00.x, p00.y);
    terrainCtx.lineTo(p10.x, p10.y);
    terrainCtx.lineTo(p11.x, p11.y);
    terrainCtx.lineTo(p01.x, p01.y);
    terrainCtx.closePath();
    terrainCtx.fillStyle = col.fill;
    terrainCtx.strokeStyle = col.stroke;
    terrainCtx.lineWidth = 0.74;
    terrainCtx.fill();
    terrainCtx.stroke();

    if (hi > 0.55) {
      terrainCtx.strokeStyle = col.glow;
      terrainCtx.lineWidth = 1.35;
      terrainCtx.stroke();
    }
  }

  function traceBlobPath(target, cx, cy, rx, ry, t, glass) {
    var steps = glass ? 96 : 112;
    target.beginPath();
    for (var i = 0; i <= steps; i++) {
      var a = (i / steps) * Math.PI * 2;
      var d = glass
        ? 0.060 * Math.sin(2 * a + t * 0.18 + 2.4) + 0.032 * Math.sin(3 * a + t * 0.12 + 0.6)
        : 0.060 * Math.sin(2 * a + t * 0.16) + 0.035 * Math.sin(3 * a + t * 0.10 + 1.5) + 0.016 * Math.sin(5 * a + t * 0.07 + 2.9);
      var x = cx + rx * (1 + d) * Math.cos(a);
      var y = cy + ry * (1 + d) * Math.sin(a);
      if (i === 0) target.moveTo(x, y);
      else target.lineTo(x, y);
    }
    target.closePath();
  }

  function renderSharpTerrain(t, base) {
    terrainCtx.clearRect(0, 0, W, H);
    terrainCtx.save();
    terrainCtx.globalCompositeOperation = 'source-over';
    for (var i = 0; i < cells.length; i++) {
      drawTerrainCell(cells[i], t, base);
    }
    terrainCtx.restore();
  }

  function drawGlass(glass, t) {
    var rx = glass.w * 0.51;
    var ry = glass.h * 0.51;

    ctx.save();
    traceBlobPath(ctx, glass.cx, glass.cy, rx, ry, t, true);
    var fill = ctx.createLinearGradient(glass.cx - rx, glass.cy - ry, glass.cx + rx, glass.cy + ry);
    fill.addColorStop(0, 'rgba(255,255,255,0.105)');
    fill.addColorStop(0.42, 'rgba(255,255,255,0.026)');
    fill.addColorStop(1, 'rgba(255,255,255,0.004)');
    ctx.fillStyle = fill;
    ctx.fill();

    traceBlobPath(ctx, glass.cx, glass.cy, rx, ry, t, true);
    ctx.strokeStyle = 'rgba(255,248,236,0.30)';
    ctx.lineWidth = 1.05;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(glass.cx - rx * 0.50, glass.cy - ry * 0.50);
    ctx.bezierCurveTo(
      glass.cx - rx * 0.27,
      glass.cy - ry * 0.78,
      glass.cx + rx * 0.18,
      glass.cy - ry * 0.70,
      glass.cx + rx * 0.38,
      glass.cy - ry * 0.38
    );
    ctx.shadowColor = 'rgba(255,255,255,0.28)';
    ctx.shadowBlur = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.50)';
    ctx.lineWidth = 2;
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
      var br = Math.min(base.w, base.h) * 0.50;

      renderSharpTerrain(t, base);

      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.filter = 'blur(42px)';
      ctx.globalAlpha = 0.34;
      traceBlobPath(ctx, base.cx, base.cy, br * 1.03, br * 0.93, t, false);
      ctx.fillStyle = 'rgba(192,82,42,0.42)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      traceBlobPath(ctx, base.cx, base.cy, br, br * 0.92, t, false);
      ctx.clip();
      ctx.filter = 'blur(18px)';
      ctx.globalAlpha = 0.92;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

      ctx.save();
      traceBlobPath(ctx, glass.cx, glass.cy, glass.w * 0.51, glass.h * 0.51, t, true);
      ctx.clip();
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

      drawGlass(glass, t);
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
