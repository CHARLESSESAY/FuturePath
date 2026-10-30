/* FuturePath — Gara Tie-Dye Simulation (deep edition)
   10 techniques · 6 dyes · layered resist-dyeing · color blending · pricing
   Levels: 0 Foundation → 4 Professional Mastery */

export function createGaraSimulation({ container, onComplete, level = 0 }) {
  const LVL = Number(level) || 0;

  const CFG = {
    0: { name: "Foundation",           minDips: 1, maxDips: 2, minTech: 1, minDyes: 1, passingScore: 60, needsPricing: false },
    1: { name: "Intermediate",         minDips: 2, maxDips: 2, minTech: 1, minDyes: 2, passingScore: 65, needsPricing: false },
    2: { name: "Applied",              minDips: 2, maxDips: 3, minTech: 2, minDyes: 2, passingScore: 70, needsPricing: false },
    3: { name: "Advanced Application", minDips: 2, maxDips: 3, minTech: 2, minDyes: 3, passingScore: 75, needsPricing: false },
    4: { name: "Professional Mastery", minDips: 3, maxDips: 3, minTech: 3, minDyes: 3, passingScore: 80, needsPricing: true  }
  };
  const cfg = CFG[LVL] || CFG[0];

  /* ---------- DYE LIBRARY ---------- */
  const DYES = {
    indigo:    { id: "indigo",    name: "Indigo",            swatch: "#1e3a6e", minLevel: 0, desc: "Vat dye — deep blue. 1 dip pastel, 3 dips ceremonial." },
    kola:      { id: "kola",      name: "Kola Nut",          swatch: "#5a3418", minLevel: 1, desc: "Boiled kola — warm earthy brown." },
    camwood:   { id: "camwood",   name: "Camwood (Taku)",    swatch: "#8b2e3a", minLevel: 1, desc: "Traditional Sierra Leonean red." },
    turmeric:  { id: "turmeric",  name: "Turmeric",          swatch: "#c9a227", minLevel: 2, desc: "Bright yellow. Fugitive — needs mordant." },
    mud:       { id: "mud",       name: "Mud Clay",          swatch: "#4a4a3a", minLevel: 2, desc: "Clay slip dye — earthy grey. Traditional." },
    synthetic: { id: "synthetic", name: "Synthetic Magenta", swatch: "#c43e9e", minLevel: 3, desc: "Modern reactive. Bright, colourfast." }
  };

  /* ---------- BLEND TABLE (order-independent) ---------- */
  const BLENDS = {
    "indigo+camwood":    "#3d1a4a",
    "indigo+turmeric":   "#1a5a3a",
    "indigo+kola":       "#0e1a20",
    "indigo+mud":        "#18202a",
    "indigo+synthetic":  "#4a1a5e",
    "camwood+turmeric":  "#b8621a",
    "camwood+kola":      "#5a1a1a",
    "camwood+mud":       "#3a1a1a",
    "camwood+synthetic": "#8a285a",
    "turmeric+kola":     "#7a5a1a",
    "turmeric+mud":      "#6a5a3a",
    "turmeric+synthetic":"#a85a4a",
    "kola+mud":          "#2a2a1a",
    "kola+synthetic":    "#4a1a3a",
    "mud+synthetic":     "#4a1a2a"
  };

  function blendHex(currentHex, dyeHex) {
    if (currentHex === "#f5f0e2") return dyeHex;
    const key = [currentHex, dyeHex].join("+");
    const rev = [dyeHex, currentHex].join("+");
    if (BLENDS[key]) return BLENDS[key];
    if (BLENDS[rev]) return BLENDS[rev];
    // fallback: RGB average
    const toRgb = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const [r1,g1,b1] = toRgb(currentHex), [r2,g2,b2] = toRgb(dyeHex);
    const mix = (a,b) => Math.round((a+b)/2).toString(16).padStart(2,"0");
    return "#" + mix(r1,r2) + mix(g1,g2) + mix(b1,b2);
  }

  /* ---------- TECHNIQUE LIBRARY ---------- */
  const TECHNIQUES = [
    { id: "spiral",   name: "Spiral Tie",        icon: "◉", minLevel: 0, family: "tied",
      desc: "Pinch and twist — radiating sunburst.",
      pattern: () => [
        { shape: "circle", cx: 200, cy: 200, r: 40,  w: 8 },
        { shape: "circle", cx: 200, cy: 200, r: 70,  w: 8 },
        { shape: "circle", cx: 200, cy: 200, r: 100, w: 8 },
        { shape: "circle", cx: 200, cy: 200, r: 130, w: 8 }
      ]},
    { id: "fold",     name: "Fold-and-Tie",      icon: "▤", minLevel: 0, family: "tied",
      desc: "Accordion folds — repeating bands.",
      pattern: () => [70,120,170,220,270,320].map(y => ({ shape: "rect", x: 40, y: y-7, w: 320, h: 14 })) },
    { id: "stitch",   name: "Stitch-and-Gather", icon: "〰", minLevel: 0, family: "stitched",
      desc: "Running stitch — flowing lines.",
      pattern: () => {
        const pts = [];
        for (let x = 40; x <= 360; x += 8) pts.push({ x, y: 200 + Math.sin((x-40)/40) * 60 });
        return [{ shape: "path", points: pts, w: 8 }];
      }},
    { id: "tritik",   name: "Tritik Stitch",     icon: "⋯", minLevel: 1, family: "stitched",
      desc: "Dense parallel stitches — fine texture.",
      pattern: () => {
        const out = [];
        for (let y = 80; y <= 320; y += 24) out.push({ shape: "rect", x: 60, y: y-3, w: 280, h: 6 });
        return out;
      }},
    { id: "wax",      name: "Wax Resist",        icon: "⌇", minLevel: 1, family: "drawn",
      desc: "Drawn lines with hot wax.",
      pattern: () => {
        const pts = [];
        let y = 120;
        for (let x = 60; x <= 340; x += 35) { pts.push({ x, y }); y = y === 120 ? 280 : 120; }
        return [{ shape: "path", points: pts, w: 10 }];
      }},
    { id: "bullseye", name: "Bullseye Tie",      icon: "⊚", minLevel: 1, family: "tied",
      desc: "Tied circles — filled dot pattern.",
      pattern: () => [[130,160],[270,160],[200,280]].map(([cx,cy]) =>
        ({ shape: "circle", cx, cy, r: 40, w: null, filled: true })) },
    { id: "scrunch",  name: "Scrunch",           icon: "≋", minLevel: 1, family: "tied",
      desc: "Crumple and bind — irregular organic.",
      pattern: () => [[110,130,35],[250,150,28],[180,260,40],[300,280,32],[120,300,25]].map(
        ([cx,cy,r]) => ({ shape: "circle", cx, cy, r, w: null, filled: true })) },
    { id: "cassava",  name: "Cassava Paste",     icon: "◦", minLevel: 2, family: "drawn",
      desc: "Painted paste motifs (adire eleko).",
      pattern: () => {
        const out = [];
        for (let i = 0; i < 20; i++) {
          out.push({ shape: "circle", cx: 80 + (i%5)*60, cy: 100 + Math.floor(i/5)*60, r: 14, w: null, filled: true });
        }
        return out;
      }},
    { id: "marble",   name: "Marble Tie",        icon: "✶", minLevel: 2, family: "tied",
      desc: "Tied stones — star bursts.",
      pattern: () => {
        const out = [];
        for (const [cx,cy] of [[120,140],[280,140],[120,280],[280,280],[200,210]]) {
          for (let a = 0; a < 8; a++) {
            const ang = (a/8) * Math.PI * 2;
            out.push({ shape: "line",
              x1: cx + Math.cos(ang)*15, y1: cy + Math.sin(ang)*15,
              x2: cx + Math.cos(ang)*42, y2: cy + Math.sin(ang)*42, w: 5 });
          }
        }
        return out;
      }},
    { id: "pole",     name: "Pole Wrap (Arashi)", icon: "∥", minLevel: 2, family: "tied",
      desc: "Wrapped round a pole — diagonal stripes.",
      pattern: () => {
        const out = [];
        for (let i = 0; i < 9; i++) {
          const offset = i * 45 - 40;
          out.push({ shape: "line", x1: 40+offset, y1: 40, x2: 40+offset-120, y2: 360, w: 10 });
        }
        return out;
      }}
  ];

  /* ---------- BRIEFS ---------- */
  const BRIEFS = {
    0: [
      { id: "l0-a", occasion: "Naming ceremony",
        brief: "A family welcomes a new child. They ask for concentric circles — continuity of family. Indigo, light to medium.",
        requiredTechniques: ["spiral"], requiredDyes: ["indigo"], minDips: 1, maxDips: 2,
        correct: "The spiral tie produces the radiating rings requested." },
      { id: "l0-b", occasion: "Market day",
        brief: "A trader wants bold repeating bands for resale at market. Clean, even pattern.",
        requiredTechniques: ["fold"], requiredDyes: ["indigo"], minDips: 1, maxDips: 2,
        correct: "Fold-and-tie gives clean repeating bands." },
      { id: "l0-c", occasion: "Church anniversary",
        brief: "A congregation wants flowing lines — a symbol of faith and movement. Indigo.",
        requiredTechniques: ["stitch"], requiredDyes: ["indigo"], minDips: 1, maxDips: 2,
        correct: "Stitch-and-gather gives the flowing lines." },
      { id: "l0-d", occasion: "Wedding gift",
        brief: "A bride wants a radiating sunburst — the traditional symbol of new beginnings. Indigo, deep.",
        requiredTechniques: ["spiral"], requiredDyes: ["indigo"], minDips: 2, maxDips: 2,
        correct: "The sunburst is traditional for weddings. Deep indigo." },
      { id: "l0-e", occasion: "Baby shower",
        brief: "A gentle repeating pattern for a newborn. Indigo, light — 1 dip only.",
        requiredTechniques: ["fold"], requiredDyes: ["indigo"], minDips: 1, maxDips: 1,
        correct: "Simple bands + light indigo — soothing, cheerful." }
    ],
    1: [
      { id: "l1-a", occasion: "Graduation",
        brief: "A graduate wants a cloth with repeating bands and fine texture. Use two techniques. Indigo + kola.",
        requiredTechniques: ["fold","tritik"], requiredDyes: ["indigo","kola"], minDips: 2, maxDips: 2,
        correct: "Fold bands + tritik texture. Two-dye blend gives warmth." },
      { id: "l1-b", occasion: "Grandmother's memorial",
        brief: "A family honours a grandmother — flowing lines and dot clusters. Indigo + camwood.",
        requiredTechniques: ["stitch","cassava"], requiredDyes: ["indigo","camwood"], minDips: 2, maxDips: 2,
        correct: "Stitch lines + cassava dots. Indigo + camwood." },
      { id: "l1-c", occasion: "Community festival",
        brief: "A festival wants movement — irregular organic and stitched wave. Indigo + turmeric.",
        requiredTechniques: ["scrunch","stitch"], requiredDyes: ["indigo","turmeric"], minDips: 2, maxDips: 2,
        correct: "Scrunch + stitch. Indigo + turmeric." },
      { id: "l1-d", occasion: "Chief's advisor cloth",
        brief: "A formal cloth — geometric bands and drawn zigzags. Indigo + kola.",
        requiredTechniques: ["fold","wax"], requiredDyes: ["indigo","kola"], minDips: 2, maxDips: 2,
        correct: "Fold bands + wax zigzags. Indigo + kola." },
      { id: "l1-e", occasion: "Business opening",
        brief: "Radiating sunburst plus dot clusters — prosperity and continuity. Indigo + camwood.",
        requiredTechniques: ["spiral","bullseye"], requiredDyes: ["indigo","camwood"], minDips: 2, maxDips: 2,
        correct: "Sunburst + bullseye dots. Indigo + camwood." }
    ],
    2: [
      { id: "l2-a", occasion: "Hotel table runners",
        brief: "15 identical table runners. Bold bands + fine texture. Indigo + camwood + turmeric.",
        requiredTechniques: ["fold","tritik"], requiredDyes: ["indigo","camwood","turmeric"], minDips: 3, maxDips: 3,
        correct: "Fold + tritik. Three-dye blend." },
      { id: "l2-b", occasion: "Bride's processional",
        brief: "Full wedding vocabulary — radiating sunburst, flowing lines, bullseye dots. Indigo + camwood + kola.",
        requiredTechniques: ["spiral","stitch","bullseye"], requiredDyes: ["indigo","camwood","kola"], minDips: 3, maxDips: 3,
        correct: "Spiral + stitch + bullseye. Three-dye blend." },
      { id: "l2-c", occasion: "Elder's memorial",
        brief: "Dignified but not heavy. Flowing lines + painted paste motifs. Indigo + mud.",
        requiredTechniques: ["stitch","cassava"], requiredDyes: ["indigo","mud"], minDips: 2, maxDips: 2,
        correct: "Stitch + cassava. Indigo + mud — earthy, dignified." },
      { id: "l2-d", occasion: "Corporate gift",
        brief: "Professional and clean — bold bands + drawn zigzags. Indigo + camwood.",
        requiredTechniques: ["fold","wax"], requiredDyes: ["indigo","camwood"], minDips: 2, maxDips: 2,
        correct: "Fold + wax. Indigo + camwood." },
      { id: "l2-e", occasion: "Chief's installation",
        brief: "Ceremonial weight — sunburst + dot clusters + marble stars. Indigo + kola + camwood.",
        requiredTechniques: ["spiral","bullseye","marble"], requiredDyes: ["indigo","kola","camwood"], minDips: 3, maxDips: 3,
        correct: "Full ceremonial vocabulary. Three-dye blend." }
    ],
    3: [
      { id: "l3-a", occasion: "Diaspora wedding",
        brief: "A Sierra Leonean couple in London. Full wedding vocabulary — sunburst, stitch, bullseye. Three dyes: indigo, camwood, turmeric.",
        requiredTechniques: ["spiral","stitch","bullseye"], requiredDyes: ["indigo","camwood","turmeric"], minDips: 3, maxDips: 3,
        correct: "Full vocabulary + three-dye blend." },
      { id: "l3-b", occasion: "NGO training batch",
        brief: "20 community health worker cloths. Fold bands + tritik texture + scrunch. Indigo + kola. Must survive washing.",
        requiredTechniques: ["fold","tritik","scrunch"], requiredDyes: ["indigo","kola"], minDips: 2, maxDips: 2,
        correct: "Durable triple-technique + indigo/kola." },
      { id: "l3-c", occasion: "Fashion label launch",
        brief: "Signature cloth for a show. Sunburst + wax lines + cassava motifs. Indigo + synthetic magenta.",
        requiredTechniques: ["spiral","wax","cassava"], requiredDyes: ["indigo","synthetic"], minDips: 2, maxDips: 2,
        correct: "Dramatic combination. Indigo + synthetic magenta." },
      { id: "l3-d", occasion: "Chief's funeral",
        brief: "Paramount chief — memorial cloth. Flowing lines + pole-wrap stripes. Indigo + mud + kola. Deep ceremonial.",
        requiredTechniques: ["stitch","pole"], requiredDyes: ["indigo","mud","kola"], minDips: 3, maxDips: 3,
        correct: "Stitch + pole wrap. Deep three-dye blend." },
      { id: "l3-e", occasion: "School anniversary",
        brief: "50 years. Repeating bands + fine texture + dot clusters. Indigo + camwood + turmeric.",
        requiredTechniques: ["fold","tritik","bullseye"], requiredDyes: ["indigo","camwood","turmeric"], minDips: 3, maxDips: 3,
        correct: "Bands + texture + dots. Three-dye blend." }
    ],
    4: [
      { id: "l4-a", occasion: "Diplomatic gift",
        brief: "Ministry of Foreign Affairs commission. Sunburst + stitch + bullseye — full ceremonial vocabulary. Indigo + camwood + turmeric.",
        requiredTechniques: ["spiral","stitch","bullseye"], requiredDyes: ["indigo","camwood","turmeric"], minDips: 3, maxDips: 3,
        pricing: { materialsLe: 18000, hours: 6, hourlyLe: 3500, overheadLe: 2000, marginPct: 40 },
        correct: "Full vocabulary + three-dye blend." },
      { id: "l4-b", occasion: "Restaurant commission",
        brief: "12 table runners. Fold bands + tritik + wax zigzags. Indigo + camwood.",
        requiredTechniques: ["fold","tritik","wax"], requiredDyes: ["indigo","camwood"], minDips: 2, maxDips: 2,
        pricing: { materialsLe: 12000, hours: 4, hourlyLe: 2500, overheadLe: 800, marginPct: 35 },
        correct: "Bands + texture + drawn lines." },
      { id: "l4-c", occasion: "Museum acquisition",
        brief: "National museum commission — archival piece. Flowing lines + cassava motifs + marble stars. Indigo + mud + kola.",
        requiredTechniques: ["stitch","cassava","marble"], requiredDyes: ["indigo","mud","kola"], minDips: 3, maxDips: 3,
        pricing: { materialsLe: 25000, hours: 8, hourlyLe: 4000, overheadLe: 3000, marginPct: 45 },
        correct: "Full archival vocabulary." },
      { id: "l4-d", occasion: "Private collector",
        brief: "One-off piece — most complex pattern possible. Sunburst + pole wrap + marble stars. Indigo + synthetic magenta + camwood.",
        requiredTechniques: ["spiral","pole","marble"], requiredDyes: ["indigo","synthetic","camwood"], minDips: 3, maxDips: 3,
        pricing: { materialsLe: 30000, hours: 10, hourlyLe: 5000, overheadLe: 4000, marginPct: 50 },
        correct: "Maximum complexity." },
      { id: "l4-e", occasion: "Community memorial",
        brief: "Modest budget — dignified. Flowing lines + scrunch. Indigo + mud. Light depth.",
        requiredTechniques: ["stitch","scrunch"], requiredDyes: ["indigo","mud"], minDips: 2, maxDips: 2,
        pricing: { materialsLe: 6000, hours: 2, hourlyLe: 1500, overheadLe: 400, marginPct: 15 },
        correct: "Stitch + scrunch. Light indigo + mud." }
    ]
  };

  const levelBriefs = BRIEFS[LVL] || BRIEFS[0];

  /* ---------- STATE ---------- */
  const state = {
    fabricColor: "#f5f0e2",
    ties: [],            // { techniqueId, protectedAtColor, locked }
    dips: [],            // { dyeId, colorBefore, colorAfter }
    currentDyeId: "indigo",
    phase: "brief",
    result: null
  };
  state.target = levelBriefs[Math.floor(Math.random() * levelBriefs.length)];

  /* ---------- RENDER SHELL ---------- */
  container.innerHTML = "";

  const availableDyes = Object.values(DYES).filter(d => d.minLevel <= LVL);
  const availableTechniques = TECHNIQUES.filter(t => t.minLevel <= LVL);

  const shell = document.createElement("div");
  shell.className = "sim-shell";
  shell.innerHTML = `
    <div class="sim-header">
      <div class="sim-header-left">
        <span class="sim-badge">Simulation · ${cfg.name}</span>
        <span class="sim-title" id="simTitle">Gara Tie-Dye — ${escapeHtml(state.target.occasion)}</span>
      </div>
      <div class="sim-header-right">
        <span class="sim-dips">Dips: <strong id="dipCount">0</strong> / ${cfg.maxDips}</span>
      </div>
    </div>

    <div class="sim-brief">
      <div class="brief-label">Client brief</div>
      <p class="brief-text" id="briefText">${escapeHtml(state.target.brief)}</p>
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
              <g id="resistLayer"></g>
              <g id="tieLayer"></g>
            </svg>
          </div>
          <div class="fabric-shadow"></div>
        </div>
        <div class="blend-preview" id="blendPreview"></div>
      </div>

      <div class="sim-controls">
        <div class="control-section">
          <h4 class="control-title">Dye palette</h4>
          <div class="dye-palette" id="dyePalette">
            ${availableDyes.map(d => `
              <button class="dye-card" data-dye="${d.id}" title="${escapeHtml(d.desc)}">
                <span class="dye-swatch" style="background:${d.swatch}"></span>
                <span class="dye-name">${escapeHtml(d.name)}</span>
              </button>
            `).join("")}
          </div>
        </div>

        <div class="control-section">
          <h4 class="control-title">Tie techniques</h4>
          <p class="control-hint">Click to apply. Click again to remove (if unlocked).</p>
          <div class="technique-grid" id="techGrid">
            ${availableTechniques.map(t => `
              <button class="technique-card" data-technique="${t.id}" aria-pressed="false">
                <span class="technique-icon">${t.icon}</span>
                <span class="technique-name">${escapeHtml(t.name)}</span>
                <span class="technique-desc">${escapeHtml(t.desc)}</span>
                <span class="technique-remove" aria-hidden="true">✕</span>
                <span class="technique-lock" aria-hidden="true">🔒</span>
              </button>
            `).join("")}
          </div>
        </div>

        <div class="control-section">
          <button class="btn btn-accent btn-dip" id="dipBtn" disabled>
            <span class="btn-dip-icon">◈</span>
            Dip in dye bath
          </button>
          <p class="dip-hint" id="dipHint">Apply a technique first.</p>
        </div>

        <div class="control-section">
          <h4 class="control-title">Dye history</h4>
          <div class="layer-list" id="layerList">
            <p class="layer-empty">No dips yet.</p>
          </div>
        </div>

        ${cfg.needsPricing ? `
          <div class="control-section pricing-section">
            <h4 class="control-title">Quote the client</h4>
            <div class="pricing-inputs">
              <label class="pricing-field"><span>Materials (Le)</span><input type="number" id="priceMaterials" readonly></label>
              <label class="pricing-field"><span>Labour (Le)</span><input type="number" id="priceLabour" readonly></label>
              <label class="pricing-field"><span>Overhead (Le)</span><input type="number" id="priceOverhead" readonly></label>
              <label class="pricing-field"><span>Margin (%)</span><input type="number" id="priceMargin" readonly></label>
              <label class="pricing-field pricing-final"><span>Your final quote (Le)</span><input type="number" id="priceFinal" min="0" placeholder="Enter price"></label>
            </div>
            <p class="pricing-hint">Price = (Materials + Labour + Overhead) × (1 + Margin ÷ 100)</p>
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

  /* ---------- REFS ---------- */
  const $ = (s) => shell.querySelector(s);
  const fabricBase = $("#fabricBase");
  const resistLayer = $("#resistLayer");
  const tieLayer = $("#tieLayer");
  const dipBtn = $("#dipBtn");
  const dipHint = $("#dipHint");
  const dipCount = $("#dipCount");
  const submitBtn = $("#submitBtn");
  const dyePalette = $("#dyePalette");
  const techGrid = $("#techGrid");
  const layerList = $("#layerList");
  const blendPreview = $("#blendPreview");
  const resultPanel = $("#simResult");
  const priceFinal = $("#priceFinal");

  const priceMaterials = $("#priceMaterials");
  const priceLabour = $("#priceLabour");
  const priceOverhead = $("#priceOverhead");
  const priceMargin = $("#priceMargin");

  if (cfg.needsPricing && state.target.pricing) {
    const p = state.target.pricing;
    priceMaterials.value = p.materialsLe;
    priceLabour.value = p.hours * p.hourlyLe;
    priceOverhead.value = p.overheadLe;
    priceMargin.value = p.marginPct;
  }

  /* ---------- SHAPE RENDERING ---------- */
  function renderShape(shape, color) {
    const ns = "http://www.w3.org/2000/svg";
    let el;
    if (shape.shape === "circle") {
      el = document.createElementNS(ns, "circle");
      el.setAttribute("cx", shape.cx);
      el.setAttribute("cy", shape.cy);
      el.setAttribute("r", shape.r);
      el.setAttribute("fill", shape.filled ? color : "none");
      el.setAttribute("stroke", color);
      el.setAttribute("stroke-width", shape.w || 0);
    } else if (shape.shape === "rect") {
      el = document.createElementNS(ns, "rect");
      el.setAttribute("x", shape.x);
      el.setAttribute("y", shape.y);
      el.setAttribute("width", shape.w);
      el.setAttribute("height", shape.h);
      el.setAttribute("fill", color);
    } else if (shape.shape === "line") {
      el = document.createElementNS(ns, "line");
      el.setAttribute("x1", shape.x1);
      el.setAttribute("y1", shape.y1);
      el.setAttribute("x2", shape.x2);
      el.setAttribute("y2", shape.y2);
      el.setAttribute("stroke", color);
      el.setAttribute("stroke-width", shape.w || 3);
      el.setAttribute("stroke-linecap", "round");
    } else if (shape.shape === "path") {
      el = document.createElementNS(ns, "path");
      el.setAttribute("d", shape.points.map((p, i) => i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`).join(" "));
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", color);
      el.setAttribute("stroke-width", shape.w || 6);
      el.setAttribute("stroke-linecap", "round");
      el.setAttribute("stroke-linejoin", "round");
    }
    return el;
  }

  function renderFabric() {
    fabricBase.setAttribute("fill", state.fabricColor);
    resistLayer.innerHTML = "";
    tieLayer.innerHTML = "";

    for (const tie of state.ties) {
      const t = TECHNIQUES.find(x => x.id === tie.techniqueId);
      if (!t) continue;
      const shapes = t.pattern();
      for (const s of shapes) {
        if (tie.locked) {
          const el = renderShape(s, tie.protectedAtColor);
          resistLayer.appendChild(el);
        } else {
          const el = renderShape(s, "#2ec49a");
          el.setAttribute("stroke-dasharray", "5 5");
          if (s.filled) el.setAttribute("fill", "rgba(46,196,154,0.15)");
          else el.setAttribute("fill", "none");
          tieLayer.appendChild(el);
        }
      }
    }

    renderBlendPreview();
    renderLayerList();
    updateButtons();
  }

  function renderBlendPreview() {
    const dye = DYES[state.currentDyeId];
    const before = state.fabricColor;
    const after = blendHex(before, dye.swatch);
    blendPreview.innerHTML = `
      <div class="blend-strip">
        <div class="blend-block" style="background:${before}" title="Current"></div>
        <div class="blend-arrow">→</div>
        <div class="blend-block" style="background:${dye.swatch}" title="${escapeHtml(dye.name)}"></div>
        <div class="blend-arrow">=</div>
        <div class="blend-block blend-result" style="background:${after}"></div>
      </div>
      <span class="blend-label">${escapeHtml(dye.name)} will produce this shade</span>
    `;
  }

  function renderLayerList() {
    if (!state.dips.length) {
      layerList.innerHTML = '<p class="layer-empty">No dips yet.</p>';
      return;
    }
    layerList.innerHTML = state.dips.map((d, i) => {
      const dye = DYES[d.dyeId];
      return `
        <div class="layer-row">
          <span class="layer-num">${i + 1}</span>
          <span class="layer-swatch" style="background:${d.colorAfter}"></span>
          <span class="layer-name">${escapeHtml(dye.name)}</span>
        </div>
      `;
    }).join("");
  }

  function updateButtons() {
    const hasTies = state.ties.length > 0;
    const atMax = state.dips.length >= cfg.maxDips;
    const dipReady = hasTies && !atMax;
    dipBtn.disabled = !dipReady;

    if (atMax) dipHint.textContent = "Maximum dips reached. Finish when ready.";
    else if (!hasTies) dipHint.textContent = "Apply at least one technique.";
    else dipHint.textContent = `${state.dips.length}/${cfg.maxDips} dips done.`;

    // Submit: needs at least one dip, plus pricing if L4
    const pricingOk = !cfg.needsPricing || (priceFinal && Number(priceFinal.value) > 0);
    submitBtn.disabled = !(state.dips.length > 0 && pricingOk);
  }

  /* ---------- EVENT HANDLERS ---------- */
  dyePalette.querySelectorAll(".dye-card").forEach(card => {
    card.addEventListener("click", () => {
      if (state.phase === "result") return;
      state.currentDyeId = card.dataset.dye;
      dyePalette.querySelectorAll(".dye-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      renderBlendPreview();
    });
  });
  dyePalette.querySelector(".dye-card")?.classList.add("selected");

  techGrid.querySelectorAll(".technique-card").forEach(card => {
    card.addEventListener("click", () => {
      if (state.phase === "result") return;
      const id = card.dataset.technique;
      const existing = state.ties.find(t => t.techniqueId === id);

      if (existing) {
        if (existing.locked) return; // locked after dipping
        state.ties = state.ties.filter(t => t !== existing);
      } else {
        state.ties.push({
          techniqueId: id,
          protectedAtColor: state.fabricColor,
          locked: false
        });
      }
      refreshTechStates();
      renderFabric();
    });
  });

  function refreshTechStates() {
    techGrid.querySelectorAll(".technique-card").forEach(card => {
      const tie = state.ties.find(t => t.techniqueId === card.dataset.technique);
      card.classList.toggle("applied", !!tie);
      card.classList.toggle("locked", !!tie && tie.locked);
      card.setAttribute("aria-pressed", tie ? "true" : "false");
    });
  }

  dipBtn.addEventListener("click", () => {
    if (state.phase === "result") return;
    if (state.dips.length >= cfg.maxDips) return;
    if (!state.ties.length) return;

    const dye = DYES[state.currentDyeId];
    const colorBefore = state.fabricColor;
    const colorAfter = blendHex(colorBefore, dye.swatch);

    // Lock all current ties — they now resist for future dips
    state.ties.forEach(t => { t.locked = true; });
    state.dips.push({ dyeId: dye.id, colorBefore, colorAfter });
    state.fabricColor = colorAfter;

    // Animate
    const frame = shell.querySelector(".fabric-frame");
    frame.style.transition = "transform 0.9s cubic-bezier(0.4,0,0.2,1), opacity 0.9s";
    frame.style.transform = "translateY(60px) scale(0.7) rotateX(20deg)";
    frame.style.opacity = "0.4";

    setTimeout(() => {
      dipCount.textContent = state.dips.length;
      refreshTechStates();
      renderFabric();
      frame.style.transform = "translateY(0) scale(1) rotateX(0deg)";
      frame.style.opacity = "1";
    }, 800);
  });

  if (priceFinal) priceFinal.addEventListener("input", updateButtons);

  submitBtn.addEventListener("click", showResult);

  /* ---------- SCORING ---------- */
  function showResult() {
