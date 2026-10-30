/* FuturePath — Gara Tie-Dye Simulation
   Interactive resist-dyeing: place ties, dip in dye, see the pattern emerge.
   Feels tactile. Teaches real technique. Fully client-side. */

export function createGaraSimulation({ container, onComplete }) {
  // ============================================================
  // SIM STATE
  // ============================================================

  const state = {
    fabric: {
      baseColor: "#f5f0e2",
      currentColor: "#f5f0e2",
      dipCount: 0,
      maxDips: 3
    },
    appliedTies: [],      // [{ technique, id, x, y, size }]
    target: null,         // { technique, minDips }
    phase: "brief",       // brief | tying | dyeing | result
    score: 0,
    feedback: []
  };

  // ============================================================
  // BRIEFS (one scenario randomly chosen)
  // ============================================================

  const BRIEFS = [
    {
      id: "naming-ceremony",
      occasion: "Naming ceremony",
      brief: "A family commissions a cloth to welcome a new child. The client asks for concentric circles — a symbol of family continuity. Deep indigo.",
      targetTechnique: "spiral",
      targetMinDips: 2,
      correctMessage: "You chose Spiral tie. The radiating circles are exactly what the family asked for — and the double dip gives a strong indigo."
    },
    {
      id: "business-launch",
      occasion: "Business launch",
      brief: "A young entrepreneur wants a cloth for the opening of their shop. They ask for bold repeating bands — a symbol of steady prosperity. Rich indigo.",
      targetTechnique: "fold",
      targetMinDips: 2,
      correctMessage: "You chose Fold-and-Tie. The repeating bands read as prosperity and stability — perfect for a business occasion."
    },
    {
      id: "memorial",
      occasion: "Memorial service",
      brief: "A family needs a cloth for a memorial. They ask for flowing lines that follow the shape — a symbol of a life well-lived. Soft indigo.",
      targetTechnique: "stitch",
      targetMinDips: 1,
      correctMessage: "You chose Stitch-and-Gather. The flowing lines honour the elder and the softer indigo respects the mood of the occasion."
    }
  ];

  // Pick one at random
  state.target = BRIEFS[Math.floor(Math.random() * BRIEFS.length)];

  // ============================================================
  // TECHNIQUES
  // ============================================================

  const TECHNIQUES = [
    {
      id: "spiral",
      name: "Spiral Tie",
      icon: "◉",
      description: "Pinch the centre, twist, tie at intervals. Creates a radiating sunburst.",
      applyPattern: (fabric) => {
        // Concentric circles from centre
        const marks = [];
        const cx = 200, cy = 200;
        for (let r = 30; r <= 120; r += 30) {
          marks.push({ x: cx, y: cy, r, style: "ring" });
        }
        return marks;
      }
    },
    {
      id: "fold",
      name: "Fold-and-Tie",
      icon: "▤",
      description: "Fold into a strip, tie across the fold at intervals. Creates repeating bands.",
      applyPattern: (fabric) => {
        const marks = [];
        for (let y = 80; y <= 320; y += 60) {
          marks.push({ x: 200, y, w: 260, h: 20, style: "band" });
        }
        return marks;
      }
    },
    {
      id: "stitch",
      name: "Stitch-and-Gather",
      icon: "〰",
      description: "Sew a line, gather it tightly. Creates flowing lines that follow the stitch.",
      applyPattern: (fabric) => {
        const marks = [];
        const path = [];
        for (let x = 80; x <= 320; x += 20) {
          path.push({ x, y: 200 + Math.sin((x - 80) / 60) * 60 });
        }
        return [{ style: "path", points: path }];
      }
    }
  ];

  // ============================================================
  // RENDER SHELL
  // ============================================================

  container.innerHTML = "";

  const shell = document.createElement("div");
  shell.className = "sim-shell";
  shell.innerHTML = `
    <div class="sim-header">
      <div class="sim-header-left">
        <span class="sim-badge">Simulation</span>
        <span class="sim-title">Gara Tie-Dye — ${escapeHtml(state.target.occasion)}</span>
      </div>
      <div class="sim-header-right">
        <span class="sim-dips">Dips: <strong id="dipCount">0</strong> / 3</span>
      </div>
    </div>

    <div class="sim-brief" id="simBrief">
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
                <radialGradient id="dyeDeepening" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stop-color="rgba(20,40,90,0.9)"/>
                  <stop offset="100%" stop-color="rgba(15,25,70,0.95)"/>
                </radialGradient>
              </defs>
              <rect id="fabricBase" x="20" y="20" width="360" height="360" fill="#f5f0e2" filter="url(#fabricShadow)" rx="2"/>
              <rect x="20" y="20" width="360" height="360" fill="url(#fabricWeave)" rx="2"/>
              <g id="tieLayer"></g>
              <g id="patternLayer"></g>
            </svg>
          </div>
          <div class="fabric-shadow"></div>
        </div>

        <div class="dye-bath-zone" id="dyeBath">
          <div class="dye-bath">
            <div class="dye-bath-liquid"></div>
          </div>
          <span class="dye-bath-label">Indigo Vat</span>
        </div>
      </div>

      <div class="sim-controls">
        <div class="control-section">
          <h4 class="control-title">Choose your tie technique</h4>
          <div class="technique-grid">
            ${TECHNIQUES.map((t) => `
              <button class="technique-card" data-technique="${t.id}">
                <span class="technique-icon">${t.icon}</span>
                <span class="technique-name">${escapeHtml(t.name)}</span>
                <span class="technique-desc">${escapeHtml(t.description)}</span>
              </button>
            `).join("")}
          </div>
        </div>

        <div class="control-section">
          <button class="btn btn-accent btn-dip" id="dipBtn" disabled>
            <span class="btn-dip-icon">◈</span>
            Dip in indigo vat
          </button>
          <p class="dip-hint" id="dipHint">Choose a tie technique first to apply resist.</p>
        </div>

        <div class="control-section">
          <button class="btn btn-primary btn-submit" id="submitBtn" disabled>
            Finish and see result
          </button>
        </div>
      </div>
    </div>

    <div class="sim-result" id="simResult"></div>
  `;

  container.appendChild(shell);

  // ============================================================
  // DOM REFS
  // ============================================================

  const fabricBase = shell.querySelector("#fabricBase");
  const tieLayer = shell.querySelector("#tieLayer");
  const patternLayer = shell.querySelector("#patternLayer");
  const dipBtn = shell.querySelector("#dipBtn");
  const dipHint = shell.querySelector("#dipHint");
  const dipCount = shell.querySelector("#dipCount");
  const submitBtn = shell.querySelector("#submitBtn");
  const resultPanel = shell.querySelector("#simResult");
  const techniqueCards = shell.querySelectorAll(".technique-card");

  // ============================================================
  // INTERACTIONS
  // ============================================================

  techniqueCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (state.phase === "dyeing" || state.phase === "result") return;
      const techniqueId = card.dataset.technique;
      const technique = TECHNIQUES.find((t) => t.id === techniqueId);
      if (!technique) return;
      applyTechnique(technique);
    });
  });

  dipBtn.addEventListener("click", () => {
    if (state.phase === "dyeing" || state.phase === "result") return;
    if (state.fabric.dipCount >= state.fabric.maxDips) return;
    performDip();
  });

  submitBtn.addEventListener("click", () => {
    showResult();
  });

  // ============================================================
  // APPLY TECHNIQUE
  // ============================================================

  function applyTechnique(technique) {
    state.appliedTies.push({ technique: technique.id, appliedAt: Date.now() });

    // Render the tie markers on the fabric
    const marks = technique.applyPattern();

    marks.forEach((m, i) => {
      if (m.style === "ring") {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", m.x);
        circle.setAttribute("cy", m.y);
        circle.setAttribute("r", m.r);
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", "#2ec49a");
        circle.setAttribute("stroke-width", "2");
        circle.setAttribute("stroke-dasharray", "4 4");
        circle.setAttribute("opacity", "0.9");
        circle.style.animation = `tie-appear 0.4s ease ${i * 0.08}s both`;
        tieLayer.appendChild(circle);
      } else if (m.style === "band") {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", m.x - m.w / 2);
        rect.setAttribute("y", m.y - m.h / 2);
        rect.setAttribute("width", m.w);
        rect.setAttribute("height", m.h);
        rect.setAttribute("fill", "none");
        rect.setAttribute("stroke", "#2ec49a");
        rect.setAttribute("stroke-width", "2");
        rect.setAttribute("stroke-dasharray", "4 4");
        rect.setAttribute("opacity", "0.9");
        rect.style.animation = `tie-appear 0.4s ease ${i * 0.08}s both`;
        tieLayer.appendChild(rect);
      } else if (m.style === "path") {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = m.points.map((p, idx) => (idx === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#2ec49a");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-dasharray", "4 4");
        path.setAttribute("opacity", "0.9");
        path.style.animation = `tie-appear 0.6s ease both`;
        tieLayer.appendChild(path);
      }
    });

    // Re-enable dip button
    dipBtn.disabled = false;
    submitBtn.disabled = false;
    dipHint.textContent = "Ties applied. Now dip in the vat.";
    state.phase = "tying";

    // Pulse effect on the applied technique card
    const card = [...techniqueCards].find((c) => c.dataset.technique === technique.id);
    if (card) {
      card.classList.add("applied");
      setTimeout(() => card.classList.remove("applied"), 400);
    }
  }

  // ============================================================
  // PERFORM DIP
  // ============================================================

  function performDip() {
    state.phase = "dyeing";
    dipBtn.disabled = true;

    const fabricFrame = shell.querySelector(".fabric-frame");
    const dyeBath = shell.querySelector("#dyeBath");

    // Animate fabric into vat
    fabricFrame.style.transition = "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.9s";
    fabricFrame.style.transform = "translateY(60px) scale(0.7) rotateX(20deg)";
    fabricFrame.style.opacity = "0.4";

    setTimeout(() => {
      // Increase dip count
      state.fabric.dipCount++;
      dipCount.textContent = state.fabric.dipCount;

      // Compute new fabric color (deeper with each dip)
      const dipColors = ["#d4dae8", "#8fa2c8", "#4a6a9e", "#1e3a6e"];
      const newColor = dipColors[Math.min(state.fabric.dipCount, dipColors.length - 1)];
      fabricBase.setAttribute("fill", newColor);

      // Reveal pattern — every tie marker becomes a resist zone (pale)
      // For simplicity: fade tie markers into pale rings/bands that become part of the fabric
      revealPattern();

      // Animate fabric back out
      setTimeout(() => {
        fabricFrame.style.transform = "translateY(0) scale(1) rotateX(0deg)";
        fabricFrame.style.opacity = "1";

        setTimeout(() => {
          state.phase = "tying";
          dipBtn.disabled = state.fabric.dipCount >= state.fabric.maxDips;
          if (state.fabric.dipCount >= state.fabric.maxDips) {
            dipHint.textContent = "Maximum dips reached. Finish to see your result.";
          } else {
            dipHint.textContent = "Add another technique or dip again for deeper colour.";
          }
        }, 300);
      }, 400);
    }, 900);
  }

  // ============================================================
  // REVEAL PATTERN (resist zones stay pale)
  // ============================================================

  function revealPattern() {
    // Hide the tie markers (they've become pale resist zones)
    tieLayer.innerHTML = "";

    // For each applied technique, render the "resist" pattern as pale zones
    state.appliedTies.forEach((applied) => {
      const technique = TECHNIQUES.find((t) => t.id === applied.technique);
      if (!technique) return;
      const marks = technique.applyPattern();

      marks.forEach((m) => {
        if (m.style === "ring") {
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", m.x);
          circle.setAttribute("cy", m.y);
          circle.setAttribute("r", m.r);
          circle.setAttribute("fill", "none");
          circle.setAttribute("stroke", "#f5f0e2");
          circle.setAttribute("stroke-width", "6");
          circle.setAttribute("opacity", "0.95");
          patternLayer.appendChild(circle);
        } else if (m.style === "band") {
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", m.x - m.w / 2);
          rect.setAttribute("y", m.y - m.h / 2);
          rect.setAttribute("width", m.w);
          rect.setAttribute("height", m.h);
          rect.setAttribute("fill", "#f5f0e2");
          rect.setAttribute("opacity", "0.95");
          patternLayer.appendChild(rect);
        } else if (m.style === "path") {
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const d = m.points.map((p, idx) => (idx === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");
          path.setAttribute("d", d);
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", "#f5f0e2");
          path.setAttribute("stroke-width", "6");
          path.setAttribute("opacity", "0.95");
          patternLayer.appendChild(path);
        }
      });
    });
  }

  // ============================================================
  // SHOW RESULT
  // ============================================================

  function showResult() {
    state.phase = "result";

    // Score
    const appliedTechniques = state.appliedTies.map((t) => t.technique);
    const matchedTechnique = appliedTechniques.includes(state.target.targetTechnique);
    const hasEnoughDips = state.fabric.dipCount >= state.target.targetMinDips;

    let score = 0;
    const feedback = [];

    if (matchedTechnique) {
      score += 60;
      feedback.push({
        type: "positive",
        text: state.target.correctMessage
      });
    } else {
      score += 20;
      feedback.push({
        type: "negative",
        text: `You applied ${appliedTechniques.join(", ")} — but the client asked for a pattern matching the "${state.target.occasion}" brief. Review what symbols fit which occasions.`
      });
    }

    if (hasEnoughDips) {
      score += 30;
      feedback.push({
        type: "positive",
        text: `You dipped ${state.fabric.dipCount} time${state.fabric.dipCount > 1 ? "s" : ""}. Good depth of indigo.`
      });
    } else {
      score += 10;
      feedback.push({
        type: "negative",
        text: `You only dipped ${state.fabric.dipCount} time${state.fabric.dipCount === 1 ? "" : "s"}. The client asked for ${state.target.targetMinDips}+ dips for a deeper colour.`
      });
    }

    // Craft quality bonus
    if (state.appliedTies.length >= 2) {
      score += 10;
      feedback.push({
        type: "positive",
        text: "You layered multiple techniques — a professional touch that builds visual interest."
      });
    }

    score = Math.min(100, score);
    state.score = score;

    // Render result panel
    resultPanel.innerHTML = `
      <div class="result-card ${score >= 70 ? "pass" : "fail"}">
        <div class="result-score">
          <span class="result-pct">${score}%</span>
          <span class="result-label">${score >= 70 ? "Passed" : "Not quite"}</span>
        </div>
        <div class="result-body">
          <h3>${score >= 70 ? "You completed the commission" : "This commission needs rework"}</h3>
          <ul class="result-feedback">
            ${feedback.map((f) => `<li class="feedback-${f.type}">${escapeHtml(f.text)}</li>`).join("")}
          </ul>
          <div class="result-actions">
            <button class="btn btn-ghost" id="retryBtn">Try a new brief</button>
            <button class="btn btn-primary" id="acceptBtn">Accept result</button>
          </div>
        </div>
      </div>
    `;

    resultPanel.classList.add("visible");

    // Wire actions
    shell.querySelector("#retryBtn").addEventListener("click", () => {
      // Reset
      state.appliedTies = [];
      state.fabric.dipCount = 0;
      state.fabric.currentColor = state.fabric.baseColor;
      state.phase = "brief";
      state.target = BRIEFS[Math.floor(Math.random() * BRIEFS.length)];

      fabricBase.setAttribute("fill", state.fabric.baseColor);
      tieLayer.innerHTML = "";
      patternLayer.innerHTML = "";
      dipCount.textContent = "0";
      dipBtn.disabled = true;
      submitBtn.disabled = true;
      dipHint.textContent = "Choose a tie technique first to apply resist.";
      resultPanel.classList.remove("visible");
      resultPanel.innerHTML = "";
      shell.querySelector(".sim-title").textContent = `Gara Tie-Dye — ${state.target.occasion}`;
      shell.querySelector(".brief-text").textContent = state.target.brief;
    });

    shell.querySelector("#acceptBtn").addEventListener("click", () => {
      if (onComplete) onComplete({ score, passed: score >= 70, evidence: state.appliedTies });
    });
  }

  // ============================================================
  // RETURN HANDLE
  // ============================================================

  return {
    dispose() {
      container.innerHTML = "";
    },
    getScore: () => state.score
  };
}

// ============================================================
// UTIL
// ============================================================

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
