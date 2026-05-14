(function () {
  const canvas = document.getElementById('home-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // Warm, muted ring colours — close to the page background so they feel etched in
  const COLORS = [
    '192, 82, 42',   // terracotta
    '94, 124, 94',   // sage
    '160, 130, 100', // warm tan
    '180, 150, 115', // dusty brown
  ];

  const rings = [];

  function spawnRing() {
    rings.push({
      x:       Math.random() * W,
      y:       Math.random() * H,
      r:       0,
      maxR:    80 + Math.random() * 120,   // how far it expands
      speed:   0.28 + Math.random() * 0.18, // px per frame — slow
      alpha:   0.22 + Math.random() * 0.12, // start opacity — faint
      width:   0.6 + Math.random() * 0.6,  // stroke width
      color:   COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }

  // Spawn a ring every 1.2–2.4 seconds
  function scheduleNext() {
    const delay = 1200 + Math.random() * 1200;
    setTimeout(function () {
      spawnRing();
      scheduleNext();
    }, delay);
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.r += ring.speed;

      // Fade out as it expands
      const progress = ring.r / ring.maxR;           // 0 → 1
      const opacity  = ring.alpha * (1 - progress);  // linear fade

      if (opacity <= 0 || ring.r > ring.maxR) {
        rings.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ring.color}, ${opacity})`;
      ctx.lineWidth = ring.width;
      ctx.stroke();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();

  // Seed a couple of rings immediately so the page isn't empty on load
  spawnRing();
  setTimeout(spawnRing, 600);
  setTimeout(spawnRing, 1400);

  scheduleNext();
  tick();
})();
