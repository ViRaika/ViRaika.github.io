(function () {
  var canvas = document.getElementById('home-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: true });
  var W, H;
  var paused = false;
  var startTime = null;

  var isMobile = window.innerWidth < 768;
  var DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // Blobs spread across the whole right panel, higher opacity
  var desktopBlobs = [
    {
      cx: 0.55, cy: 0.35,
      baseR: 0.36,
      r: 192, g: 95, b: 55,    // deep terracotta
      opacity: 0.72,
      drift: { ax: 0.05, ay: 0.06, sx: 0.20, sy: 0.16, phase: 0.0 },
      morph: [
        { amp: 0.10, freq: 2, speed: 0.25, phase: 0.0 },
        { amp: 0.05, freq: 3, speed: 0.16, phase: 1.4 },
      ],
    },
    {
      cx: 0.78, cy: 0.55,
      baseR: 0.28,
      r: 210, g: 148, b: 88,   // warm amber
      opacity: 0.60,
      drift: { ax: 0.05, ay: 0.04, sx: 0.17, sy: 0.22, phase: 2.0 },
      morph: [
        { amp: 0.09, freq: 2, speed: 0.22, phase: 2.6 },
        { amp: 0.04, freq: 3, speed: 0.14, phase: 0.5 },
      ],
    },
    {
      cx: 0.42, cy: 0.72,
      baseR: 0.26,
      r: 100, g: 138, b: 105,  // sage
      opacity: 0.50,
      drift: { ax: 0.04, ay: 0.05, sx: 0.15, sy: 0.19, phase: 4.3 },
      morph: [
        { amp: 0.08, freq: 2, speed: 0.19, phase: 1.1 },
        { amp: 0.04, freq: 3, speed: 0.12, phase: 3.4 },
      ],
    },
  ];

  var mobileBlobs = [
    {
      cx: 0.50, cy: 0.38,
      baseR: 0.32,
      r: 192, g: 95, b: 55,
      opacity: 0.65,
      drift: { ax: 0.03, ay: 0.03, sx: 0.18, sy: 0.14, phase: 0.0 },
      morph: [{ amp: 0.08, freq: 2, speed: 0.20, phase: 0.0 }],
    },
    {
      cx: 0.40, cy: 0.70,
      baseR: 0.24,
      r: 100, g: 138, b: 105,
      opacity: 0.48,
      drift: { ax: 0.025, ay: 0.025, sx: 0.14, sy: 0.17, phase: 2.1 },
      morph: [{ amp: 0.07, freq: 2, speed: 0.16, phase: 1.8 }],
    },
  ];

  var blobs  = isMobile ? mobileBlobs : desktopBlobs;
  var POINTS = isMobile ? 48 : 80;
  var BLUR   = isMobile ? 48 : 70; // big blur = creamy soft edges

  function drawBlob(blob, t) {
    var d = blob.drift;
    var cx = (blob.cx + Math.sin(t * d.sx + d.phase)       * d.ax) * W;
    var cy = (blob.cy + Math.cos(t * d.sy + d.phase + 1.1) * d.ay) * H;
    var baseR = blob.baseR * Math.min(W, H);

    ctx.beginPath();
    for (var i = 0; i <= POINTS; i++) {
      var angle = (i / POINTS) * Math.PI * 2;
      var distort = 0;
      blob.morph.forEach(function (layer) {
        distort += layer.amp * Math.sin(layer.freq * angle + t * layer.speed + layer.phase);
      });
      var rad = baseR * (1 + distort);
      var x = cx + rad * Math.cos(angle);
      var y = cy + rad * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
    }
    ctx.closePath();

    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.2);
    var r = blob.r, g = blob.g, b = blob.b, o = blob.opacity;
    grad.addColorStop(0,    'rgba(' + r + ',' + g + ',' + b + ',' + o + ')');
    grad.addColorStop(0.50, 'rgba(' + r + ',' + g + ',' + b + ',' + (o * 0.55) + ')');
    grad.addColorStop(0.85, 'rgba(' + r + ',' + g + ',' + b + ',' + (o * 0.10) + ')');
    grad.addColorStop(1,    'rgba(' + r + ',' + g + ',' + b + ',0)');

    ctx.save();
    ctx.filter = 'blur(' + BLUR + 'px)';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  function tick(timestamp) {
    if (startTime === null) startTime = timestamp;
    var t = (timestamp - startTime) / 1000;
    if (!paused) {
      ctx.clearRect(0, 0, W, H);
      blobs.forEach(function (b) { drawBlob(b, t); });
    }
    requestAnimationFrame(tick);
  }

  document.addEventListener('visibilitychange', function () {
    paused = document.hidden;
    if (!paused) startTime = null;
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  resize();
  requestAnimationFrame(tick);
})();
