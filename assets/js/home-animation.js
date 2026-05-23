(function () {
  if (window.__vrHomeTerrainStop) window.__vrHomeTerrainStop();

  var canvas = document.getElementById('home-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  var terrainCanvas = document.createElement('canvas');
  var terrainCtx = terrainCanvas.getContext('2d', { alpha: true });
  var fadeCanvas = document.createElement('canvas');
  var fadeCtx = fadeCanvas.getContext('2d', { alpha: true });
  // Offscreen buffer for soft-edge blob compositing (fixes hard clip edge under blur)
  var blobSoftCanvas = document.createElement('canvas');
  var blobSoftCtx = blobSoftCanvas.getContext('2d', { alpha: true });

  var raf = 0;
  var resizeTimer = 0;
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
    peaks.push({ x: 0.08+rng()*0.84, y: 0.08+rng()*0.84, amp: 0.08+rng()*0.14, sig: 0.04+rng()*0.05 });
  }
  for (var p = 0; p < peaks.length; p++) {
    peaks[p].phase = rng() * Math.PI * 2;
    peaks[p].driftA = 0.006 + rng() * 0.010;
    peaks[p].driftB = 0.006 + rng() * 0.010;
    peaks[p].driftSx = 0.105 + rng() * 0.065;
    peaks[p].driftSy = 0.095 + rng() * 0.060;
    peaks[p].widthPhase = rng() * Math.PI * 2;
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

  function rebuildCells() {
    cells = [];
    // PAD extends the grid 4 cells beyond [0,1] on every side.
    // This ensures terrain fills the full blob even at morph extremes,
    // and the 128→90 "plain then clipped" pattern holds: outer cells
    // (u/v < 0 or > 1) have surfaceHeight ≈ 0 so they render as flat
    // dark base — invisible under the blob's soft edge mask.
    var PAD = 8;
    var TOTAL = GRID + PAD * 2;
    for (var j = 0; j < TOTAL; j++) {
      for (var ii = 0; ii < TOTAL; ii++) {
        var u0 = (ii - PAD) / GRID;
        var v0 = (j  - PAD) / GRID;
        cells.push({ u0: u0, v0: v0, u1: u0 + 1/GRID, v1: v0 + 1/GRID, depth: ii + j });
      }
    }
    cells.sort(function(a,b){ return a.depth - b.depth; });
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
    fadeCanvas.width = canvas.width;
    fadeCanvas.height = canvas.height;
    blobSoftCanvas.width = canvas.width;
    blobSoftCanvas.height = canvas.height;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    terrainCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fadeCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    blobSoftCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rebuildCells();
  }

  function localRect(selector, fallback) {
    var el = document.querySelector(selector);
    if (!el) return fallback;
    var er = el.getBoundingClientRect();
    var cr = canvas.getBoundingClientRect();
    return { x: er.left-cr.left, y: er.top-cr.top, w: er.width, h: er.height,
             cx: er.left-cr.left+er.width*0.5, cy: er.top-cr.top+er.height*0.5 };
  }

  function baseGeometry() {
    var s = Math.min(H * 0.54, 460);
    return localRect('.vr-base-blob', {
      x: W*0.52-s*0.5, y: H*0.50-s*0.5, w: s, h: s, cx: W*0.52, cy: H*0.50
    });
  }

  function glassGeometry(t, base) {
    var w = window.innerWidth < 900 ? 130 : 205;
    var h = window.innerWidth < 900 ? 118 : 185;
    // Clamp drift so glass never leaves terrain
    var rawDx = W * 0.07 * Math.sin(t * 0.24 + 1.6);
    var rawDy = H * 0.06 * Math.cos(t * 0.20 + 0.9);
    var blobR = Math.min(base.w, base.h) * 0.40;
    var halfG = Math.max(w, h) * 0.55;
    var maxDrift = Math.max(0, blobR - halfG);
    var dist = Math.sqrt(rawDx*rawDx + rawDy*rawDy);
    if (dist > maxDrift) { var sc = maxDrift/dist; rawDx*=sc; rawDy*=sc; }
    return { w: w, h: h, cx: base.cx+rawDx, cy: base.cy+rawDy };
  }

  function animatedPeak(peak, t) {
    return { x: peak.x, y: peak.y,
      amp: peak.amp * (1 + 0.06 * Math.sin(t*0.35 + peak.x*9.1 + peak.y*6.3)),
      sig: peak.sig };
  }

  function surfaceHeight(u, v, t) {
      var h = 0;
      
      for (var ii = 0; ii < peaks.length; ii++) {
          var p = animatedPeak(peaks[ii], t);
          var dx = u - p.x;
          var dy = v - p.y;
          
          h += p.amp * Math.exp(-(dx*dx + dy*dy) / (2 * p.sig * p.sig));
      }
  
      // Faster edge fade (avoid heavy Math.pow when possible)
      var du = Math.abs(u - 0.5);
      var dv = Math.abs(v - 0.5);
      var edgeFade = 1.0;
      
      if (du > 0.65 || dv > 0.65) {
          var fadeX = du > 0.65 ? Math.exp(-Math.pow((du - 0.65) * 6, 2)) : 1;
          var fadeY = dv > 0.65 ? Math.exp(-Math.pow((dv - 0.65) * 6, 2)) : 1;
          edgeFade = fadeX * fadeY;
      }
  
      return Math.min(h * edgeFade, 1);
  }

  function isoFromBase(base) {
    var s = Math.min(base.w, base.h);
    return { cx: base.cx, cy: base.cy+s*0.055, tileW: s*0.0206, tileH: s*0.0113, peakH: s*0.205 };
  }

  function isoProject(u, v, h, iso) {
    var ix = (u-0.5)*GRID, iy = (v-0.5)*GRID;
    return { x: iso.cx+(ix-iy)*iso.tileW, y: iso.cy+(ix+iy)*iso.tileH-h*iso.peakH };
  }

  function mix(a, b, t) { return Math.round(a+(b-a)*t); }

  function colorForHeight(h, sharp) {
    var pp = Math.pow(Math.max(0,h), 0.58);
    var hot = Math.pow(Math.max(0,h-0.42)/0.58, 1.25);
    var r = mix(82,222,pp), g = mix(38,126,pp), b = mix(18,58,pp);
    if (hot > 0) { r=mix(r,255,hot); g=mix(g,224,hot); b=mix(b,170,hot); }
    var fillA = sharp ? 0.82+h*0.16 : 0.72+h*0.18;
    var strokeA = sharp ? 0.38+h*0.54 : 0.20+h*0.38;
    if (sharp) {
      r=Math.min(255,r+18); g=Math.min(255,g+18); b=Math.min(255,b+18);
      fillA=Math.min(1,fillA+0.12);
    }
    var sr=mix(168,255,Math.max(pp,hot)), sg=mix(84,234,Math.max(pp,hot)), sb=mix(40,195,hot);
    if (sharp) { sr=Math.min(255,sr+28); sg=Math.min(255,sg+28); sb=Math.min(255,sb+28); strokeA=Math.min(1,strokeA+0.18); }
    return {
      fill: 'rgba('+r+','+g+','+b+','+fillA.toFixed(3)+')',
      stroke: 'rgba('+sr+','+sg+','+sb+','+strokeA.toFixed(3)+')'
    };
  }

  function traceBlob(target, cx, cy, rx, ry, morph, t) {
    var steps = 112;
    target.beginPath();
    for (var ii = 0; ii <= steps; ii++) {
      var a = (ii/steps)*Math.PI*2, d = 0;
      for (var m = 0; m < morph.length; m++) {
        d += morph[m].amp * Math.sin(morph[m].freq*a + t*morph[m].sp + morph[m].ph);
      }
      var x = cx+rx*(1+d)*Math.cos(a), y = cy+ry*(1+d)*Math.sin(a);
      if (ii===0) target.moveTo(x,y); else target.lineTo(x,y);
    }
    target.closePath();
  }

  // ── Terrain rendering ────────────────────────────────────────────────────

  function drawTerrainCell(cell, t, iso, sharp) {
    var h00=surfaceHeight(cell.u0,cell.v0,t), h10=surfaceHeight(cell.u1,cell.v0,t);
    var h01=surfaceHeight(cell.u0,cell.v1,t), h11=surfaceHeight(cell.u1,cell.v1,t);
    var hi=Math.max(h00,h10,h01,h11);
    var col=colorForHeight(hi,sharp);
    var pts=[isoProject(cell.u0,cell.v0,h00,iso),isoProject(cell.u1,cell.v0,h10,iso),
             isoProject(cell.u1,cell.v1,h11,iso),isoProject(cell.u0,cell.v1,h01,iso)];
    terrainCtx.beginPath();
    terrainCtx.moveTo(pts[0].x,pts[0].y); terrainCtx.lineTo(pts[1].x,pts[1].y);
    terrainCtx.lineTo(pts[2].x,pts[2].y); terrainCtx.lineTo(pts[3].x,pts[3].y);
    terrainCtx.closePath();
    terrainCtx.fillStyle=col.fill; terrainCtx.strokeStyle=col.stroke;
    terrainCtx.lineWidth=sharp?0.82:0.48; terrainCtx.fill(); terrainCtx.stroke();
  }

  function applyTerrainFade(base, t) {
    var brx=base.w*0.50, bry=base.h*0.46;
    fadeCtx.clearRect(0,0,W,H);
    fadeCtx.save();
    traceBlob(fadeCtx,base.cx,base.cy,brx,bry,blobMorph,t);
    fadeCtx.clip();
    // Outer radius pushed to 1.18 (was 1.02) so fade finishes outside blob edge.
    // Inner solid zone extended to 0.70 (was 0.58) — more opaque terrain before fade.
    var grad=fadeCtx.createRadialGradient(base.cx,base.cy,Math.min(brx,bry)*0.18,base.cx,base.cy,Math.max(brx,bry)*1.18);
    grad.addColorStop(0,    'rgba(255,255,255,1)');
    grad.addColorStop(0.70, 'rgba(255,255,255,0.98)');
    grad.addColorStop(0.88, 'rgba(255,255,255,0.72)');
    grad.addColorStop(1,    'rgba(255,255,255,0)');
    fadeCtx.fillStyle=grad;
    fadeCtx.fillRect(base.cx-brx*1.3,base.cy-bry*1.4,brx*2.6,bry*2.8);
    fadeCtx.restore();
    terrainCtx.save();
    terrainCtx.globalCompositeOperation='destination-in';
    terrainCtx.drawImage(fadeCanvas,0,0,W,H);
    terrainCtx.restore();
  }

  function renderTerrain(t, iso, base) {
    terrainCtx.clearRect(0,0,W,H);
    terrainCtx.save();
    for (var ii=0; ii<cells.length; ii++) drawTerrainCell(cells[ii],t,iso,true);
    terrainCtx.restore();
    applyTerrainFade(base,t);
  }

  // ── Liquid glass — reference-quality look ────────────────────────────────
  //
  // The key insight from the reference SVG filter:
  //   1. A displacement map creates strong refraction at edges
  //   2. The interior is relatively clear
  //   3. A rim "caustic" ring glows with chromatic character
  //
  // In Canvas 2D we approximate displacement by drawing the terrain
  // multiple times at tiny offsets near the blob edge, creating the
  // same "bent light" effect without SVG filter access.

  function drawLiquidGlass(glass, t) {
    var rx = glass.w * 0.50;
    var ry = glass.h * 0.50;
    var cx = glass.cx, cy = glass.cy;

    // ── 1. EDGE REFRACTION RING ──────────────────────────────────────────
    // Approximate the feDisplacementMap edge effect:
    // Draw terrain shifted outward in many radial directions at the rim,
    // each at low alpha. This creates a halo of "refracted" terrain pixels
    // exactly at the glass boundary — the same visual as a displacement map.
    var refractOffsets = 12;
    var edgeShift = rx * 0.055;  // how far light bends at the rim
    for (var ii = 0; ii < refractOffsets; ii++) {
      var angle = (ii / refractOffsets) * Math.PI * 2;
      var ox = Math.cos(angle) * edgeShift;
      var oy = Math.sin(angle) * edgeShift;
      ctx.save();
      // Clip to just the edge ring (outer blob minus inner 85%)
      traceBlob(ctx, cx, cy, rx, ry, glassMorph, t);
      ctx.clip();
      // Exclude the inner area by inverse-clip trick:
      // fill outer rect then subtract inner blob
      ctx.beginPath();
      ctx.rect(-10, -10, W+20, H+20);
      traceBlob(ctx, cx, cy, rx*0.78, ry*0.78, glassMorph, t);
      ctx.clip('evenodd');
      ctx.filter = 'blur(1.5px)';
      ctx.globalAlpha = 0.045;
      ctx.drawImage(terrainCanvas, ox, oy, W, H);
      ctx.restore();
    }

    // ── 2. FROSTED INTERIOR ───────────────────────────────────────────────
    // Soft blurred terrain inside the glass, slightly zoomed (lens effect)
    ctx.save();
    traceBlob(ctx, cx, cy, rx*0.82, ry*0.82, glassMorph, t);
    ctx.clip();
    ctx.filter = 'blur(4px)';
    ctx.globalAlpha = 0.32;
    ctx.translate(cx, cy); ctx.scale(1.04, 1.04); ctx.translate(-cx, -cy);
    ctx.drawImage(terrainCanvas, 0, 0, W, H);
    ctx.restore();

    // ── 3. SHARP MAGNIFIED TERRAIN (main view through glass) ─────────────
    ctx.save();
    traceBlob(ctx, cx, cy, rx*0.84, ry*0.84, glassMorph, t);
    ctx.clip();
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;
    ctx.translate(cx, cy); ctx.scale(1.055, 1.055); ctx.translate(-cx, -cy);
    ctx.drawImage(terrainCanvas, 0, 0, W, H);
    ctx.restore();

    // ── 4. INNER EDGE DARKENING (glass thickness illusion) ───────────────
    ctx.save();
    traceBlob(ctx, cx, cy, rx, ry, glassMorph, t);
    ctx.clip();
    var darkRing = ctx.createRadialGradient(cx, cy, rx*0.72, cx, cy, rx*1.05);
    darkRing.addColorStop(0, 'rgba(30,12,4,0)');
    darkRing.addColorStop(0.55, 'rgba(30,12,4,0)');
    darkRing.addColorStop(0.78, 'rgba(30,12,4,0.22)');
    darkRing.addColorStop(1, 'rgba(30,12,4,0.52)');
    ctx.fillStyle = darkRing;
    ctx.fillRect(cx-rx*1.1, cy-ry*1.1, rx*2.2, ry*2.2);
    ctx.restore();

    // ── 5. GLASS BODY TINT (warm amber, like thick glass) ────────────────
    ctx.save();
    traceBlob(ctx, cx, cy, rx, ry, glassMorph, t);
    ctx.clip();
    var tint = ctx.createRadialGradient(cx-rx*0.2, cy-ry*0.25, 0, cx+rx*0.1, cy+ry*0.1, rx*1.1);
    tint.addColorStop(0,    'rgba(255,250,238,0.08)');
    tint.addColorStop(0.5,  'rgba(235,195,140,0.06)');
    tint.addColorStop(0.82, 'rgba(180,110,50,0.10)');
    tint.addColorStop(1,    'rgba(110,55,15,0.18)');
    ctx.fillStyle = tint;
    ctx.fillRect(cx-rx*1.1, cy-ry*1.1, rx*2.2, ry*2.2);
    ctx.restore();

    // ── 6. OUTER RIM — bright caustic ring (the key glass-like detail) ───
    // Multi-layer strokes to simulate the refracted light ring at the edge.
    // The reference glass gets this from its displacement map caustics.

    // Outermost glow halo
    ctx.save();
    traceBlob(ctx, cx, cy, rx*1.015, ry*1.015, glassMorph, t);
    ctx.strokeStyle = 'rgba(255,245,220,0.12)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    // Primary bright rim
    ctx.save();
    traceBlob(ctx, cx, cy, rx, ry, glassMorph, t);
    ctx.strokeStyle = 'rgba(255,248,230,0.58)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // Inner darker rim (glass edge shadow)
    ctx.save();
    traceBlob(ctx, cx, cy, rx*0.964, ry*0.964, glassMorph, t);
    ctx.strokeStyle = 'rgba(200,140,70,0.22)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    // Second inner bright ring (double refraction)
    ctx.save();
    traceBlob(ctx, cx, cy, rx*0.932, ry*0.932, glassMorph, t);
    ctx.strokeStyle = 'rgba(255,245,215,0.11)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // ── 7. SPECULAR HIGHLIGHT — top-left (key light) ─────────────────────
    ctx.save();
    traceBlob(ctx, cx, cy, rx, ry, glassMorph, t);
    ctx.clip();
    var spec = ctx.createRadialGradient(
      cx-rx*0.38, cy-ry*0.42, 0,
      cx-rx*0.14, cy-ry*0.18, rx*0.50
    );
    spec.addColorStop(0,   'rgba(255,255,248,0.42)');
    spec.addColorStop(0.4, 'rgba(255,252,238,0.14)');
    spec.addColorStop(0.8, 'rgba(255,248,228,0.04)');
    spec.addColorStop(1,   'rgba(255,245,220,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(cx-rx, cy-ry, rx*2, ry*2);
    ctx.restore();

    // ── 8. BOTTOM-RIGHT SHADOW (glass depth) ─────────────────────────────
    ctx.save();
    traceBlob(ctx, cx, cy, rx, ry, glassMorph, t);
    ctx.clip();
    var shad = ctx.createRadialGradient(cx+rx*0.44, cy+ry*0.50, 0, cx+rx*0.44, cy+ry*0.50, rx*0.95);
    shad.addColorStop(0,   'rgba(55,18,5,0.20)');
    shad.addColorStop(0.6, 'rgba(55,18,5,0.06)');
    shad.addColorStop(1,   'rgba(55,18,5,0)');
    ctx.fillStyle = shad;
    ctx.fillRect(cx-rx, cy-ry, rx*2, ry*2);
    ctx.restore();
  }

  // ── Main draw loop ───────────────────────────────────────────────────────

  function drawFrame(ts) {
    if (!document.body.contains(canvas)) { cleanup(); return; }
    if (!start) start = ts;
    var t = (ts - start) / 1000;

    if (!paused) {
      var base = baseGeometry();
      var glass = glassGeometry(t, base);
      var iso = isoFromBase(base);
      var brx = base.w*0.50, bry = base.h*0.46;
      var grx = glass.w*0.50, gry = glass.h*0.50;

      renderTerrain(t, iso, base);
      ctx.clearRect(0, 0, W, H);

      // Ambient warm glow
      ctx.save();
      var amb = ctx.createRadialGradient(base.cx, base.cy-bry*0.12, 0, base.cx, base.cy, Math.max(brx,bry)*1.32);
      amb.addColorStop(0,    'rgba(248,196,142,0.36)');
      amb.addColorStop(0.45, 'rgba(192,82,42,0.22)');
      amb.addColorStop(0.78, 'rgba(92,42,20,0.12)');
      amb.addColorStop(1,    'rgba(92,42,20,0)');
      ctx.fillStyle = amb;
      ctx.fillRect(base.cx-brx*1.45, base.cy-bry*1.55, brx*2.9, bry*3.1);
      ctx.restore();

      // Soft color bloom behind blob
      ctx.save();
      ctx.filter = 'blur(32px)';
      ctx.globalAlpha = 0.22;
      traceBlob(ctx, base.cx, base.cy, brx, bry, blobMorph, t);
      ctx.fillStyle = 'rgba(192,82,42,0.65)';
      ctx.fill();
      ctx.restore();

      // Main blob body — soft-edge compositing via offscreen canvas.
      // Drawing blurred terrain into blobSoftCanvas THEN masking with a
      // radial gradient means the edge feathers in alpha-space, not at a
      // hard clip boundary. The clip system never touches the blur output.
      blobSoftCtx.clearRect(0, 0, W, H);
      // Step 1: draw terrain oversized (1.15×) so blur has room to decay
      // before hitting the mask — no hard-edge stencil involved.
      blobSoftCtx.save();
      blobSoftCtx.filter = 'blur(18px)';
      blobSoftCtx.globalAlpha = 0.96;
      blobSoftCtx.drawImage(terrainCanvas, 0, 0, W, H);
      blobSoftCtx.restore();
      // Step 2: punch the blob silhouette via destination-in + soft radial mask.
      // The gradient fades from fully opaque centre to transparent at the true
      // blob radius — so the blur decays naturally into nothing at the edge
      // with zero visible hard boundary.
      blobSoftCtx.save();
      blobSoftCtx.globalCompositeOperation = 'destination-in';
      var softMask = blobSoftCtx.createRadialGradient(
        base.cx, base.cy, brx * 0.30,
        base.cx, base.cy, brx * 1.08
      );
      softMask.addColorStop(0,    'rgba(0,0,0,1)');
      softMask.addColorStop(0.68, 'rgba(0,0,0,1)');
      softMask.addColorStop(0.88, 'rgba(0,0,0,0.55)');
      softMask.addColorStop(1,    'rgba(0,0,0,0)');
      blobSoftCtx.fillStyle = softMask;
      blobSoftCtx.fillRect(0, 0, W, H);
      blobSoftCtx.restore();
      // Step 3: composite the soft blob onto the main canvas
      ctx.save();
      ctx.drawImage(blobSoftCanvas, 0, 0, W, H);
      ctx.restore();

      // Darken the area where glass sits (so glass pops over it)
      ctx.save();
      traceBlob(ctx, base.cx, base.cy, brx, bry, blobMorph, t);
      ctx.clip();
      traceBlob(ctx, glass.cx, glass.cy, grx, gry, glassMorph, t);
      ctx.clip();
      ctx.fillStyle = 'rgba(38,18,6,0.42)';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Sharp terrain visible through glass area
      ctx.save();
      traceBlob(ctx, base.cx, base.cy, brx, bry, blobMorph, t);
      ctx.clip();
      traceBlob(ctx, glass.cx, glass.cy, grx, gry, glassMorph, t);
      ctx.clip();
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.drawImage(terrainCanvas, 0, 0, W, H);
      ctx.restore();

      // Glass lens overlay
      drawLiquidGlass(glass, t);
    }

    raf = requestAnimationFrame(drawFrame);
  }

  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); }
  function onVisibility() { paused = document.hidden; if (!paused) start = 0; }

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
