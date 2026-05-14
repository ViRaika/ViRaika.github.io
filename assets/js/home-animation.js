// Soft animated gradient mesh for home page
// Slow warm orbs drifting — clean, intentional

(function () {
  const canvas = document.getElementById('home-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // Soft warm orbs that slowly breathe and drift
  const orbs = [
    { x: 0.18, y: 0.28, r: 0.58, color: [220, 180, 140], phase: 0.0,  sx: 0.00014, sy: 0.00011, ox: 0.13, oy: 0.11 },
    { x: 0.82, y: 0.18, r: 0.52, color: [205, 165, 125], phase: 1.4,  sx: 0.00010, sy: 0.00016, ox: 0.11, oy: 0.13 },
    { x: 0.62, y: 0.82, r: 0.62, color: [240, 225, 200], phase: 2.8,  sx: 0.00013, sy: 0.00009, ox: 0.14, oy: 0.09 },
    { x: 0.28, y: 0.72, r: 0.48, color: [195, 170, 140], phase: 4.2,  sx: 0.00017, sy: 0.00013, ox: 0.08, oy: 0.12 },
  ];

  function drawOrb(orb, t) {
    const cx = (orb.x + Math.sin(t * orb.sx * 1000 + orb.phase) * orb.ox) * W;
    const cy = (orb.y + Math.cos(t * orb.sy * 800  + orb.phase) * orb.oy) * H;
    const radius = orb.r * Math.max(W, H);
    const [r, g, b] = orb.color;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0,    `rgba(${r},${g},${b}, 0.60)`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b}, 0.20)`);
    grad.addColorStop(1,    `rgba(${r},${g},${b}, 0)`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function tick(t) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#F5EFE4';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'multiply';
    orbs.forEach(o => drawOrb(o, t));
    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);
})();
