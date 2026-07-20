(function () {
  const canvas = document.getElementById("embers") || document.getElementById("dust");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  let w, h, particles;

  function resize() {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }

  function makeParticle() {
    const gold = Math.random() > 0.35;
    return {
      x: Math.random() * w,
      y: h + Math.random() * h,
      r: (Math.random() * 1.8 + 0.4) * devicePixelRatio,
      s: (Math.random() * 0.5 + 0.15) * devicePixelRatio,
      drift: (Math.random() - 0.5) * 0.4,
      a: Math.random() * 0.5 + 0.15,
      hue: gold ? "212,162,74" : "192,31,42",
      tw: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    const count = Math.min(90, Math.floor(window.innerWidth / 14));
    particles = Array.from({ length: count }, makeParticle);
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.y -= p.s;
      p.x += p.drift;
      p.tw += 0.03;
      if (p.y < -10) Object.assign(p, makeParticle(), { y: h + 10 });
      const flicker = p.a * (0.6 + 0.4 * Math.sin(p.tw));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue},${flicker})`;
      ctx.shadowBlur = 8 * devicePixelRatio;
      ctx.shadowColor = `rgba(${p.hue},${flicker})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  init();
  frame();
})();
