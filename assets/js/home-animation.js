// Probability surface terrain for the homepage blob.
// Pure canvas: one sharp offscreen render, then blurred base + crisp glass lens.
(function () {
  if (window.__vrHomeTerrainStop) window.__vrHomeTerrainStop();

  var canvas = document.getElementById('home-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  var off = document.createElement('canvas');
  var offCtx = off.getContext('2d', { alpha: true });

  var raf = 0;
  var W = 0;
  var H = 0;
  var DPR = 1;
  var GRID = 28;
  var startTime = 0;
  var paused = false;
  var cells = [];

  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967295;
    };
  }

  var rng = makeRng(137);
  var peaks = [
    { x: 0.50, y: 0.44, amp: 1.00, sig: 0.13, phase: 0.1 },
    { x: 0.28, y: 0.35, amp: 0.58, sig: 0.09, phase: 1.4 },
    { x: 0.72, y: 0.30, amp: 0.44, sig: 0.09, phase: 2.6 },
    { x: 0.66, y: 0.64, amp: 0.50, sig: 0.10, phase: 4.0 },
    { x: 0.31, y: 0.68, amp: 0.36, sig: 0.08, phase: 5.2 },
    { x: 0.84, y: 0.51, amp: 0.25, sig: 0.07, phase: 2.1 },
    { x: 0.17, y: 0.56, amp: 0.24, sig: 0.07, phase: 3.5 }
  ];

  for (var i = 0; i < 10; i++) {
    peaks.push({
      x: 0.08 + rng() * 0.84,
      y: 0.08 + rng() * 0.84,
      amp: 0.06 + rng() * 0.12,
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
    DPR = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
    GRID = window.innerWidth < 768 ? 22 : 28;

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    off.width = canvas.width;
    off.height = canvas.height;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    offCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rebuildCells();
  }

  function hAt(u, v, t) {
    var h = 0;
    for (var i = 0; i < peaks.length; i++) {
      var p = peaks[i];
      var dx = u - p.x;
      var dy = v - p.y;
      var breath = 1 + 0.05 * Math.sin(t * 0.42 + p.phase);
      h += p.amp * breath * Math.exp(-(dx * dx + dy * dy) / (2 * p.sig * p.sig));
    }
    return Math.min(1, h);
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
      cx: er.left - cr.left + er.width / 2,
      cy: er.top - cr.top + er.height / 2
    };
  }

  function baseRect() {
    var s = Math.min(W, H) * 0.54;
    return getLocalRect('.vr-base-blob', {
      x: W * 0.52 - s / 2,
      y: H * 0.50 - s / 2,
      w: s,
      h: s,
      cx: W * 0.52,
      cy: H * 0.50
    });
  }

  function glassRect() {
    var s = Math.min(W, H) * 0.25;
    return getLocalRect('#glass', {
      x: W * 0.56 - s / 2,
      y: H * 0.30 - s / 2,
      w: s,
      h: s * 0.84,
      cx: W * 0.56,
      cy: H * 0.30
    });
  }

  function iso(u, v, h, base) {
    var scale = Math.min(base.w, base.h);
    var gx = (u - 0.5) * GRID;
    var gy = (v - 0.5) * GRID;
    return {
      x: base.cx + (gx - gy) * scale * 0.016,
      y: base.cy + scale * 0.10 + (gx + gy) * scale * 0.0085 - h * scale * 0.22
    };
  }

  function colorFor(h, sharp) {
    var baseA = sharp ? 0.88 : 0.68;
    return {
      fill: 'rgba(' +
        Math.round(92 + h * 158) + ',' +
        Math.round(43 + h * 156) + ',' +
        Math.round(18 + h * 105) + ',' +
        (baseA - h * 0.08).toFixed(3) + ')',
      stroke: 'rgba(' +
        Math.round(174 + h * 70) + ',' +
        Math.round(102 + h * 116) + ',' +
        Math.round(60 + h * 130) + ',' +
        (sharp ? 0.42 + h * 0.48 : 0.20 + h * 0.28).toFixed(3) + ')'
    };
  }

  function drawCell(c, t, base) {
    var h00 = hAt(c.x0, c.y0, t);
    var h10 = hAt(c.x1, c.y0, t);
    var h11 = hAt(c.x1, c.y1, t);
    var h01 = hAt(c.x0, c.y1, t);
    var hi = Math.max(h00, h10, h11, h01);

    var p00 = iso(c.x0, c.y0, h00, base);
    var p10 = iso(c.x1, c.y0, h10, base);
    var p11 = iso(c.x1, c.y1, h11, base);
    var p01 = iso(c.x0, c.y1, h01, base);
    var col = colorFor(hi, true);

    offCtx.beginPath();
    offCtx.moveTo(p00.x, p00.y);
    offCtx.lineTo(p10.x, p10.y);
    offCtx.lineTo(p11.x, p11.y);
    offCtx.lineTo(p01.x, p01.y);
    offCtx.closePath();
    offCtx.fillStyle = col.fill;
    offCtx.strokeStyle = col.stroke;
    offCtx.lineWidth = 0.72;
    offCtx.fill();
    offCtx.stroke();
  }

  function traceBlob(target, cx, cy, rx, ry, t, kind) {
    var steps = 88;
    target.beginPath();
    for (var i = 0; i <= steps; i++) {
      var a = (i / steps) * Math.PI * 2;
      var wobble = kind === 'glass'
        ? 0.055 * Math.sin(2 * a + t * 0.18 + 2.4) + 0.030 * Math.sin(3 * a + t * 0.12)
        : 0.050 * Math.sin(2 * a + t * 0.15) + 0.025 * Math.sin(3 * a + t * 0.10 + 1.5);
      var x = cx + rx * (1 + wobble) * Math.cos(a);
      var y = cy + ry * (1 + wobble) * Math.sin(a);
      if (i === 0) target.moveTo(x, y);
      else target.lineTo(x, y);
    }
    target.closePath();
  }

  function renderTerrain(t, base) {
    offCtx.clearRect(0, 0, W, H);
    offCtx.save();
    offCtx.globalCompositeOperation = 'source-over';
    for (var i = 0; i < cells.length; i++) drawCell(cells[i], t, base);
    offCtx.restore();
  }

  function drawGlassSurface(glass, t) {
    var rx = glass.w * 0.52;
    var ry = glass.h * 0.52;

    ctx.save();
    traceBlob(ctx, glass.cx, glass.cy, rx, ry, t, 'glass');
    var fill = ctx.createLinearGradient(glass.cx - rx, glass.cy - ry, glass.cx + rx, glass.cy + ry);
    fill.addColorStop(0, 'rgba(255,255,255,0.105)');
    fill.addColorStop(0.45, 'rgba(255,255,255,0.028)');
    fill.addColorStop(1, 'rgba(255,255,255,0.006)');
    ctx.fillStyle = fill;
    ctx.fill();

    traceBlob(ctx, glass.cx, glass.cy, rx, ry, t, 'glass');
    ctx.strokeStyle = 'rgba(255,248,236,0.34)';
    ctx.lineWidth = 1.05;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(glass.cx - rx * 0.52, glass.cy - ry * 0.50);
    ctx.bezierCurveTo(
      glass.cx - rx * 0.28, glass.cy - ry * 0.78,
      glass.cx + rx * 0.20, glass.cy - ry * 0.70,
      glass.cx + rx * 0.38, glass.cy - ry * 0.38
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.56)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,255,255,0.32)';
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.restore();
  }

  function tick(ts) {
    if (!startTime) startTime = ts;
    var t = (ts - startTime) / 1000;

    if (!paused && document.body.contains(canvas)) {
      var base = baseRect();
      var glass = glassRect();
      var br = Math.min(base.w, base.h) * 0.50;

      renderTerrain(t, base);
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.filter = 'blur(40px)';
      ctx.globalAlpha = 0.34;
      traceBlob(ctx, base.cx, base.cy, br * 1.05, br * 0.94, t, 'base');
      ctx.fillStyle = 'rgba(200,93,42,0.42)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      traceBlob(ctx, base.cx, base.cy, br, br * 0.92, t, 'base');
      ctx.clip();
      ctx.filter = 'blur(18px)';
      ctx.globalAlpha = 0.90;
      ctx.drawImage(off, 0, 0, W, H);
      ctx.restore();

      ctx.save();
      traceBlob(ctx, glass.cx, glass.cy, glass.w * 0.52, glass.h * 0.52, t, 'glass');
      ctx.clip();
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.drawImage(off, 0, 0, W, H);
      ctx.restore();

      drawGlassSurface(glass, t);
      raf = requestAnimationFrame(tick);
    } else if (document.body.contains(canvas)) {
      raf = requestAnimationFrame(tick);
    }
  }

  document.addEventListener('visibilitychange', function () {
    paused = document.hidden;
    if (!paused) startTime = 0;
  });

  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }

  window.addEventListener('resize', onResize);
  window.__vrHomeTerrainStop = function () {
    cancelAnimationFrame(raf);
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    if (window.__vrHomeTerrainStop) window.__vrHomeTerrainStop = null;
  };

  resize();
  raf = requestAnimationFrame(tick);
})();
