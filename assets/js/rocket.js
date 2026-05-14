(function() {
  const PIXEL = 4;
  const ROCKET_FRAMES = [
    [
      "....RRR.....",
      "...RRRRR...",
      "...RRRRR...",
      "..RRRRRRR..",
      "..RRRRRRR..",
      ".RRRRRRRRR.",
      ".RRRRRRRRR.",
      "RRRRRRRRRRRR",
      "RRRRRRRRRRRR",
      ".RRRRRRRRR.",
      ".RRRRRRRRR.",
      "..RR...RR..",
      "..RR...RR..",
      ".FFF...FFF.",
      ".FFF...FFF.",
      "..FF...FF..",
    ],
    [
      "....RRR.....",
      "...RRRRR...",
      "...RRRRR...",
      "..RRRRRRR..",
      "..RRRRRRR..",
      ".RRRRRRRRR.",
      ".RRRRRRRRR.",
      "RRRRRRRRRRRR",
      "RRRRRRRRRRRR",
      ".RRRRRRRRR.",
      ".RRRRRRRRR.",
      "..RR...RR..",
      "..RR...RR..",
      "..FF...FF..",
      ".FFFF.FFFF.",
      "..FFF.FFF..",
    ]
  ];

  const COLORS = { R: '#E8C4A0', F: '#E07040' };
  const canvas = document.getElementById('rocket-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLS = ROCKET_FRAMES[0][0].length;
  const ROWS = ROCKET_FRAMES[0].length;
  const W = COLS * PIXEL;
  const H = ROWS * PIXEL;

  canvas.width = W + 20;
  canvas.height = H + 10;
  canvas.style.cssText = `position:fixed;top:0;left:-${W+20}px;z-index:999;pointer-events:none;image-rendering:pixelated;`;

  let phase = 'idle', x = -(W+20), y = 8, frameIdx = 0, frameTimer = 0;
  let stutterCount = 0, velY = 0, animHandle = null;

  function drawRocket(frame) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < ROWS; row++) {
      const line = frame[row];
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        if (ch === '.') continue;
        ctx.fillStyle = ch === 'R' ? COLORS.R : COLORS.F;
        ctx.fillRect(col * PIXEL, row * PIXEL, PIXEL, PIXEL);
      }
    }
  }

  function tick() {
    frameTimer++;
    if (frameTimer % 8 === 0) frameIdx = (frameIdx + 1) % 2;
    drawRocket(ROCKET_FRAMES[frameIdx]);

    if (phase === 'fly-in') {
      x += 3;
      canvas.style.left = x + 'px';
      if (x >= 12) { x = 12; canvas.style.left = x + 'px'; phase = 'stutter'; stutterCount = 0; }
    } else if (phase === 'stutter') {
      stutterCount++;
      x += (stutterCount % 12 < 6) ? 1.5 : -1.5;
      canvas.style.left = x + 'px';
      if (stutterCount > 72) { phase = 'fly-up'; velY = 0; }
    } else if (phase === 'fly-up') {
      velY -= 0.25; y += velY; x += 1.5;
      canvas.style.top = y + 'px';
      canvas.style.left = x + 'px';
      if (y < -(H + 30)) {
        cancelAnimationFrame(animHandle);
        phase = 'idle'; x = -(W+20); y = 8;
        canvas.style.left = x + 'px'; canvas.style.top = y + 'px';
        return;
      }
    } else { cancelAnimationFrame(animHandle); return; }

    animHandle = requestAnimationFrame(tick);
  }

  function launchRocket() {
    if (phase !== 'idle') return;
    cancelAnimationFrame(animHandle);
    x = -(W+20); y = 8;
    canvas.style.left = x + 'px'; canvas.style.top = y + 'px';
    phase = 'fly-in'; frameTimer = 0;
    animHandle = requestAnimationFrame(tick);
  }

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') launchRocket();
  });

  setTimeout(launchRocket, 600);
})();
