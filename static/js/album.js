(function () {
  "use strict";

  const book = document.getElementById("book");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const tabsEl = document.getElementById("tabs");
  const loading = document.getElementById("loading");
  const progressCount = document.getElementById("progressCount");
  const progressFill = document.getElementById("progressFill");

  const PAGES_URL = "/static/album/pages/";
  const SLOTS_URL = "/static/album/slots.json";

  // Rareza por rango de número.
  const RARITY_ACCENT = {
    legendaria: "#f2ce7e",
    epica: "#b06cff",
    rara: "#8fb7c9",
    especial: "#e0563f",
  };
  function rarityForNumber(n) {
    if (n === 1 || (n >= 125 && n <= 129)) return "legendaria"; // emblema, first stand
    if (n >= 2 && n <= 12) return "rara";                        // escudos
    if (n >= 13 && n <= 100) return "especial";                 // equipos
    return "epica";                                              // estrellas, mvp, duplas, especiales
  }

  // Pestañas
  const SECTIONS = [
    { name: "Portada", page: 0 },
    { name: "Escudos", page: 5 },
    { name: "Equipos", page: 7 },
    { name: "Estrellas", page: 29 },
    { name: "MVP", page: 31 },
    { name: "Duplas", page: 33 },
    { name: "First Stand", page: 34 },
    { name: "Especiales", page: 35 },
  ];

  let pageFlip = null;
  let totalPages = 0;
  let owned = {};

  function buildPages(manifest) {
    totalPages = manifest.length;
    manifest.forEach((pg, idx) => {
      const el = document.createElement("div");
      el.className = "page";
      const hard = idx === 0 || idx === manifest.length - 1; // tapas duras
      if (hard) {
        el.classList.add("page-hard");
        el.setAttribute("data-density", "hard");
      }

      const img = document.createElement("img");
      img.className = "page-bg";
      img.src = PAGES_URL + pg.file;
      img.alt = "";
      img.draggable = false;
      el.appendChild(img);

      (pg.slots || []).forEach((s) => {
        const hot = document.createElement("div");
        hot.className = "slot-hot";
        hot.style.left = s.x * 100 + "%";
        hot.style.top = s.y * 100 + "%";
        hot.style.width = s.w * 100 + "%";
        hot.style.height = s.h * 100 + "%";

        if (owned[s.n]) {
          const rar = rarityForNumber(s.n);
          hot.classList.add("filled", "r-" + rar);
          hot.dataset.n = s.n;
          hot.dataset.img = owned[s.n];
          hot.dataset.rarity = rar;
          const st = document.createElement("img");
          st.className = "slot-sticker";
          st.src = owned[s.n];
          st.alt = "Figura " + s.n;
          st.draggable = false;
          hot.appendChild(st);
          // capa recortada para el barrido holográfico
          const shine = document.createElement("span");
          shine.className = "slot-shine";
          hot.appendChild(shine);
        } else {
          hot.classList.add("empty");
          hot.dataset.n = s.n;
        }
        el.appendChild(hot);
      });

      book.appendChild(el);
    });
  }

  function initPageFlip() {
    const St = window.St;
    if (!St || !St.PageFlip) return showError("no se cargó la librería de páginas");

    pageFlip = new St.PageFlip(book, {
      width: 520,
      height: 735, // relación A (~1.414)
      size: "stretch",
      minWidth: 300,
      maxWidth: 700,
      minHeight: 420,
      maxHeight: 990,
      drawShadow: true,
      flippingTime: 800,
      maxShadowOpacity: 0.5,
      showCover: true,
      usePortrait: true,
      autoSize: true,
      mobileScrollSupport: false,
      useMouseEvents: false,  
      clickEventForward: true,
      disableFlipByClick: true,
    });
    pageFlip.loadFromHTML(book.querySelectorAll(".page"));
    pageFlip.on("flip", (e) => updateChrome(e.data));
    pageFlip.on("changeState", (e) => {
      if (e.data === "flipping")
        document.getElementById("bookHint")?.classList.add("gone");
    });
  }

  function buildTabs() {
    tabsEl.innerHTML = "";
    SECTIONS.forEach((s) => {
      const b = document.createElement("button");
      b.className = "tab";
      b.textContent = s.name;
      b.dataset.page = s.page;
      b.addEventListener("click", () => jumpTo(s.page));
      tabsEl.appendChild(b);
    });
  }

  function updateProgress(col) {
    progressCount.textContent = `${col.ownedCount} / ${col.total}`;
    const pct = col.total ? (col.ownedCount / col.total) * 100 : 0;
    requestAnimationFrame(() => { progressFill.style.width = pct + "%"; });
  }

  // navegación

  function updateChrome(pageIndex) {
    if (pageIndex == null) pageIndex = pageFlip ? pageFlip.getCurrentPageIndex() : 0;
    prevBtn.disabled = pageIndex <= 0;
    nextBtn.disabled = pageIndex >= totalPages - 1;
    const right = pageIndex + 1;
    let active = SECTIONS[0];
    SECTIONS.forEach((s) => {
      if (s.page <= right) active = s;
    });
    tabsEl.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", Number(t.dataset.page) === active.page);
    });
  }

  function goNext() { if (pageFlip && !jumping) pageFlip.flipNext(); }
  function goPrev() { if (pageFlip && !jumping) pageFlip.flipPrev(); }

  let jumping = false;

  function jumpTo(page) {
    if (!pageFlip || jumping) return;
    page = page <= 0 ? 0 : (page % 2 === 1 ? page : page - 1);
    const start = pageFlip.getCurrentPageIndex();
    if (start === page) return;

    const dir = page > start ? 1 : -1;
    const flips = Math.max(1, Math.round(Math.abs(page - start) / 2));
    const TURN_TIME = Math.max(110, Math.min(300, 340 - flips * 15));

    const settings = pageFlip.getSettings ? pageFlip.getSettings() : null;
    const normalTime = settings ? settings.flippingTime : 800;
    if (settings) settings.flippingTime = TURN_TIME;
    jumping = true;

    let watchdog = null;
    function finish(c) {
      if (watchdog) clearTimeout(watchdog);
      pageFlip.off("flip", onFlip);
      if (settings) settings.flippingTime = normalTime;
      jumping = false;
      updateChrome(c);
    }
    function armWatchdog() {                    
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => finish(pageFlip.getCurrentPageIndex()), TURN_TIME + 900);
    }
    function onFlip() {
      const c = pageFlip.getCurrentPageIndex();
      if ((dir > 0 ? c >= page : c <= page)) { finish(c); return; }
      armWatchdog();
      setTimeout(() => { if (jumping) (dir > 0 ? pageFlip.flipNext() : pageFlip.flipPrev()); }, 30);
    }
    pageFlip.on("flip", onFlip);
    armWatchdog();
    dir > 0 ? pageFlip.flipNext() : pageFlip.flipPrev();  
  }

  nextBtn.addEventListener("click", goNext);
  prevBtn.addEventListener("click", goPrev);
  document.addEventListener("keydown", (e) => {
    if (document.getElementById("lightbox").classList.contains("open")) return;
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goPrev();
  });

  const lightbox = document.getElementById("lightbox");
  const holoCard = document.getElementById("holoCard");
  const lbImg = document.getElementById("lbImg");
  const lbMeta = document.getElementById("lbMeta");
  const lbClose = document.getElementById("lbClose");
  const shine = holoCard.querySelector(".holo-shine");
  const glare = holoCard.querySelector(".holo-glare");

  function openCard(hot) {
    const rarity = hot.dataset.rarity;
    const accent = RARITY_ACCENT[rarity] || "#d4a24a";
    lbImg.src = hot.dataset.img;
    lbImg.alt = "Figura " + hot.dataset.n;
    holoCard.style.setProperty("--lb-accent", accent);
    lbMeta.innerHTML =
      `<p class="lb-code">FICHA ${String(hot.dataset.n).padStart(2, "0")}</p>` +
      `<p class="lb-rarity">${rarity}</p>`;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  }
  function closeCard() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    holoCard.style.transform = "";
  }

  book.addEventListener("click", (e) => {
    const hot = e.target.closest(".slot-hot.filled");
    if (hot) openCard(hot);
  });
  lbClose.addEventListener("click", closeCard);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeCard(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCard(); });

  function tilt(e) {
    const rect = holoCard.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    holoCard.style.transform =
      `perspective(900px) rotateX(${(0.5 - py) * 16}deg) rotateY(${(px - 0.5) * 16}deg) scale(1.02)`;
    shine.style.backgroundPosition = `${px * 100}% ${py * 100}%`;
    glare.style.setProperty("--gx", px * 100 + "%");
    glare.style.setProperty("--gy", py * 100 + "%");
  }
  holoCard.addEventListener("pointermove", tilt);
  holoCard.addEventListener("pointerleave", () => {
    holoCard.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
  });

  function showError(msg) {
    loading.classList.remove("hide");
    loading.innerHTML = `<span>${msg}</span>`;
  }

  Promise.all([
    fetch("/api/collection").then((r) => r.json()),
    fetch(SLOTS_URL).then((r) => r.json()),
  ])
    .then(([col, manifest]) => {
      if (col.error) throw new Error(col.error);
      owned = col.owned || {};
      buildPages(manifest);
      buildTabs();
      updateProgress(col);
      initPageFlip();
      updateChrome(0);
      loading.classList.add("hide");
    })
    .catch((err) => {
      showError("Error al cargar el álbum: " + err.message);
      console.error(err);
    });
})();
