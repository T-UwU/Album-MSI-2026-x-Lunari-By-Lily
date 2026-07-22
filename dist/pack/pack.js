
(function () {
  "use strict";

  function packBase() {
    return (window.ALBUM_CONFIG && window.ALBUM_CONFIG.packAssets) || "/static/pack/";
  }

  const ACCENTS = {
    legendaria: "#f2ce7e",
    epica: "#b06cff",
    rara: "#8fb7c9",
    especial: "#e0563f",
  };
  const RANK = { especial: 0, rara: 1, epica: 2, legendaria: 3 };
  const BURST = { especial: 26, rara: 32, epica: 46, legendaria: 72 };

  function accentOf(c) {
    return c.accent || ACCENTS[c.rarity] || "#d4a24a";
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  function createFX(canvas) {
    const ctx = canvas.getContext("2d");
    let parts = [];
    let running = true;

    function resize() {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
    }
    resize();
    window.addEventListener("resize", resize);

    function burst(cx, cy, colors, count) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (Math.random() * 7 + 2) * devicePixelRatio;
        parts.push({
          kind: "spark",
          x: cx * devicePixelRatio,
          y: cy * devicePixelRatio,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 2 * devicePixelRatio,
          r: (Math.random() * 2.4 + 1) * devicePixelRatio,
          life: 1,
          decay: Math.random() * 0.02 + 0.012,
          rgb: hexToRgb(colors[Math.floor(Math.random() * colors.length)]),
        });
      }
    }

    function confetti(count) {
      const colors = ["#f2ce7e", "#d4a24a", "#c01f2a", "#ece7dd"];
      for (let i = 0; i < count; i++) {
        parts.push({
          kind: "confetti",
          x: Math.random() * canvas.width,
          y: -Math.random() * canvas.height * 0.3,
          vx: (Math.random() - 0.5) * 1.6 * devicePixelRatio,
          vy: (Math.random() * 2.2 + 1.4) * devicePixelRatio,
          w: (Math.random() * 6 + 4) * devicePixelRatio,
          h: (Math.random() * 4 + 3) * devicePixelRatio,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.2,
          life: 1,
          decay: Math.random() * 0.004 + 0.002,
          rgb: hexToRgb(colors[Math.floor(Math.random() * colors.length)]),
        });
      }
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = parts.filter((p) => p.life > 0);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        const alpha = Math.max(p.life, 0);
        if (p.kind === "spark") {
          p.vy += 0.14 * devicePixelRatio;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.rgb},${alpha})`;
          ctx.shadowBlur = 10 * devicePixelRatio;
          ctx.shadowColor = `rgba(${p.rgb},${alpha})`;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          p.rot += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = `rgba(${p.rgb},${alpha})`;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      requestAnimationFrame(frame);
    }
    frame();

    return {
      burst,
      confetti,
      stop() {
        running = false;
        window.removeEventListener("resize", resize);
      },
    };
  }

  function open(cards) {
    if (!cards || !cards.length) return Promise.resolve();
    cards = cards.slice().sort((a, b) => (RANK[a.rarity] || 0) - (RANK[b.rarity] || 0));
    const BASE = packBase();

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "pack-overlay";
      overlay.innerHTML = `
        <canvas class="pack-fx"></canvas>
        <button class="pack-close" aria-label="Cerrar">✕</button>
        <div class="pack-stage">
          <div class="booster-scene">
            <div class="booster-float">
              <div class="booster" role="button" aria-label="Abrir sobre">
                <div class="b-glow"></div>
                <div class="b-back"></div>
                <div class="b-edge b-e-l"></div>
                <div class="b-edge b-e-r"></div>
                <div class="b-edge b-e-t"></div>
                <div class="b-edge b-e-b"></div>
                <div class="b-strip"></div>
                <div class="b-body">
                  <img class="b-cover" src="${BASE}booster-cover.png" alt="" draggable="false">
                  <div class="b-foil"></div>
                  <span class="b-count">× ${cards.length} ficha${cards.length === 1 ? "" : "s"}</span>
                  <div class="b-crimp"></div>
                </div>
              </div>
            </div>
            <p class="pack-hint">¡Ganaste un sobre! Tócalo para rasgarlo</p>
          </div>
          <div class="pack-cards"></div>
          <p class="cards-hint">Toca para revelar tus fichas</p>
          <div class="pack-meta"><p class="pm-code"></p><p class="pm-rarity"></p></div>
          <div class="pack-progress"></div>
          <div class="pack-summary">
            <p class="ps-title">¡Nuevas fichas!</p>
            <p class="ps-sub"></p>
            <button class="ps-btn">Verlas en el álbum</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      document.body.classList.add("pack-open");
      requestAnimationFrame(() => overlay.classList.add("show"));

      const fx = createFX(overlay.querySelector(".pack-fx"));
      const booster = overlay.querySelector(".booster");
      const cardsEl = overlay.querySelector(".pack-cards");
      const cardsHint = overlay.querySelector(".cards-hint");
      const metaEl = overlay.querySelector(".pack-meta");
      const progEl = overlay.querySelector(".pack-progress");

      const cardEls = cards.map((c, i) => {
        const card = document.createElement("div");
        card.className = "pcard r-" + (c.rarity || "especial");
        card.style.setProperty("--accent", accentOf(c));
        card.style.setProperty("--i", i);
        card.style.zIndex = 20 - i;
        card.innerHTML = `
          <div class="pcard-rays"></div>
          <div class="pcard-tilt">
            <div class="pcard-inner">
              <div class="pcard-face pcard-back">
                <img class="pb-logo" src="${BASE}logo-msi.png" alt="" draggable="false">
                <span class="pb-sub">Legión Lunari</span>
              </div>
              <div class="pcard-face pcard-front">
                <div class="pcard-art"><img src="${c.img}" alt="Ficha ${c.n}" draggable="false"></div>
                <div class="pcard-glare"></div>
              </div>
            </div>
          </div>`;
        cardsEl.appendChild(card);

        const img = card.querySelector(".pcard-art img");
        function fitCard() {
          const rw = img.naturalWidth;
          const rh = img.naturalHeight;
          if (!rw || !rh) return;
          const maxW = Math.min(340, window.innerWidth * 0.66);
          const maxH = Math.min(380, window.innerHeight * 0.52);
          const s = Math.min(maxW / rw, maxH / rh);
          card.style.width = Math.round(rw * s) + "px";
          card.style.height = Math.round(rh * s) + "px";
        }
        if (img.complete) fitCard();
        else img.addEventListener("load", fitCard);

        return card;
      });

      const dots = cards.map(() => {
        const d = document.createElement("span");
        d.className = "pp-dot";
        progEl.appendChild(d);
        return d;
      });

      let idx = -1;
      let busy = false;
      let opened = false;
      let closed = false;

      function showMeta(c) {
        metaEl.querySelector(".pm-code").textContent =
          "FICHA " + String(c.n).padStart(2, "0");
        metaEl.querySelector(".pm-rarity").textContent = c.rarity || "";
        metaEl.style.setProperty("--accent", accentOf(c));
        metaEl.classList.remove("show");
        void metaEl.offsetWidth; 
        metaEl.classList.add("show");
      }

      function trayX(i) {
        const scale = 0.34;
        const gap = 14;
        const ws = cardEls.map((c) => c.offsetWidth * scale);
        const total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
        let x = -total / 2;
        for (let k = 0; k < i; k++) x += ws[k] + gap;
        return x + ws[i] / 2;
      }

      function tray(i) {
        const card = cardEls[i];
        const y = -Math.min(window.innerHeight * 0.3, 300);
        card.classList.add("done");

        card.style.zIndex = i;
        card.style.transform = `translate(${trayX(i)}px, ${y}px) scale(0.34)`;
        const t = card.querySelector(".pcard-tilt");
        if (t) t.style.transform = "";
      }

      function tiltFromPoint(clientX, clientY) {
        if (closed) return;
        const px = clientX / window.innerWidth;
        const py = clientY / window.innerHeight;
        const rx = (0.5 - py) * 26;
        const ry = (px - 0.5) * 34;
        if (!opened) {
          booster.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
          return;
        }
        if (!overlay.classList.contains("phase-cards")) return;
        const i = Math.min(Math.max(idx, 0), cardEls.length - 1);
        const card = cardEls[i];
        if (!card || card.classList.contains("done")) return;
        card.querySelector(".pcard-tilt").style.transform =
          `rotateX(${rx}deg) rotateY(${ry}deg)`;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--gx", ((clientX - r.left) / r.width) * 100 + "%");
        card.style.setProperty("--gy", ((clientY - r.top) / r.height) * 100 + "%");
      }
      overlay.addEventListener("pointermove", (e) => tiltFromPoint(e.clientX, e.clientY));
      overlay.addEventListener("touchmove", (e) => {
        const t = e.touches[0];
        if (t) tiltFromPoint(t.clientX, t.clientY);
      }, { passive: true });

      function finish() {
        overlay.classList.remove("phase-cards");
        overlay.classList.add("phase-done");
        overlay.querySelector(".ps-sub").textContent =
          cards.length === 1
            ? "1 ficha nueva se añadió a tu álbum"
            : `${cards.length} fichas nuevas se añadieron a tu álbum`;
        fx.confetti(130);
      }

      function advance() {
        if (busy || closed) return;
        if (idx >= 0) tray(idx);
        idx++;
        if (idx >= cardEls.length) return finish();
        cardsHint.classList.add("gone");
        const card = cardEls[idx];
        const c = cards[idx];
        busy = true;
        card.classList.add("flipped");
        const r = card.getBoundingClientRect();
        setTimeout(() => {
          fx.burst(
            r.left + r.width / 2,
            r.top + r.height / 2,
            [accentOf(c), "#f2ce7e"],
            BURST[c.rarity] || 26
          );
        }, 300);
        showMeta(c);
        dots[idx].classList.add("on");
        setTimeout(() => (busy = false), 650);
      }

      function cleanup() {
        if (closed) return;
        closed = true;
        overlay.classList.add("closing");
        document.body.classList.remove("pack-open");
        document.removeEventListener("keydown", onKey);
        setTimeout(() => {
          fx.stop();
          overlay.remove();
          resolve();
        }, 380);
      }

      function onKey(e) {
        if (e.key === "Escape") cleanup();
      }
      document.addEventListener("keydown", onKey);

      booster.addEventListener("click", () => {
        if (opened) return;
        opened = true;
        booster.style.transform = ""; 
        booster.classList.add("tearing");
        setTimeout(() => {
          booster.classList.add("open");   
          const r = booster.getBoundingClientRect();
          fx.burst(
            r.left + r.width / 2,
            r.top + r.height * 0.15,
            ["#f2ce7e", "#d4a24a", "#c01f2a"],
            55
          );
          setTimeout(() => overlay.classList.add("phase-cards"), 380);
        }, 540);
      });

      overlay.addEventListener("click", (e) => {
        if (!overlay.classList.contains("phase-cards")) return;
        if (e.target.closest(".pack-close")) return;
        advance();
      });

      overlay.querySelector(".pack-close").addEventListener("click", cleanup);
      overlay.querySelector(".ps-btn").addEventListener("click", cleanup);
    });
  }

  window.PackOpening = { open };
})();
