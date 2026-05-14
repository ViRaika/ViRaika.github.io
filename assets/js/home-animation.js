// Soft drifting particle field for home page
// Warm, minimal, barely-there

(function () {
  const canvas = document.getElementById('home-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Warm palette — very faint
  const COLORS = [
    'rgba(192, 82, 42, ',   // terracotta
    'rgba(94, 124, 94, ',   // sage
    'rgba(180, 150, 110, ', // warm tan
    'rgba(160, 120, 90, ',  // brown
  ];

  let W, H, particles, lines;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // Each particle is a slow-drifting soft dot
  function makeParticle() {
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      r:    1.5 + Math.random() * 2.5,       // tiny radius
      vx:   (Math.random() - 0.5) * 0.18,   // very slow
      vy:   (Math.random() - 0.5) * 0.18,
      base_alpha: 0.06 + Math.random() * 0.10, // very faint
      alpha: 0,
      alpha_target: 0,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      // breathing cycle
      breath: Math.random() * Math.PI * 2,
      breath_speed: 0.004 + Math.random() * 0.006,
    };
  }

  function init() {
    resize();
    const COUNT = Math.floor((W * H) / 18000); // sparse
    particles = Array.from({ length: COUNT }, makeParticle);
    // warm-in: start alpha at 0
    particles.forEach(p => { p.alpha = 0; p.alpha_target = p.base_alpha; });
  }

  function drawConnections() {
    // draw faint lines between nearby particles
    const DIST = 140;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < DIST) {
          const opacity = (1 - d / DIST) * 0.04; // very faint lines
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(160, 130, 100, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  let raf;
  function tick() {
    ctx.clearRect(0, 0, W, H);

    drawConnections();

    particles.forEach(p => {
      // drift
      p.x += p.vx;
      p.y += p.vy;

      // soft wrap
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;

      // breathe
      p.breath += p.breath_speed;
      const breathed = p.base_alpha + Math.sin(p.breath) * (p.base_alpha * 0.4);

      // ease alpha in
      p.alpha += (breathed - p.alpha) * 0.02;

      // draw dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();
    });

    raf = requestAnimationFrame(tick);
  }

  function handleResize() {
    resize();
    // redistribute particles
    particles.forEach(p => {
      if (p.x > W) p.x = Math.random() * W;
      if (p.y > H) p.y = Math.random() * H;
    });
  }

  window.addEventListener('resize', handleResize);

  init();
  tick();
})();
