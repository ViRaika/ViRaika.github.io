// home-animation.js — Probability Surface Terrain
// Drop-in replacement. Same file name, same canvas ID (#home-canvas).
// Renders an isometric 3D probability surface (GP posterior / joint PDF)
// Base: blurred fog — the signal is felt but unreadable
// Glass: crisp clip — terrain snaps sharp wherever the glass drifts

(function () {

  // ─── Canvas setup ──────────────────────────────────────────────────────────
  var canvas = document.getElementById('home-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var isMobile = window.innerWidth < 768;
  var DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

  var W, H;
  var startTime = null;
  var paused = false;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // ─── Seeded deterministic random ───────────────────────────────────────────
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // ─── Peak definitions (stable, seeded) ────────────────────────────────────
  // Mix: one dominant, several secondary, scattered noise floor
  var rng = makeRng(137);
  var PEAKS = [
    { gx: 0.50, gy: 0.45, amp: 1.00, sig: 0.13 },
    { gx: 0.27, gy: 0.34, amp: 0.60, sig: 0.09 },
    { gx: 0.71, gy: 0.29, amp: 0.46, sig: 0.09 },
    { gx: 0.66, gy: 0.64, amp: 0.52, sig: 0.10 },
    { gx: 0.31, gy: 0.67, amp: 0.38, sig: 0.08 },
    { gx: 0.83, gy: 0.51, amp: 0.28, sig: 0.07 },
    { gx: 0.17, gy: 0.56, amp: 0.26, sig: 0.07 }
  ];
  // Small noise bumps
  for (var ni = 0; ni < 10; ni++) {
    PEAKS.push({
      gx: 0.08 + rng() * 0.84,
      gy: 0.08 + rng() * 0.84,
      amp: 0.07 + rng() * 0.13,
      sig: 0.04 + rng() * 0.05
    });
  }

  // ─── Surface height at (u,v) ───────────────────────────────────────────────
  function surfaceH(u, v, t) {
    var h = 0;
    for (var i = 0; i < PEAKS.length; i++) {
      var p = PEAKS[i];
      var dx = u - p.gx, dy = v - p.gy;
      var breath = 1 + 0.055 * Math.sin(t * 0.33 + p.gx * 9.1 + p.gy * 6.3);
      h += p.amp * breath * Math.exp(-(dx * dx + dy * dy) / (2 * p.sig * p.sig));
    }
    return Math.min(h, 1.0);
  }

  // ─── Isometric projection ──────────────────────────────────────────────────
  // Grid (u,v) ∈ [0,1]², projected to screen centered on right panel
  var GRID = isMobile ? 22 : 30;

  function isoXY(u, v, h, params) {
    var ix = (u - 0.5) * GRID;
    var iy = (v - 0.5) * GRID;
    var sx = params.cx + (ix - iy) * params.tileW;
    var sy = params.cy + (ix + iy) * params.tileH - h * params.peakH;
    return { x: sx, y: sy };
  }

  // ─── Build sorted cell list (back-to-front) ────────────────────────────────
  function buildCells(t, params) {
    var cells = [];
    var G = GRID;
    for (var j = 0; j < G; j++) {
      for (var i = 0; i < G; i++) {
        var u0 = i / G, u1 = (i + 1) / G;
        var v0 = j / G, v1 = (j + 1) / G;

        var h00 = surfaceH(u0, v0, t);
        var h10 = surfaceH(u1, v0, t);
        var h11 = surfaceH(u1, v1, t);
        var h01 = surfaceH(u0, v1, t);
        var hi  = Math.max(h00, h10, h11, h01);

        var p00 = isoXY(u0, v0, h00, params);
        var p10 = isoXY(u1, v0, h10, params);
        var p11 = isoXY(u1, v1, h11, params);
        var p01 = isoXY(u0, v1, h01, params);

        cells.push({ p00: p00, p10: p10, p11: p11, p01: p01, hi: hi, depth: i + j });
      }
    }
    cells.sort(function (a, b) { return a.depth - b.depth; });
    return cells;
  }

  // ─── Draw a single cell ────────────────────────────────────────────────────
  function drawCell(cell, sharp) {
    var hi = cell.hi;
    var p = cell;

    // Fill colour: deep navy → bright cyan-white at peaks
    var r = Math.round(8   + hi * 55)  | 0;
    var g = Math.round(25  + hi * 135) | 0;
    var b = Math.round(110 + hi * 140) | 0;
    var a = 0.50 + hi * 0.42;

    // Edge colour
    var er = Math.round(55  + hi * (sharp ? 120 : 80))  | 0;
    var eg = Math.round(110 + hi * (sharp ? 130 : 100)) | 0;
    var eb = Math.round(195 + hi * (sharp ? 60  : 45))  | 0;
    var ea = sharp ? (0.28 + hi * 0.65) : (0.18 + hi * 0.45);

    ctx.beginPath();
    ctx.moveTo(p.p00.x, p.p00.y);
    ctx.lineTo(p.p10.x, p.p10.y);
    ctx.lineTo(p.p11.x, p.p11.y);
    ctx.lineTo(p.p01.x, p.p01.y);
    ctx.closePath();

    ctx.fillStyle   = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    ctx.strokeStyle = 'rgba(' + er + ',' + eg + ',' + eb + ',' + ea + ')';
    ctx.lineWidth   = sharp ? 0.65 : 0.4;
    ctx.fill();
    ctx.stroke();
  }

  // ─── Blob morph path ───────────────────────────────────────────────────────
  // Used for both the outer silhouette and the glass lens
  function buildBlobPath(cx, cy, rx, ry, morph, t) {
    var pts = 80;
    var path = [];
    for (var i = 0; i <= pts; i++) {
      var a = (i / pts) * Math.PI * 2;
      var d = 0;
      for (var m = 0; m < morph.length; m++) {
        d += morph[m].amp * Math.sin(morph[m].freq * a + t * morph[m].sp + morph[m].ph);
      }
      path.push([
        cx + (rx * (1 + d)) * Math.cos(a),
        cy + (ry * (1 + d)) * Math.sin(a)
      ]);
    }
    return path;
  }

  function tracePath(points) {
    ctx.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
  }

  // Outer blob morph layers
  var BLOB_MORPH = [
    { amp: 0.06, freq: 2, sp: 0.15, ph: 0.0 },
    { amp: 0.03, freq: 3, sp: 0.09, ph: 1.5 },
    { amp: 0.02, freq: 5, sp: 0.07, ph: 2.9 }
  ];

  // Glass lens morph layers (separate rhythm)
  var GLASS_MORPH = [
    { amp: 0.07, freq: 2, sp: 0.17, ph: 2.4 },
    { amp: 0.04, freq: 3, sp: 0.11, ph: 0.6 }
  ];

  // ─── Glass position: mirrors the existing CSS glass element orbit ──────────
  // Reads the live position of #glass so the canvas lens tracks the CSS element
  function getGlassRect() {
    var el = document.getElementById('glass');
    if (!el) return null;
    var er = el.getBoundingClientRect();
    var cr = canvas.getBoundingClientRect();
    return {
      cx: er.left - cr.left + er.width  * 0.5,
      cy: er.top  - cr.top  + er.height * 0.5,
      rw: er.width  * 0.52,
      rh: er.height * 0.52
    };
  }

  // Fallback glass drift if #glass not found
  function fallbackGlass(t) {
    var cx = W * (0.50 + 0.07 * Math.sin(t * 0.24 + 1.6));
    var cy = H * (0.48 + 0.06 * Math.cos(t * 0.20 + 0.9));
    return { cx: cx, cy: cy, rw: W * 0.18, rh: H * 0.18 };
  }

  // ─── Iso params derived from canvas size ──────────────────────────────────
  function isoParams() {
    var blobCx = W * 0.50;
    var blobCy = H * 0.52;
    var scale  = Math.min(W, H);
    return {
      cx:    blobCx,
      cy:    blobCy,
      tileW: scale * (isMobile ? 0.014 : 0.017),
      tileH: scale * (isMobile ? 0.0075 : 0.0090),
      peakH: scale * (isMobile ? 0.105  : 0.130)
    };
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  function tick(timestamp) {
    if (startTime === null) startTime = timestamp;
    var t = (timestamp - startTime) / 1000;

    if (!paused) {
      ctx.clearRect(0, 0, W, H);

      var params = isoParams();
      var cells  = buildCells(t, params);

      // Outer blob silhouette path (for clipping the terrain)
      var blobR  = Math.min(W, H) * (isMobile ? 0.32 : 0.35);
      var blobPts = buildBlobPath(
        params.cx, params.cy,
        blobR, blobR * 0.90,
        BLOB_MORPH, t
      );

      // Glass lens geometry
      var gr = getGlassRect() || fallbackGlass(t);
      var glassPts = buildBlobPath(
        gr.cx, gr.cy,
        gr.rw, gr.rh,
        GLASS_MORPH, t
      );

      // ── 1. Ambient blob glow (very soft, behind everything) ──
      ctx.save();
      ctx.filter = 'blur(' + (isMobile ? 36 : 48) + 'px)';
      ctx.globalAlpha = 0.30;
      ctx.beginPath();
      tracePath(blobPts);
      ctx.fillStyle = 'rgba(18,60,185,0.55)';
      ctx.fill();
      ctx.restore();

      // ── 2. BLURRY TERRAIN — clipped to blob, heavily blurred ──
      ctx.save();
      // Clip to blob silhouette
      ctx.beginPath();
      tracePath(blobPts);
      ctx.clip();
      // Apply fog blur
      ctx.filter = 'blur(' + (isMobile ? 14 : 18) + 'px)';
      // Draw all cells blurry
      for (var i = 0; i < cells.length; i++) drawCell(cells[i], false);
      ctx.restore();

      // ── 3. SHARP TERRAIN — clipped to glass lens, no blur ──
      ctx.save();
      // Clip to glass shape
      ctx.beginPath();
      tracePath(glassPts);
      ctx.clip();
      // Slightly darken the base inside glass for contrast pop
      ctx.fillStyle = 'rgba(4,8,28,0.45)';
      ctx.fill();
      // Draw all cells crisp
      ctx.filter = 'none';
      for (var j = 0; j < cells.length; j++) drawCell(cells[j], true);
      ctx.restore();

      // ── 4. GLASS SURFACE — subtle tint, luminous rim, specular glint ──
      ctx.save();

      // Faint tinted fill
      ctx.beginPath();
      tracePath(glassPts);
      var grd = ctx.createLinearGradient(
        gr.cx - gr.rw, gr.cy - gr.rh,
        gr.cx + gr.rw, gr.cy + gr.rh
      );
      grd.addColorStop(0,    'rgba(255,255,255,0.10)');
      grd.addColorStop(0.40, 'rgba(255,255,255,0.025)');
      grd.addColorStop(1,    'rgba(255,255,255,0.005)');
      ctx.fillStyle = grd;
      ctx.fill();

      // Outer rim
      ctx.beginPath();
      tracePath(glassPts);
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.lineWidth   = 1.0;
      ctx.stroke();

      // Specular glint — top-left arc, glowing
      ctx.save();
      ctx.filter = 'blur(2px)';
      ctx.beginPath();
      tracePath(glassPts);
      ctx.strokeStyle = 'rgba(255,255,255,0.52)';
      ctx.lineWidth   = 2.2;
      ctx.setLineDash([38, 9999]);
      ctx.lineDashOffset = 0;
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    requestAnimationFrame(tick);
  }

  // ─── Visibility / resize ───────────────────────────────────────────────────
  document.addEventListener('visibilitychange', function () {
    paused = document.hidden;
    if (!paused) startTime = null;
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      isMobile = window.innerWidth < 768;
      resize();
    }, 150);
  });

  resize();
  requestAnimationFrame(tick);

})();
