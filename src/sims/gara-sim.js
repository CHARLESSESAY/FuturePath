/* FuturePath — Gara Tie-Dye Simulation (5-level edition)
   Difficulty scales from Foundation (1 technique, 1 dip)
   to Professional (full commission + pricing calculation). */

export function createGaraSimulation({ container, onComplete, level = 0 }) {
  const LVL = Number(level) || 0;

  const LEVELS = {
    0: { name: "Foundation",            minTechniques: 1, minDips: 1, maxDips: 3, passingScore: 60, needsMood: false, needsPricing: false },
    1: { name: "Intermediate",          minTechniques: 1, minDips: 2, maxDips: 3, passingScore: 65, needsMood: false, needsPricing: false },
    2: { name: "Applied",               minTechniques: 2, minDips: 2, maxDips: 3, passingScore: 70, needsMood: false, needsPricing: false },
    3: { name: "Advanced Application",  minTechniques: 2, minDips: 1, maxDips: 3, passingScore: 75, needsMood: true,  needsPricing: false },
    4: { name: "Professional Mastery",  minTechniques: 2, minDips: 1, maxDips: 3, passingScore: 80, needsMood: true,  needsPricing: true }
  };

  const cfg = LEVELS[LVL] || LEVELS[0];

  const BRIEFS = {
    0: [
      { id: "l0-a", occasion: "Naming ceremony", brief: "A family welcomes a new child. They ask for concentric circles — continuity of family. Any indigo depth is fine.", targetTechnique: "spiral", targetDips: [1, 3], correct: "Spiral circles are the right symbol for continuity and family." },
      { id: "l0-b", occasion: "Market day", brief: "A trader wants bold repeating bands to sell at market. Steady, clean pattern.", targetTechnique: "fold", targetDips: [1, 3], correct: "Fold-and-tie gives the clean repeating bands the trader asked for." },
      { id: "l0-c", occasion: "Church anniversary", brief: "A congregation wants flowing lines that follow the cloth — a symbol of faith and movement.", targetTechnique: "stitch", targetDips: [1, 3], correct: "Stitch-and-gather produces the flowing lines that honour the occasion." },
      { id: "l0-d", occasion: "Wedding gift", brief: "A bride wants a radiating sunburst — the traditional symbol of a new beginning.", targetTechnique: "spiral", targetDips: [1, 3], correct: "The radiating spiral sunburst is traditionally used for weddings and new beginnings." },
      { id: "l0-e", occasion: "Baby shower", brief: "Someone is expecting a baby. The client asks for a gentle repeating pattern.", targetTechnique: "fold", targetDips: [1, 3], correct: "Simple repeating bands suit a gentle, celebratory occasion." }
    ],
    1: [
      { id: "l1-a", occasion: "Graduation", brief: "A graduate wants a cloth to wear at their ceremony. Repeating bands of medium-depth indigo.", targetTechnique: "fold", targetDips: [2, 2], correct: "Fold-and-tie gives repeating bands. Two dips achieves the required medium depth." },
      { id: "l1-b", occasion: "Small business launch", brief: "A shop owner opens a new tailoring business. They want concentric rings — continuity and growth. Deep indigo.", targetTechnique: "spiral", targetDips: [2, 3], correct: "Spiral rings for growth, deep indigo for gravitas." },
      { id: "l1-c", occasion: "Grandmother's memorial", brief: "A family honours a grandmother. Flowing lines that follow the cloth — her long life. Light indigo, respectful.", targetTechnique: "stitch", targetDips: [1, 1], correct: "Stitch-and-gather for her life story, light indigo respects the occasion." },
      { id: "l1-d", occasion: "Community festival", brief: "A village festival wants a cloth full of movement and celebration. Flowing lines, medium-depth indigo.", targetTechnique: "stitch", targetDips: [2, 2], correct: "Stitch-and-gather reads as celebration. Medium depth suits the public occasion." },
      { id: "l1-e", occasion: "Wedding", brief: "A wedding cloth. Radiating sunburst, deep indigo — marriage prosperity.", targetTechnique: "spiral", targetDips: [2, 3], correct: "The sunburst is traditional for weddings. Deep indigo for prosperity." },
      { id: "l1-f", occasion: "Hospital gift", brief: "A patient recovering at home receives a cloth to brighten the room. Simple bands, light indigo — gentle.", targetTechnique: "fold", targetDips: [1, 1], correct: "Simple fold-and-tie with light indigo — soothing, cheerful, gentle." }
    ],
    2: [
      { id: "l2-a", occasion: "Hotel commission", brief: "A boutique hotel wants 15 table runners. Bold geometric, indigo and natural white, office-appropriate. Layered pattern (2+ techniques) with deep indigo.", targetTechnique: "fold", targetDips: [2, 3], correct: "Bold geometric bands plus layered detail match the hotel brief." },
      { id: "l2-b", occasion: "Bride's processional cloth", brief: "A bride's processional cloth. Radiating sunburst and a secondary layered pattern. Deep indigo for the wedding depth.", targetTechnique: "spiral", targetDips: [2, 3], correct: "Sunburst plus layering honours the wedding." },
      { id: "l2-c", occasion: "Elder's memorial", brief: "A memorial cloth for a respected elder. Flowing lines plus a secondary layered texture. Soft, light indigo — respectful.", targetTechnique: "stitch", targetDips: [1, 1], correct: "Stitch plus layering honours the elder's complexity." },
      { id: "l2-d", occasion: "Corporate gift", brief: "A corporate gift. Bold bands plus secondary layer. Deep indigo — signals stability and professionalism.", targetTechnique: "fold", targetDips: [2, 3], correct: "Clean bands plus layered quality reads as professional." },
      { id: "l2-e", occasion: "Chief's installation", brief: "An installation for a new chief. Radiating sunburst with secondary texture. Deep indigo — ceremonial weight.", targetTechnique: "spiral", targetDips: [2, 3], correct: "The sunburst is the ceremonial spiral for a chief's installation." },
      { id: "l2-f", occasion: "Artist's commission", brief: "A local artist commissions a cloth for a gallery. Flowing lines with layered quality. Medium indigo — bold but not heavy.", targetTechnique: "stitch", targetDips: [2, 2], correct: "Stitch lines plus layered depth match the artist's brief." },
      { id: "l2-g", occasion: "Christmas gift", brief: "A gift for a family Christmas. Radiating sunburst with secondary detail. Medium indigo — festive but not formal.", targetTechnique: "spiral", targetDips: [2, 2], correct: "The sunburst suits celebration." }
    ],
    3: [
      { id: "l3-a", occasion: "Diaspora wedding", brief: "A Sierra Leonean couple in London commissions a cloth for their traditional wedding. Full wedding vocabulary: radiating sunburst plus a second pattern. Medium indigo — wearable. Client: Aminata & Ibrahim.", targetTechnique: "spiral", targetDips: [2, 2], targetMood: "medium", correct: "Sunburst plus layering gives the traditional wedding vocabulary." },
      { id: "l3-b", occasion: "NGO commission", brief: "An NGO commissions 20 cloths for community health workers. Bold bands for visibility, layered texture for quality. Light indigo — must survive repeated washing. Client: Community Health Coalition.", targetTechnique: "fold", targetDips: [1, 1], targetMood: "light", correct: "Bold bands for visibility. Light indigo survives repeated washing." },
      { id: "l3-c", occasion: "Chief's funeral", brief: "A paramount chief has passed. The family commissions a memorial cloth. Flowing lines for the life story. Layered quality. Deep indigo — ceremonial mourning. Client: Chief's family, Bo District.", targetTechnique: "stitch", targetDips: [3, 3], targetMood: "deep", correct: "Stitch-and-gather honours the life. Deep indigo is the traditional mourning depth." },
      { id: "l3-d", occasion: "Fashion label launch", brief: "A new fashion label launches. Signature cloth for the show. Radiating sunburst plus a second pattern. Medium indigo — photo-friendly. Client: Ayo Designs.", targetTechnique: "spiral", targetDips: [2, 2], targetMood: "medium", correct: "Sunburst gives visual impact for the runway. Medium indigo photographs well." },
      { id: "l3-e", occasion: "School anniversary", brief: "A secondary school celebrates 50 years. Bold repeating bands — unity and continuity. Layered texture — many generations. Medium indigo. Client: Bo School PTA.", targetTechnique: "fold", targetDips: [2, 2], targetMood: "medium", correct: "Bands represent continuity. Layering represents the generations." },
      { id: "l3-f", occasion: "Memorial for a young elder", brief: "A community leader passed young, unexpectedly. The family asks for a cloth that is dignified but not heavy. Flowing lines, layered quality. Light indigo. Client: Family of the late Mr. Bangura.", targetTechnique: "stitch", targetDips: [1, 1], targetMood: "light", correct: "Light indigo respects the mood without overpowering." },
      { id: "l3-g", occasion: "Luxury export order", brief: "A Paris boutique orders 30 cloths. Radiating sunburst — most recognisable Gara pattern. Layered complexity. Deep indigo — premium depth. Client: Maison Lumiere, Paris.", targetTechnique: "spiral", targetDips: [3, 3], targetMood: "deep", correct: "The sunburst is the export signature pattern. Deep indigo signals premium craft." }
    ],
    4: [
      { id: "l4-a", occasion: "Diplomatic gift", brief: "The Ministry of Foreign Affairs commissions a cloth for a visiting dignitary. Most ceremonial pattern. Layered complexity. Deep indigo. Ministry will pay for quality.", targetTechnique: "spiral", targetDips: [3, 3], targetMood: "deep", pricing: { materialsLe: 18000, hours: 6, hourlyLe: 3500, overheadLe: 2000, marginPct: 40 }, correct: "Sunburst plus layering plus deep indigo is the ceremonial standard." },
      { id: "l4-b", occasion: "Restaurant commission", brief: "A fine-dining restaurant orders 12 table runners. Bold bands. Layered detail. Medium indigo — must photograph well in warm light.", targetTechnique: "fold", targetDips: [2, 2], targetMood: "medium", pricing: { materialsLe: 12000, hours: 4, hourlyLe: 2500, overheadLe: 800, marginPct: 35 }, correct: "Clean bands suit a dining room. Medium indigo photographs beautifully." },
      { id: "l4-c", occasion: "Museum acquisition", brief: "A national museum commissions a cloth for permanent collection. Traditional flowing lines. Layered quality. Deep indigo for archival significance.", targetTechnique: "stitch", targetDips: [3, 3], targetMood: "deep", pricing: { materialsLe: 25000, hours: 8, hourlyLe: 4000, overheadLe: 3000, marginPct: 45 }, correct: "Museum pieces demand deep indigo and layered traditional craft." },
      { id: "l4-d", occasion: "NGO training batch", brief: "An NGO needs 15 identical training cloths. Bold bands for visibility. Layered quality. Medium indigo — must survive repeated use.", targetTechnique: "fold", targetDips: [2, 2], targetMood: "medium", pricing: { materialsLe: 8000, hours: 3, hourlyLe: 2000, overheadLe: 600, marginPct: 25 }, correct: "Bands for group visibility. Modest margin suits NGO budgets." },
      { id: "l4-e", occasion: "Private collector", brief: "A private collector wants a one-off piece. Most visually complex pattern. Layered technique essential. Deep indigo for archival quality. Price is not the constraint.", targetTechnique: "spiral", targetDips: [3, 3], targetMood: "deep", pricing: { materialsLe: 30000, hours: 10, hourlyLe: 5000, overheadLe: 4000, marginPct: 50 }, correct: "Sunburst plus layering plus deep indigo — a collector's piece." },
      { id: "l4-f", occasion: "Community memorial", brief: "A village commemorates a beloved teacher. Modest budget — but the cloth must be dignified. Flowing lines. Layered quality. Light indigo.", targetTechnique: "stitch", targetDips: [1, 1], targetMood: "light", pricing: { materialsLe: 6000, hours: 2, hourlyLe: 1500, overheadLe: 400, marginPct: 15 }, correct: "Light indigo, stitch lines. Modest margin — community pricing." }
    ]
  };

  const levelBriefs = BRIEFS[LVL] || BRIEFS[0];

  const state = {
    fabric: { baseColor: "#f5f0e2", dipCount: 0 },
    appliedTies: [],
    target: null,
    mood: null,
    phase: "brief",
    result: null
  };

  state.target = levelBriefs[Math.floor(Math.random() * levelBriefs.length)];

  const TECHNIQUES = [
    { id: "spiral", name: "Spiral Tie", icon: "◉", description: "Pinch and twist from the centre. Radiating sunburst.", applyPattern: () => {
      const marks = [];
      for (let r = 30; r <= 120; r += 30) marks.push({ x: 200, y: 200, r, style: "ring" });
      return marks;
    }},
    { id: "fold", name: "Fold-and-Tie", icon: "▤", description: "Fold into a strip, tie across. Repeating bands.", applyPattern: () => {
      const marks = [];
      for (let y = 80; y <= 320; y += 60) marks.push({ x: 200, y, w: 260, h: 20, style: "band" });
      return marks;
    }},
    { id: "stitch", name: "Stitch-and-Gather", icon: "〰", description: "Sew a line, gather tight. Flowing lines.", applyPattern: () => {
      const path = [];
      for (let x = 80; x <= 320; x += 20) path.push({ x, y: 200 + Math.sin((x - 80) / 60) * 60 });
      return [{ style: "path", points: path }];
    }}
  ];

  container.innerHTML = "";

  const shell = document.createElement("div");
  shell.className = "sim-shell";
  shell.innerHTML = `
    <div class="sim-header">
      <div class="sim-header-left">
        <span class="sim-badge">Simulation · ${cfg.name}</span>
        <span class="sim-title">Gara Tie-Dye — ${escapeHtml(state.target.occasion)}</span>
      </div>
      <div class="sim-header-right">
        <span class="sim-dips">Dips: <strong id="dipCount">0</strong> / ${cfg.maxDips}</span>
      </div>
    </div>
    <div class="sim-brief">
      <div class="brief-label">Client brief</div>
      <p class="brief-text">${escapeHtml(state.target.brief)}</p>
    </div>
    <div class="sim-workspace">
      <div class="sim-fabric-zone">
        <div class="fabric-stage">
          <div class="fabric-frame">
            <svg id="simFabric" class="sim-fabric" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="fabricShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.5"/>
                </filter>
                <pattern id="fabricWeave" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="transparent"/>
                  <path d="M0,4 L8,4 M4,0 L4,8" stroke="rgba(0,0,0,0.03)" stroke-width="0.5"/>
                </pattern>
              </defs>
              <rect id="fabricBase" x="20" y="20" width="360" height="360" fill="#f5f0e2" filter="url(#fabricShadow)" rx="2"/>
              <rect x="20" y="20" width="360" height="360" fill="url(#fabricWeave)" rx="2"/>
              <g id="tieLayer"></g>
              <g id="patternLayer"></g>
            </svg>
          </div>
          <div class="fabric-shadow"></div>
        </div>
        <div class="dye-bath-zone">
          <div class="dye-bath">
            <div class="dye-bath-liquid"></div>
          </div>
          <span class="dye-bath-label">Indigo Vat</span>
        </div>
      </div>
      <div class="sim-controls">
        ${cfg.needsMood ? `
          <div class="control-section">
            <h4 class="control-title">Colour mood</h4>
            <div class="mood-grid">
              <button class="mood-card" data-mood="light">
                <span class="mood-swatch" style="background:#d4dae8"></span>
                <span class="mood-name">Light</span>
                <span class="mood-dips">1 dip</span>
              </button>
              <button class="mood-card" data-mood="medium">
                <span class="mood-swatch" style="background:#8fa2c8"></span>
                <span class="mood-name">Medium</span>
                <span class="mood-dips">2 dips</span>
              </button>
              <button class="mood-card" data-mood="deep">
                <span class="mood-swatch" style="background:#4a6a9e"></span>
                <span class="mood-name">Deep</span>
                <span class="mood-dips">3 dips</span>
              </button>
            </div>
          </div>
        ` : ""}
        <div class="control-section">
          <h4 class="control-title">Tie techniques</h4>
          <p class="control-hint">Click to apply. Click again to remove.</p>
          <div class="technique-grid">
            ${TECHNIQUES.map((t) => `
              <button class="technique-card" data-technique="${t.id}" aria-pressed="false">
                <span class="technique-icon">${t.icon}</span>
                <span class="technique-name">${escapeHtml(t.name)}</span>
                <span class="technique-desc">${escapeHtml(t.description)}</span>
                <span class="technique-remove" aria-hidden="true">✕</span>
              </button>
            `).join("")}
          </div>
          <button class="btn btn-ghost btn-clear-ties" id="clearTiesBtn" disabled>Clear all ties</button>
        </div>
        <div class="control-section">
          <button class="btn btn-accent btn-dip" id="dipBtn" disabled>
            <span class="btn-dip-icon">◈</span>
            Dip in indigo vat
          </button>
          <p class="dip-hint" id="dipHint">Apply a technique first.</p>
        </div>
        ${cfg.needsPricing ? `
          <div class="control-section pricing-section" id="pricingPanel">
            <h4 class="control-title">Quote the client</h4>
            <div class="pricing-inputs">
              <label class="pricing-field">
                <span>Materials (Le)</span>
                <input type="number" id="priceMaterials" placeholder="0" readonly>
              </label>
              <label class="pricing-field">
                <span>Labour (Le)</span>
                <input type="number" id="priceLabour" placeholder="0" readonly>
              </label>
              <label class="pricing-field">
                <span>Overhead (Le)</span>
                <input type="number" id="priceOverhead" placeholder="0" readonly>
              </label>
              <label class="pricing-field">
                <span>Target margin (%)</span>
                <input type="number" id="priceMargin" placeholder="0" readonly>
              </label>
              <label class="pricing-field pricing-final">
                <span>Your final quote (Le)</span>
                <input type="number" id="priceFinal" placeholder="Enter your price" min="0">
              </label>
            </div>
            <p class="pricing-hint">Formula: (Materials + Labour + Overhead) × (1 + Margin ÷ 100)</p>
          </div>
        ` : ""}
        <div class="control-section">
          <button class="btn btn-primary btn-submit" id="submitBtn" disabled>Finish and see result</button>
        </div>
      </div>
    </div>
    <div class="sim-result" id="simResult"></div>
  `;

  container.appendChild(shell);

  const fabricBase = shell.querySelector("#fabricBase");
  const tieLayer = shell.querySelector("#tieLayer");
  const patternLayer = shell.querySelector("#patternLayer");
  const dipBtn = shell.querySelector("#dipBtn");
  const dipHint = shell.querySelector("#dipHint");
  const dipCount = shell.querySelector("#dipCount");
  const submitBtn = shell.querySelector("#submitBtn");
  const clearTiesBtn = shell.querySelector("#clearTiesBtn");
  const resultPanel = shell.querySelector("#simResult");
  const techniqueCards = shell.querySelectorAll(".technique-card");
  const moodCards = shell.querySelectorAll(".mood-card");

  const priceMaterials = shell.querySelector("#priceMaterials");
  const priceLabour = shell.querySelector("#priceLabour");
  const priceOverhead = shell.querySelector("#priceOverhead");
  const priceMargin = shell.querySelector("#priceMargin");
  const priceFinal = shell.querySelector("#priceFinal");

  if (cfg.needsPricing && state.target.pricing) {
    const p = state.target.pricing;
    priceMaterials.value = p.materialsLe;
    priceLabour.value = p.hours * p.hourlyLe;
    priceOverhead.value = p.overheadLe;
    priceMargin.value = p.marginPct;
  }

  if (priceFinal) priceFinal.addEventListener("input", updateButtonStates);

  techniqueCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (state.phase === "dyeing" || state.phase === "result") return;
      const id = card.dataset.technique;
      const t = TECHNIQUES.find((x) => x.id === id);
      if (!t) return;
      if (state.appliedTies.some((x) => x.technique === t.id)) removeTechnique(t.id);
      else applyTechnique(t);
    });
  });

  moodCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (state.phase === "dyeing" || state.phase === "result") return;
      state.mood = card.dataset.mood;
      moodCards.forEach((c) => c.classList.toggle("selected", c.dataset.mood === state.mood));
      updateButtonStates();
    });
  });

  dipBtn.addEventListener("click", () => {
    if (state.phase === "dyeing" || state.phase === "result") return;
    if (state.fabric.dipCount >= cfg.maxDips) return;
    performDip();
  });

  submitBtn.addEventListener("click", showResult);

  clearTiesBtn.addEventListener("click", () => {
    if (state.phase === "dyeing" || state.phase === "result") return;
    state.appliedTies = [];
    tieLayer.innerHTML = "";
    patternLayer.innerHTML = "";
    updateAppliedStates();
    updateButtonStates();
  });

  function applyTechnique(technique) {
    state.appliedTies.push({ technique: technique.id, appliedAt: Date.now() });
    renderTieMarkers(technique);
    updateAppliedStates();
    updateButtonStates();
    state.phase = "tying";
  }

  function removeTechnique(techniqueId) {
    state.appliedTies = state.appliedTies.filter((t) => t.technique !== techniqueId);
    tieLayer.querySelectorAll(`[data-technique="${techniqueId}"]`).forEach((el) => el.remove());
    patternLayer.querySelectorAll(`[data-technique="${techniqueId}"]`).forEach((el) => el.remove());
    updateAppliedStates();
    updateButtonStates();
  }

  function renderTieMarkers(technique) {
    technique.applyPattern().forEach((m, i) => {
      if (m.style === "ring") {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", m.x); c.setAttribute("cy", m.y); c.setAttribute("r", m.r);
        c.setAttribute("fill", "none"); c.setAttribute("stroke", "#2ec49a");
        c.setAttribute("stroke-width", "2"); c.setAttribute("stroke-dasharray", "4 4");
        c.setAttribute("data-technique", technique.id);
        c.style.animation = `tie-appear 0.4s ease ${i * 0.08}s both`;
        tieLayer.appendChild(c);
      } else if (m.style === "band") {
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", m.x - m.w / 2); r.setAttribute("y", m.y - m.h / 2);
        r.setAttribute("width", m.w); r.setAttribute("height", m.h);
        r.setAttribute("fill", "none"); r.setAttribute("stroke", "#2ec49a");
        r.setAttribute("stroke-width", "2"); r.setAttribute("stroke-dasharray", "4 4");
        r.setAttribute("data-technique", technique.id);
        r.style.animation = `tie-appear 0.4s ease ${i * 0.08}s both`;
        tieLayer.appendChild(r);
      } else if (m.style === "path") {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", m.points.map((pt, idx) => idx === 0 ? `M${pt.x},${pt.y}` : `L${pt.x},${pt.y}`).join(" "));
        p.setAttribute("fill", "none"); p.setAttribute("stroke", "#2ec49a");
        p.setAttribute("stroke-width", "2"); p.setAttribute("stroke-dasharray", "4 4");
        p.setAttribute("data-technique", technique.id);
        p.style.animation = "tie-appear 0.6s ease both";
        tieLayer.appendChild(p);
      }
    });
  }

  function updateAppliedStates() {
    techniqueCards.forEach((c) => {
      const applied = state.appliedTies.some((t) => t.technique === c.dataset.technique);
      c.classList.toggle("applied", applied);
      c.setAttribute("aria-pressed", applied ? "true" : "false");
    });
  }

  function updateButtonStates() {
    const hasTies = state.appliedTies.length > 0;
    const enoughTechniques = state.appliedTies.length >= cfg.minTechniques;
    const maxDipsReached = state.fabric.dipCount >= cfg.maxDips;
    const moodOk = !cfg.needsMood || !!state.mood;
    const priceOk = !cfg.needsPricing || (priceFinal && priceFinal.value && Number(priceFinal.value) > 0);
    const anythingDone = hasTies || state.fabric.dipCount > 0;

    dipBtn.disabled = !hasTies || maxDipsReached;
    submitBtn.disabled = !(anythingDone && enoughTechniques && moodOk && priceOk);
    clearTiesBtn.disabled = !hasTies;

    if (!hasTies) dipHint.textContent = "Apply at least one technique.";
    else if (maxDipsReached) dipHint.textContent = "Maximum dips reached.";
    else dipHint.textContent = `${state.fabric.dipCount}/${cfg.maxDips} dips. Apply more or finish.`;
  }

  function performDip() {
    state.phase = "dyeing";
    dipBtn.disabled = true;

    const frame = shell.querySelector(".fabric-frame");
    frame.style.transition = "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.9s";
    frame.style.transform = "translateY(60px) scale(0.7) rotateX(20deg)";
    frame.style.opacity = "0.4";

    setTimeout(() => {
      state.fabric.dipCount++;
      dipCount.textContent = state.fabric.dipCount;
      const colors = ["#d4dae8", "#8fa2c8", "#4a6a9e", "#1e3a6e"];
      fabricBase.setAttribute("fill", colors[Math.min(state.fabric.dipCount, colors.length - 1)]);
      revealPattern();

      setTimeout(() => {
        frame.style.transform = "translateY(0) scale(1) rotateX(0deg)";
        frame.style.opacity = "1";
        setTimeout(() => {
          state.phase = "tying";
          updateButtonStates();
        }, 300);
      }, 400);
    }, 900);
  }

  function revealPattern() {
    tieLayer.innerHTML = "";
    patternLayer.innerHTML = "";
    state.appliedTies.forEach((applied) => {
      const t = TECHNIQUES.find((x) => x.id === applied.technique);
      if (!t) return;
      t.applyPattern().forEach((m) => {
        if (m.style === "ring") {
          const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          c.setAttribute("cx", m.x); c.setAttribute("cy", m.y); c.setAttribute("r", m.r);
          c.setAttribute("fill", "none"); c.setAttribute("stroke", "#f5f0e2");
          c.setAttribute("stroke-width", "6"); c.setAttribute("opacity", "0.95");
          c.setAttribute("data-technique", applied.technique);
          patternLayer.appendChild(c);
        } else if (m.style === "band") {
          const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          r.setAttribute("x", m.x - m.w / 2); r.setAttribute("y", m.y - m.h / 2);
          r.setAttribute("width", m.w); r.setAttribute("height", m.h);
          r.setAttribute("fill", "#f5f0e2"); r.setAttribute("opacity", "0.95");
          r.setAttribute("data-technique", applied.technique);
          patternLayer.appendChild(r);
        } else if (m.style === "path") {
          const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p.setAttribute("d", m.points.map((pt, idx) => idx === 0 ? `M${pt.x},${pt.y}` : `L${pt.x},${pt.y}`).join(" "));
          p.setAttribute("fill", "none"); p.setAttribute("stroke", "#f5f0e2");
          p.setAttribute("stroke-width", "6"); p.setAttribute("opacity", "0.95");
          p.setAttribute("data-technique", applied.technique);
          patternLayer.appendChild(p);
        }
      });
    });
  }

  function showResult() {
    state.phase = "result";

    const appliedIds = state.appliedTies.map((t) => t.technique);
    const hasTargetTechnique = appliedIds.includes(state.target.targetTechnique);
    const dipInRange = state.fabric.dipCount >= state.target.targetDips[0] && state.fabric.dipCount <= state.target.targetDips[1];
    const techniqueCountOk = state.appliedTies.length >= cfg.minTechniques;
    const hasLayering = state.appliedTies.length >= 2;
    const moodOk = !cfg.needsMood || state.mood === state.target.targetMood;

    let pricingOk = true;
    let pricingDetail = null;
    if (cfg.needsPricing && state.target.pricing && priceFinal) {
      const p = state.target.pricing;
      const labour = p.hours * p.hourlyLe;
      const base = p.materialsLe + labour + p.overheadLe;
      const correct = Math.round(base * (1 + p.marginPct / 100));
      const submitted = Number(priceFinal.value) || 0;
      const tolerance = correct * 0.05;
      pricingOk = Math.abs(submitted - correct) <= tolerance;
      pricingDetail = { correct, submitted, tolerance };
    }

    const criteria = [];

    if (LVL <= 1) {
      criteria.push({ id: "technique", label: "Correct technique for the occasion", pass: hasTargetTechnique, weight: 60, feedback: hasTargetTechnique ? state.target.correct : `The client asked for a pattern suited to "${state.target.occasion}".` });
      criteria.push({ id: "dips", label: `Dipped ${state.target.targetDips[0]}–${state.target.targetDips[1]} times`, pass: dipInRange, weight: 40, feedback: dipInRange ? `Dipped ${state.fabric.dipCount} time${state.fabric.dipCount !== 1 ? "s" : ""} — within the brief.` : `You dipped ${state.fabric.dipCount} time${state.fabric.dipCount !== 1 ? "s" : ""}. The brief asked for ${state.target.targetDips[0]}${state.target.targetDips[0] !== state.target.targetDips[1] ? "–" + state.target.targetDips[1] : ""}.` });
    } else if (LVL === 2) {
      criteria.push({ id: "technique", label: "Correct primary technique", pass: hasTargetTechnique, weight: 40, feedback: hasTargetTechnique ? state.target.correct : `Wrong technique for the "${state.target.occasion}" brief.` });
      criteria.push({ id: "dips", label: `Dipped ${state.target.targetDips[0]}–${state.target.targetDips[1]} times`, pass: dipInRange, weight: 25, feedback: dipInRange ? "Dip depth matches the brief." : `Dip depth off — needed ${state.target.targetDips[0]}–${state.target.targetDips[1]}, you did ${state.fabric.dipCount}.` });
      criteria.push({ id: "layering", label: "Layered with 2+ techniques", pass: hasLayering, weight: 20, feedback: hasLayering ? "Layering adds the professional depth." : "The brief asked for a layered pattern (2+ techniques)." });
      criteria.push({ id: "count", label: "Minimum technique count", pass: techniqueCountOk, weight: 15, feedback: techniqueCountOk ? "Minimum technique count satisfied." : `Brief required ${cfg.minTechniques}+ techniques.` });
    } else if (LVL === 3) {
      criteria.push({ id: "technique", label: "Correct primary technique", pass: hasTargetTechnique, weight: 30, feedback: hasTargetTechnique ? state.target.correct : "Wrong primary technique." });
      criteria.push({ id: "dips", label: "Dip depth within brief", pass: dipInRange, weight: 20, feedback: dipInRange ? "Dip depth correct." : `Dip depth off — target was ${state.target.targetDips[0]}–${state.target.targetDips[1]}.` });
      criteria.push({ id: "mood", label: "Colour mood matches the client request", pass: moodOk, weight: 20, feedback: moodOk ? `Colour mood "${state.mood}" was the correct choice.` : `Client asked for "${state.target.targetMood}" indigo — you selected "${state.mood || "none"}".` });
      criteria.push({ id: "layering", label: "Layered complexity", pass: hasLayering, weight: 15, feedback: hasLayering ? "Layering evidenced." : "No secondary technique — brief called for layered quality." });
      criteria.push({ id: "count", label: "Minimum technique count", pass: techniqueCountOk, weight: 15, feedback: techniqueCountOk ? "Enough techniques applied." : "Not enough techniques for this level." });
    } else {
      criteria.push({ id: "technique", label: "Correct primary technique", pass: hasTargetTechnique, weight: 25, feedback: hasTargetTechnique ? state.target.correct : "Wrong primary technique for the occasion." });
      criteria.push({ id: "dips", label: "Dip depth", pass: dipInRange, weight: 15, feedback: dipInRange ? "Depth correct." : `Target was ${state.target.targetDips[0]}–${state.target.targetDips[1]} dips.` });
      criteria.push({ id: "mood", label: "Colour mood", pass: moodOk, weight: 10, feedback: moodOk ? `Mood "${state.mood}" correct.` : `Target mood was "${state.target.targetMood}".` });
      criteria.push({ id: "layering", label: "Layered craft", pass: hasLayering, weight: 10, feedback: hasLayering ? "Layered complexity present." : "Brief required layered quality." });
      criteria.push({ id: "pricing", label: "Pricing calculation accurate", pass: pricingOk, weight: 30, feedback: pricingOk ? `Correct quote. Expected around ${pricingDetail.correct.toLocaleString()} Le.` : `Your quote (${pricingDetail?.submitted?.toLocaleString()} Le) was outside the ±5% range of ${pricingDetail?.correct?.toLocaleString()} Le.` });
      criteria.push({ id: "count", label: "Minimum technique count", pass: techniqueCountOk, weight: 10, feedback: techniqueCountOk ? "Technique minimum met." : "Not enough techniques." });
    }

    const totalWeight = criteria.reduce((a, c) => a + c.weight, 0);
    const earnedWeight = criteria.reduce((a, c) => a + (c.pass ? c.weight : 0), 0);
    const score = Math.round((earnedWeight / totalWeight) * 100);
    const passed = score >= cfg.passingScore;

    state.result = { score, passed, criteria };

    resultPanel.innerHTML = `
      <div class="result-card ${passed ? "pass" : "fail"}">
        <div class="result-score">
          <span class="result-pct">${score}%</span>
          <span class="result-label">${passed ? "Passed" : "Rework"}</span>
          <span class="result-threshold">Required: ${cfg.passingScore}%</span>
        </div>
        <div class="result-body">
          <h3>${passed ? "Commission completed" : "This commission needs rework"}</h3>
          <div class="criteria-breakdown">
            ${criteria.map((c) => `
              <div class="criterion ${c.pass ? "crit-pass" : "crit-fail"}">
                <div class="criterion-head">
                  <span class="criterion-mark">${c.pass ? "✓" : "✕"}</span>
                  <span class="criterion-label">${escapeHtml(c.label)}</span>
                  <span class="criterion-weight">${c.weight} pts</span>
                </div>
                <p class="criterion-feedback">${escapeHtml(c.feedback)}</p>
              </div>
            `).join("")}
          </div>
          <div class="result-actions">
            <button class="btn btn-ghost" id="retryBtn">Try a new brief</button>
            <button class="btn btn-primary" id="acceptBtn">Accept result</button>
          </div>
        </div>
      </div>
    `;

    resultPanel.classList.add("visible");

    shell.querySelector("#retryBtn").addEventListener("click", resetSim);
    shell.querySelector("#acceptBtn").addEventListener("click", () => {
      if (onComplete) onComplete({ score, passed, evidence: state.appliedTies });
    });
  }

  function resetSim() {
    state.appliedTies = [];
    state.fabric.dipCount = 0;
    state.mood = null;
    state.phase = "brief";
    state.result = null;
    state.target = levelBriefs[Math.floor(Math.random() * levelBriefs.length)];

    fabricBase.setAttribute("fill", "#f5f0e2");
    tieLayer.innerHTML = "";
    patternLayer.innerHTML = "";
    dipCount.textContent = "0";
    techniqueCards.forEach((c) => { c.classList.remove("applied"); c.setAttribute("aria-pressed", "false"); });
    moodCards.forEach((c) => c.classList.remove("selected"));
    if (priceFinal) priceFinal.value = "";

    if (cfg.needsPricing && state.target.pricing) {
      const p = state.target.pricing;
      priceMaterials.value = p.materialsLe;
      priceLabour.value = p.hours * p.hourlyLe;
      priceOverhead.value = p.overheadLe;
      priceMargin.value = p.marginPct;
    }

    resultPanel.classList.remove("visible");
    resultPanel.innerHTML = "";

    shell.querySelector(".sim-title").textContent = `Gara Tie-Dye — ${state.target.occasion}`;
    shell.querySelector(".brief-text").textContent = state.target.brief;

    updateButtonStates();
  }

  updateButtonStates();

  return {
    dispose() { container.innerHTML = ""; },
    getScore: () => state.result?.score || 0
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
