/* ============================================================
   FuturePath — Learning Engine (Diploma Edition)
   Renders skill trees, level paths, module types, visuals,
   teaching notes, practical evidence, capstone, and simulations.
   ============================================================ */

import { loadCareer, recordModule, getModuleScore, resetCareer } from "./progress-store.js";

export const LEVELS = [
  { name: "Foundation",           desc: "Understand what this skill is and why it matters." },
  { name: "Intermediate",         desc: "Practice with step-by-step support." },
  { name: "Applied",              desc: "Apply it in realistic scenarios." },
  { name: "Advanced Application", desc: "Handle variations and pressure with confidence." },
  { name: "Professional Mastery", desc: "Perform at a level employers or clients pay for." }
];

export const MODULE_TYPES = {
  LESSON: "lesson",
  DRILL: "drill",
  SCENARIO: "scenario",
  PORTFOLIO: "portfolio",
  ASSESS: "assess",
  SANDBOX: "sandbox",
  PRACTICAL: "practical",
  SIMULATION: "simulation"
};

// ============================================================
// STATE
// ============================================================

const ctx = {
  career: null,
  curriculum: null,
  skill: null,
  levelIndex: 0,
  module: null,
  onNavigate: null
};

export function setContext({ career, curriculum, onNavigate }) {
  ctx.career = career;
  ctx.curriculum = curriculum;
  ctx.onNavigate = onNavigate;
}

export function resetContext() {
  ctx.career = null;
  ctx.curriculum = null;
  ctx.skill = null;
  ctx.levelIndex = 0;
  ctx.module = null;
}

// ============================================================
// SKILL TREE VIEW
// ============================================================

export function renderSkillTree(container) {
  container.innerHTML = "";
  const domains = ctx.curriculum.skillDomains || [];

  renderCourseHeader(container);

  const domainWrap = document.createElement("div");
  domains.forEach((domain) => {
    domainWrap.appendChild(buildDomainCard(domain));
  });
  container.appendChild(domainWrap);

  if (ctx.curriculum.capstoneAssessment) {
    container.appendChild(buildCapstoneCard(ctx.curriculum.capstoneAssessment));
  }

  if (ctx.curriculum.implementationNotes?.length) {
    container.appendChild(buildImplNotes(ctx.curriculum.implementationNotes));
  }
}

function renderCourseHeader(container) {
  const c = ctx.curriculum;
  const domains = c.skillDomains || [];

  const totals = computeTotals(domains, ctx.career.id);

  const header = document.createElement("div");
  header.className = "career-hero";

  const badges = [];
  if (c.courseLevel) badges.push(`<span class="tag accent">${c.courseLevel}</span>`);
  if (ctx.career.sector) badges.push(`<span class="tag">${ctx.career.sector}</span>`);
  if (ctx.career.type) badges.push(`<span class="tag ${ctx.career.type}">${ctx.career.type}</span>`);
  badges.push(`<span class="tag">${ctx.career.countries === "ALL" ? "All ECOWAS" : ctx.career.countries.join(", ")}</span>`);

  let frameworkHtml = "";
  if (c.diplomaFramework?.learningOutcomes?.length) {
    frameworkHtml = `
      <div class="course-framework">
        <h4>Learning outcomes</h4>
        <ul>${c.diplomaFramework.learningOutcomes.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
      </div>
    `;
  }

  let deliveryHtml = "";
  if (c.deliveryModel?.recommendedStructure) {
    const s = c.deliveryModel.recommendedStructure;
    deliveryHtml = `
      <div class="course-delivery">
        <div class="delivery-stat"><strong>${s.guidedLearningHours || "—"}</strong><span>Guided hrs</span></div>
        <div class="delivery-stat"><strong>${s.supervisedPracticalHours || "—"}</strong><span>Supervised</span></div>
        <div class="delivery-stat"><strong>${s.independentPracticeHours || "—"}</strong><span>Independent</span></div>
        <div class="delivery-stat"><strong>${s.totalIndicativeHours || "—"}</strong><span>Total</span></div>
      </div>
    `;
  }

  header.innerHTML = `
    <span class="eyebrow">Learning Path</span>
    <h1>${escapeHtml(c.courseTitle || ctx.career.name)}</h1>
    <div class="hero-meta">${badges.join("")}</div>
    <p>${escapeHtml(c.courseDescription || c.intro || "")}</p>
    ${deliveryHtml}
    ${frameworkHtml}
    <div class="hero-stats">
      <div class="hero-stat"><strong>${totals.skills}</strong><span>Skills</span></div>
      <div class="hero-stat"><strong>${totals.modules}</strong><span>Modules</span></div>
      <div class="hero-stat"><strong>${totals.completedPct}%</strong><span>Complete</span></div>
    </div>
  `;
  container.appendChild(header);
}

function buildCapstoneCard(capstone) {
  const card = document.createElement("div");
  card.className = "domain-card capstone-card";

  const badges = capstone.criticalSafetyItemsMustAllPass
    ? `<span class="tag warn">Safety-critical</span>` : "";
  const signoff = capstone.instructorSignOffRequired
    ? `<span class="tag">Instructor sign-off</span>` : "";

  card.innerHTML = `
    <div class="domain-head">
      <div>
        <h3>🎓 ${escapeHtml(capstone.title || "Capstone Assessment")}</h3>
        <p class="domain-desc">${escapeHtml(capstone.description || "")}</p>
        <div class="meta" style="margin-top:8px">
          ${badges}${signoff}
          <span class="tag">Pass: ${capstone.passingScore || 80}%</span>
        </div>
      </div>
    </div>
    <button class="btn btn-accent" data-capstone="1">View capstone requirements</button>
  `;

  card.querySelector("[data-capstone]").addEventListener("click", () => {
    renderCapstone();
  });

  return card;
}

function buildImplNotes(notes) {
  const wrap = document.createElement("details");
  wrap.className = "impl-notes";
  wrap.innerHTML = `
    <summary>Implementation notes (for instructors & authors)</summary>
    <ul>${notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
  `;
  return wrap;
}

// ============================================================
// DOMAIN CARD
// ============================================================

function buildDomainCard(domain) {
  const card = document.createElement("div");
  card.className = "domain-card";

  const dPct = computeDomainProgress(domain, ctx.career.id);

  const head = document.createElement("div");
  head.className = "domain-head";
  head.innerHTML = `
    <div>
      <h3>${escapeHtml(domain.name)}</h3>
      <p class="domain-desc">${escapeHtml(domain.description || "")}</p>
    </div>
    <div class="domain-pct">${dPct}%</div>
  `;
  card.appendChild(head);

  const list = document.createElement("div");
  list.className = "skill-list";

  domain.skills.forEach((skill, idx) => {
    const skillPct = computeSkillProgress(skill, ctx.career.id);
    const currentLevel = getCurrentLevel(skill, ctx.career.id);
    const locked = idx > 0 && computeSkillProgress(domain.skills[idx - 1], ctx.career.id) < 40;

    const row = document.createElement("button");
    row.className = "skill-row" + (locked ? " locked" : "");
    row.disabled = locked;
    row.innerHTML = `
      <div class="skill-left">
        <span class="skill-name">${escapeHtml(skill.name)}</span>
        <span class="skill-level-tag">${LEVELS[Math.min(currentLevel, LEVELS.length - 1)].name} · ${skillPct}%</span>
      </div>
      <div class="skill-right">
        <div class="skill-bar"><span style="width:${skillPct}%"></span></div>
        <span class="skill-pct">${skillPct}%</span>
      </div>
    `;

    if (!locked) {
      row.addEventListener("click", () => {
        ctx.skill = skill;
        ctx.levelIndex = currentLevel;
        renderSkillPath();
      });
    }

    list.appendChild(row);
  });

  card.appendChild(list);

  if (domain.diplomaPracticals?.length) {
    const practWrap = document.createElement("div");
    practWrap.className = "domain-practicals";
    practWrap.innerHTML = `<h4>Supervised practicals</h4>`;
    domain.diplomaPracticals.forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "practical-row";
      btn.innerHTML = `
        <span class="practical-icon">⚙</span>
        <span class="practical-name">${escapeHtml(p.title)}</span>
        <span class="practical-meta">${p.durationMinutes || "—"} min</span>
      `;
      btn.addEventListener("click", () => {
        ctx.module = p;
        renderModuleView();
      });
      practWrap.appendChild(btn);
    });
    card.appendChild(practWrap);
  }

  return card;
}

// ============================================================
// SKILL PATH VIEW
// ============================================================

export function renderSkillPath() {
  const container = ctx.onNavigate.toView("skillPath");
  container.innerHTML = "";

  const skill = ctx.skill;
  const skillPct = computeSkillProgress(skill, ctx.career.id);
  const currentLevel = getCurrentLevel(skill, ctx.career.id);

  const head = document.createElement("div");
  head.className = "skill-path-header";
  head.innerHTML = `
    <button class="btn btn-link" id="backToTree">← Back to course</button>
    <h2>${escapeHtml(skill.name)}</h2>
    <p class="lead">${escapeHtml(skill.description || "")}</p>
    <div class="skill-path-progress">
      <div class="bar"><span style="width:${skillPct}%"></span></div>
      <span>${skillPct}% · ${LEVELS[Math.min(currentLevel, LEVELS.length - 1)].name}</span>
    </div>
  `;
  container.appendChild(head);
  head.querySelector("#backToTree").addEventListener("click", () => ctx.onNavigate.toTree());

  const ladder = document.createElement("div");
  ladder.className = "level-ladder";

  LEVELS.forEach((levelMeta, levelIdx) => {
    const levelData = skill.levels?.[levelIdx];
    if (!levelData) return;

    const levelPct = computeLevelProgress(skill, levelIdx, ctx.career.id);
    const isLocked = levelIdx > currentLevel;
    const isCurrent = levelIdx === currentLevel;
    const isDone = levelPct >= 100;

    const title = levelData.levelTitle || levelMeta.name;
    const gate = levelData.competencyGate;

    let gateHtml = "";
    if (gate) {
      const parts = [];
      if (gate.knowledgePassPercent) parts.push(`${gate.knowledgePassPercent}% pass`);
      if (gate.safetyCriticalItemsMustAllPass) parts.push("safety-critical");
      if (gate.instructorSignOffRequiredForLiveModel) parts.push("instructor sign-off");
      if (parts.length) {
        gateHtml = `<div class="gate-row">${parts.map(p => `<span class="gate-tag">${p}</span>`).join("")}</div>`;
      }
    }

    const row = document.createElement("div");
    row.className = "level-row" +
      (isLocked ? " locked" : "") +
      (isCurrent ? " current" : "") +
      (isDone ? " done" : "");

    row.innerHTML = `
      <div class="level-dot">${isDone ? "✓" : levelIdx + 1}</div>
      <div class="level-body">
        <div class="level-head">
          <strong>${escapeHtml(title)}</strong>
          ${isLocked ? '<span class="lock-tag">Locked</span>' : ""}
          ${isCurrent ? '<span class="current-tag">Current</span>' : ""}
          ${isDone ? '<span class="done-tag">Completed</span>' : ""}
        </div>
        <p class="level-desc">${escapeHtml(levelMeta.desc)}</p>
        ${gateHtml}
        <div class="level-modules"></div>
      </div>
    `;

    const modsWrap = row.querySelector(".level-modules");
    const modules = levelData.modules || [];

    modules.forEach((mod, modIdx) => {
      const mKey = moduleKey(skill.id, levelIdx, mod.id);
      const mScore = getModuleScore(ctx.career.id, mKey);
      const prevKey = modIdx > 0 ? moduleKey(skill.id, levelIdx, modules[modIdx - 1].id) : null;
      const modLocked = isLocked || (prevKey && getModuleScore(ctx.career.id, prevKey) < 100);

      const modRow = document.createElement("button");
      modRow.className = "module-row" + (modLocked ? " locked" : "");
      modRow.disabled = modLocked;
      modRow.innerHTML = `
        <span class="module-icon">${moduleIcon(mod.type)}</span>
        <span class="module-name">${escapeHtml(mod.title)}</span>
        <span class="module-meta">${moduleMeta(mod)}</span>
        <span class="module-check">${mScore >= 100 ? "✓" : ""}</span>
      `;

      if (!modLocked) {
        modRow.addEventListener("click", () => {
          ctx.levelIndex = levelIdx;
          ctx.module = mod;
          renderModuleView();
        });
      }

      modsWrap.appendChild(modRow);
    });

    ladder.appendChild(row);
  });

  container.appendChild(ladder);
}

// ============================================================
// MODULE VIEW
// ============================================================

export function renderModuleView() {
  const container = ctx.onNavigate.toView("module");
  container.innerHTML = "";

  const mod = ctx.module;

  if (mod.type === "practical") {
    renderDiplomaPractical(container, mod);
    return;
  }

  const skill = ctx.skill;
  const level = LEVELS[ctx.levelIndex] || { name: "Level" };

  const head = document.createElement("div");
  head.className = "module-header";
  head.innerHTML = `
    <button class="btn btn-link" id="backToPath">← ${escapeHtml(skill.name)}</button>
    <div style="margin-top:8px">
      <span class="module-badge ${mod.type === "simulation" ? "simulation" : ""}">${moduleLabel(mod.type)}</span>
      <h2>${escapeHtml(mod.title)}</h2>
      <p style="margin:6px 0 0;color:var(--text-muted);font-size:13px">${escapeHtml(level.name)} · ${escapeHtml(skill.name)}</p>
    </div>
  `;
  container.appendChild(head);
  head.querySelector("#backToPath").addEventListener("click", () => renderSkillPath());

  // Simulations render full-width, in their own layout, without teaching panel
  if (mod.type === "simulation") {
    renderSimulation(container, mod);
    return;
  }

  if (mod.visuals?.length) {
    const visWrap = document.createElement("div");
    visWrap.className = "visuals-block";
    mod.visuals.forEach((v) => visWrap.appendChild(buildVisualCard(v)));
    container.appendChild(visWrap);
  }

  const body = document.createElement("div");
  body.className = "module-body";
  container.appendChild(body);

  switch (mod.type) {
    case MODULE_TYPES.LESSON:    renderLesson(body, mod); break;
    case MODULE_TYPES.DRILL:     renderDrill(body, mod); break;
    case MODULE_TYPES.SCENARIO:  renderScenario(body, mod); break;
    case MODULE_TYPES.PORTFOLIO: renderPortfolio(body, mod); break;
    case MODULE_TYPES.ASSESS:    renderAssessment(body, mod); break;
    case MODULE_TYPES.SANDBOX:   renderSandbox(body, mod); break;
  }

  container.appendChild(buildTeachingPanel(mod));
}

// ============================================================
// SIMULATION
// ============================================================

async function renderSimulation(container, mod) {
  const simWrap = document.createElement("div");
  simWrap.className = "simulation-wrap";
  simWrap.innerHTML = `
    <div class="sim-loading">
      <div class="sim-loading-dot"></div>
      <span>Loading simulation…</span>
    </div>
  `;
  container.appendChild(simWrap);

  try {
    const { launchSimulation } = await import("./sims/sim-loader.js");
    simWrap.innerHTML = "";
    launchSimulation({
      careerId: ctx.career.id,
      container: simWrap,
      onComplete: ({ score, passed, evidence }) => {
        complete(mod, score);
        window.__fpToast?.(
          passed
            ? "Simulation passed — progress saved"
            : "Simulation completed — try again to improve",
          passed ? "success" : ""
        );
      }
    });
  } catch (err) {
    console.warn("[FuturePath] Simulation unavailable:", err);
    simWrap.innerHTML = `
      <div class="sim-unavailable">
        <h3>Simulation coming soon</h3>
        <p>This career's interactive simulation is being built.</p>
      </div>
    `;
  }
}

// ---------- VISUAL CARD ----------

function buildVisualCard(v) {
  const card = document.createElement("div");
  card.className = "visual-card";

  card.innerHTML = `
    <div class="visual-frame" data-vtype="${escapeHtml(v.type || "visual")}">
      ${generateIllustration(v)}
    </div>
    <div class="visual-meta">
      <h4>${escapeHtml(v.title || "Visual")}</h4>
      <p>${escapeHtml(v.description || "")}</p>
      ${v.learningPurpose ? `<p class="visual-purpose"><strong>Purpose:</strong> ${escapeHtml(v.learningPurpose)}</p>` : ""}
      ${v.caption ? `<p class="visual-caption">${escapeHtml(v.caption)}</p>` : ""}
      ${v.altText ? `<details class="visual-alt-details"><summary>Accessible description</summary><p>${escapeHtml(v.altText)}</p></details>` : ""}
    </div>
  `;
  return card;
}

// ============================================================
// SVG ILLUSTRATION GENERATOR
// ============================================================

function generateIllustration(v) {
  const type = v.type || "annotatedPhoto";
  const title = (v.title || "").slice(0, 60);

  const svgOpen = `<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" class="visual-svg">`;
  const svgClose = `</svg>`;

  const styleBlock = `
    <style>
      .vg-bg { fill: #0a0e1a; }
      .vg-panel { fill: #10182b; stroke: #22304e; stroke-width: 1.5; }
      .vg-panel-accent { fill: #0f2338; stroke: #2ec49a; stroke-width: 2; }
      .vg-panel-warn { fill: #241a0a; stroke: #e8b60c; stroke-width: 2; }
      .vg-panel-danger { fill: #2a0f1a; stroke: #e05c7a; stroke-width: 2; }
      .vg-text { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; fill: #e8eef8; font-size: 15px; font-weight: 600; }
      .vg-text-sm { font-family: system-ui, sans-serif; fill: #8a99b8; font-size: 12px; font-weight: 500; }
      .vg-text-tiny { font-family: system-ui, sans-serif; fill: #5d6b88; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; }
      .vg-text-accent { fill: #2ec49a; }
      .vg-text-warn { fill: #e8b60c; }
      .vg-text-danger { fill: #e05c7a; }
      .vg-title { font-family: system-ui, sans-serif; fill: #e8eef8; font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
      .vg-line { stroke: #2ec49a; stroke-width: 2; fill: none; }
      .vg-line-dim { stroke: #22304e; stroke-width: 1.5; fill: none; }
      .vg-arrow { stroke: #2ec49a; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
      .vg-arrow-dim { stroke: #5d6b88; stroke-width: 2; fill: none; marker-end: url(#arrowhead-dim); }
    </style>
  `;

  const defs = `
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#2ec49a" />
      </marker>
      <marker id="arrowhead-dim" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#5d6b88" />
      </marker>
    </defs>
  `;

  let body = "";

  if (type === "safetyInfographic") {
    const items = [
      { icon: "⛑", label: "Helmet" },
      { icon: "🕶", label: "Eye protection" },
      { icon: "🧤", label: "Gloves" },
      { icon: "🥼", label: "Apron" },
      { icon: "🥾", label: "Boots" },
      { icon: "😷", label: "Respirator" }
    ];
    let grid = "";
    items.forEach((it, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 60 + col * 240;
      const y = 130 + row * 140;
      grid += `
        <g transform="translate(${x}, ${y})">
          <rect class="vg-panel-accent" x="0" y="0" width="200" height="110" rx="12"/>
          <text x="100" y="55" text-anchor="middle" font-size="42">${it.icon}</text>
          <text x="100" y="90" text-anchor="middle" class="vg-text">${escapeXml(it.label)}</text>
        </g>
      `;
    });
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Every item protects against a specific injury. Learn all six.</text>
      ${grid}
    `;
  } else if (type === "stepByStepIllustration") {
    const steps = ["Prepare", "Demonstrate", "Practise", "Inspect", "Reflect"];
    let flow = "";
    steps.forEach((s, i) => {
      const x = 50 + i * 145;
      flow += `
        <g transform="translate(${x}, 120)">
          <circle cx="55" cy="55" r="34" class="vg-panel-accent"/>
          <text x="55" y="62" text-anchor="middle" font-size="22" class="vg-text-accent" font-weight="800">${i + 1}</text>
          <text x="55" y="130" text-anchor="middle" class="vg-text">${escapeXml(s)}</text>
        </g>
        ${i < steps.length - 1 ? `<line x1="${x + 95}" y1="175" x2="${x + 145}" y2="175" class="vg-arrow"/>` : ""}
      `;
    });
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Follow each stage in order. Do not skip.</text>
      ${flow}
      <text x="400" y="320" text-anchor="middle" class="vg-text-sm">Each stage builds on the last. Rushing any stage fails the next.</text>
    `;
  } else if (type === "techniqueDiagram") {
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Cross-section showing component placement and direction.</text>
      <g transform="translate(100, 130)">
        <rect class="vg-panel" x="0" y="0" width="200" height="40" rx="4"/>
        <text x="100" y="26" text-anchor="middle" class="vg-text">Base metal A</text>
      </g>
      <g transform="translate(500, 130)">
        <rect class="vg-panel" x="0" y="0" width="200" height="40" rx="4"/>
        <text x="100" y="26" text-anchor="middle" class="vg-text">Base metal B</text>
      </g>
      <g transform="translate(300, 130)">
        <polygon class="vg-panel-accent" points="0,0 100,0 50,80"/>
        <text x="50" y="50" text-anchor="middle" class="vg-text-accent" font-weight="700" font-size="13">WELD</text>
      </g>
      <line x1="220" y1="150" x2="280" y2="150" class="vg-arrow-dim"/>
      <line x1="420" y1="150" x2="480" y2="150" class="vg-arrow-dim"/>
      <text x="400" y="260" text-anchor="middle" class="vg-text-sm">Direction of travel →</text>
      <line x1="200" y1="290" x2="600" y2="290" class="vg-arrow"/>
      <text x="400" y="320" text-anchor="middle" class="vg-text-tiny">ARC · PENETRATION · FUSION</text>
    `;
  } else if (type === "decisionFlowchart") {
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Follow the path. Each decision leads to a specific action.</text>
      <g transform="translate(320, 100)">
        <rect class="vg-panel" x="0" y="0" width="160" height="50" rx="25"/>
        <text x="80" y="30" text-anchor="middle" class="vg-text">Start</text>
      </g>
      <line x1="400" y1="150" x2="400" y2="180" class="vg-arrow"/>
      <g transform="translate(320, 180)">
        <polygon class="vg-panel-warn" points="80,0 160,45 80,90 0,45"/>
        <text x="80" y="50" text-anchor="middle" class="vg-text" font-size="13">Assess?</text>
      </g>
      <line x1="320" y1="225" x2="200" y2="225" class="vg-arrow"/>
      <line x1="200" y1="225" x2="200" y2="280" class="vg-arrow"/>
      <line x1="480" y1="225" x2="600" y2="225" class="vg-arrow"/>
      <line x1="600" y1="225" x2="600" y2="280" class="vg-arrow"/>
      <g transform="translate(120, 280)">
        <rect class="vg-panel-accent" x="0" y="0" width="160" height="60" rx="8"/>
        <text x="80" y="30" text-anchor="middle" class="vg-text">Action A</text>
        <text x="80" y="48" text-anchor="middle" class="vg-text-sm">Proceed</text>
      </g>
      <g transform="translate(520, 280)">
        <rect class="vg-panel-danger" x="0" y="0" width="160" height="60" rx="8"/>
        <text x="80" y="30" text-anchor="middle" class="vg-text">Action B</text>
        <text x="80" y="48" text-anchor="middle" class="vg-text-sm">Stop and refer</text>
      </g>
    `;
  } else if (type === "beforeAfterComparison") {
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Compare the starting state with the correct finished state.</text>
      <g transform="translate(50, 110)">
        <rect class="vg-panel-danger" x="0" y="0" width="330" height="260" rx="10"/>
        <text x="165" y="30" text-anchor="middle" class="vg-text-danger" font-weight="800" font-size="14">✕ WRONG</text>
        <rect x="30" y="60" width="270" height="160" rx="6" fill="#1a0f16"/>
        <text x="165" y="150" text-anchor="middle" class="vg-text-sm">Incorrect · Defect · Unsafe</text>
      </g>
      <g transform="translate(420, 110)">
        <rect class="vg-panel-accent" x="0" y="0" width="330" height="260" rx="10"/>
        <text x="165" y="30" text-anchor="middle" class="vg-text-accent" font-weight="800" font-size="14">✓ CORRECT</text>
        <rect x="30" y="60" width="270" height="160" rx="6" fill="#0a1a14"/>
        <text x="165" y="150" text-anchor="middle" class="vg-text-sm">Clean · Professional · Safe</text>
      </g>
      <text x="400" y="410" text-anchor="middle" class="vg-text-sm">Same tools, same materials — different preparation.</text>
    `;
  } else if (type === "annotatedPhoto") {
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Refer to each labelled feature before starting the task.</text>
      <rect class="vg-panel" x="50" y="110" width="700" height="280" rx="10"/>
      <text x="400" y="260" text-anchor="middle" class="vg-text-tiny">REFERENCE IMAGE — ANNOTATED</text>
      <g>
        <line x1="100" y1="150" x2="220" y2="200" class="vg-line"/>
        <circle cx="100" cy="150" r="4" fill="#2ec49a"/>
        <text x="105" y="145" class="vg-text" font-size="12">Feature A</text>
      </g>
      <g>
        <line x1="700" y1="150" x2="580" y2="200" class="vg-line"/>
        <circle cx="700" cy="150" r="4" fill="#2ec49a"/>
        <text x="620" y="145" class="vg-text" font-size="12" text-anchor="end">Feature B</text>
      </g>
      <g>
        <line x1="100" y1="350" x2="220" y2="300" class="vg-line"/>
        <circle cx="100" cy="350" r="4" fill="#2ec49a"/>
        <text x="105" y="365" class="vg-text" font-size="12">Feature C</text>
      </g>
      <g>
        <line x1="700" y1="350" x2="580" y2="300" class="vg-line"/>
        <circle cx="700" cy="350" r="4" fill="#2ec49a"/>
        <text x="620" y="365" class="vg-text" font-size="12" text-anchor="end">Feature D</text>
      </g>
    `;
  } else if (type === "practiceChecklist") {
    const rows = ["Checklist item one", "Checklist item two", "Checklist item three", "Checklist item four", "Checklist item five"];
    let listHtml = "";
    rows.forEach((r, i) => {
      listHtml += `
        <g transform="translate(80, ${120 + i * 55})">
          <rect class="vg-panel" x="0" y="0" width="640" height="42" rx="8"/>
          <rect class="vg-panel-accent" x="15" y="11" width="20" height="20" rx="4"/>
          <text x="55" y="27" class="vg-text" font-size="14">${escapeXml(r)}</text>
        </g>
      `;
    });
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Work through every item before proceeding.</text>
      ${listHtml}
    `;
  } else if (type === "toolIdentificationChart") {
    const tools = ["Tool 1", "Tool 2", "Tool 3", "Tool 4", "Tool 5", "Tool 6"];
    let grid = "";
    tools.forEach((t, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 60 + col * 240;
      const y = 120 + row * 150;
      grid += `
        <g transform="translate(${x}, ${y})">
          <rect class="vg-panel" x="0" y="0" width="200" height="120" rx="10"/>
          <circle cx="100" cy="45" r="28" class="vg-panel-accent"/>
          <text x="100" y="53" text-anchor="middle" class="vg-text" font-size="26">⚒</text>
          <text x="100" y="100" text-anchor="middle" class="vg-text" font-size="13">${escapeXml(t)}</text>
        </g>
      `;
    });
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Identify each tool by shape and function.</text>
      ${grid}
    `;
  } else if (type === "videoDemonstration") {
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Watch the full demonstration before practising.</text>
      <rect class="vg-panel" x="100" y="110" width="600" height="280" rx="10"/>
      <g transform="translate(400, 250)">
        <circle cx="0" cy="0" r="45" class="vg-panel-accent"/>
        <polygon points="-12,-18 -12,18 20,0" fill="#2ec49a"/>
      </g>
      <text x="400" y="340" text-anchor="middle" class="vg-text-tiny">DEMONSTRATION · 0:00 / 12:34</text>
      <text x="400" y="400" text-anchor="middle" class="vg-text-sm">Transcript and captions available</text>
    `;
  } else if (type === "interactiveHotspot") {
    const hotspots = [1, 2, 3, 4, 5];
    let dots = "";
    hotspots.forEach((h, i) => {
      const x = 200 + (i % 3) * 200;
      const y = 180 + Math.floor(i / 3) * 130;
      dots += `
        <g transform="translate(${x}, ${y})">
          <circle cx="0" cy="0" r="22" class="vg-panel-accent"/>
          <text x="0" y="7" text-anchor="middle" class="vg-text-accent" font-weight="800">${h}</text>
        </g>
      `;
    });
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Tap each numbered point to explore.</text>
      <rect class="vg-panel" x="80" y="110" width="640" height="280" rx="10"/>
      ${dots}
    `;
  } else if (type === "assessmentEvidencePhoto") {
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Document your work in this format.</text>
      <g transform="translate(60, 120)">
        <rect class="vg-panel-accent" x="0" y="0" width="320" height="200" rx="8"/>
        <text x="160" y="105" text-anchor="middle" class="vg-text-sm">TOP VIEW</text>
      </g>
      <g transform="translate(420, 120)">
        <rect class="vg-panel-accent" x="0" y="0" width="320" height="200" rx="8"/>
        <text x="160" y="105" text-anchor="middle" class="vg-text-sm">SIDE VIEW</text>
      </g>
      <g transform="translate(60, 340)">
        <rect class="vg-panel" x="0" y="0" width="680" height="70" rx="8"/>
        <text x="20" y="28" class="vg-text" font-size="13">Settings: _______________  Rod: _______________</text>
        <text x="20" y="52" class="vg-text" font-size="13">Notes: ______________________________________</text>
      </g>
    `;
  } else {
    body = `
      <text x="40" y="50" class="vg-title">${escapeXml(title)}</text>
      <text x="40" y="72" class="vg-text-sm">Reference diagram</text>
      <rect class="vg-panel" x="60" y="120" width="680" height="260" rx="10"/>
      <text x="400" y="260" text-anchor="middle" class="vg-text-tiny">ILLUSTRATION</text>
    `;
  }

  return svgOpen + defs + styleBlock + `<rect class="vg-bg" width="800" height="450"/>` + body + svgClose;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------- TEACHING PANEL ----------

function buildTeachingPanel(mod) {
  const panel = document.createElement("div");
  panel.className = "teaching-panel";

  const sections = [];

  if (mod.learningObjectives?.length) {
    sections.push(`
      <div class="teach-section">
        <h4>Learning objectives</h4>
        <ul>${mod.learningObjectives.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
      </div>
    `);
  }

  if (mod.teachingNotes) {
    const tn = mod.teachingNotes;
    sections.push(`
      <div class="teach-section">
        <h4>Teaching notes (instructor)</h4>
        ${tn.diplomaDepth ? `<p><strong>Depth:</strong> ${escapeHtml(tn.diplomaDepth)}</p>` : ""}
        ${tn.learnerTask ? `<p><strong>Learner task:</strong> ${escapeHtml(tn.learnerTask)}</p>` : ""}
        ${tn.instructorCheck ? `<p><strong>Instructor check:</strong> ${escapeHtml(tn.instructorCheck)}</p>` : ""}
      </div>
    `);
  }

  if (mod.practicalEvidence?.required) {
    const pe = mod.practicalEvidence;
    sections.push(`
      <div class="teach-section evidence-section">
        <h4>Practical evidence required</h4>
        <div class="evidence-tags">
          ${(pe.evidenceTypes || []).map((t) => `<span class="evidence-tag">${escapeHtml(t)}</span>`).join("")}
        </div>
        ${pe.assessmentCriteria?.length ? `
          <p style="margin-top:10px"><strong>Assessment criteria:</strong></p>
          <ul>${pe.assessmentCriteria.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
        ` : ""}
      </div>
    `);
  }

  if (!sections.length) return document.createElement("span");

  panel.innerHTML = `<h3 class="teach-title">For instructors</h3>${sections.join("")}`;
  return panel;
}

// ---------- DIPLOMA PRACTICAL ----------

function renderDiplomaPractical(container, mod) {
  const head = document.createElement("div");
  head.className = "module-header";
  head.innerHTML = `
    <button class="btn btn-link" id="backFromPractical">← Back</button>
    <div style="margin-top:8px">
      <span class="module-badge practical">Supervised Practical</span>
      <h2>${escapeHtml(mod.title)}</h2>
      <p style="margin:6px 0 0;color:var(--text-muted);font-size:13px">
        ${mod.durationMinutes || "—"} min · Instructor sign-off required
      </p>
    </div>
  `;
  container.appendChild(head);
  head.querySelector("#backFromPractical").addEventListener("click", () => ctx.onNavigate.toTree());

  if (mod.visuals?.length) {
    const visWrap = document.createElement("div");
    visWrap.className = "visuals-block";
    mod.visuals.forEach((v) => visWrap.appendChild(buildVisualCard(v)));
    container.appendChild(visWrap);
  }

  const prompt = document.createElement("div");
  prompt.className = "scenario-prompt";
  prompt.innerHTML = `<p class="scenario-q">${escapeHtml(mod.prompt || "")}</p>`;
  container.appendChild(prompt);

  if (mod.steps?.length) {
    const stepWrap = document.createElement("div");
    stepWrap.className = "practical-steps";
    mod.steps.forEach((s) => {
      const el = document.createElement("div");
      el.className = "practical-step";
      el.innerHTML = `
        <div class="step-num">${s.step}</div>
        <div class="step-body">
          <h4>${escapeHtml(s.title)}</h4>
          <p>${escapeHtml(s.instruction)}</p>
          ${s.visual ? `<p class="step-visual">Visual: ${escapeHtml(s.visual)}</p>` : ""}
        </div>
      `;
      stepWrap.appendChild(el);
    });
    container.appendChild(stepWrap);
  }

  if (mod.rubric?.length) {
    const rub = document.createElement("div");
    rub.className = "rubric";
    rub.innerHTML = `
      <h4>Assessment rubric</h4>
      <ul>${mod.rubric.map((r) => `<li><strong>${escapeHtml(r.criterion)}</strong> — ${r.weightPercent}%</li>`).join("")}</ul>
      <p class="rubric-pass">Passing score: ${mod.passingScore || 80}%</p>
    `;
    container.appendChild(rub);
  }

  const actions = document.createElement("div");
  actions.className = "module-actions";
  actions.innerHTML = `<button class="btn btn-primary" id="practicalDone">Mark practical as supervised</button>`;
  container.appendChild(actions);
  actions.querySelector("#practicalDone").addEventListener("click", () => {
    complete(mod, 100);
  });
}

// ---------- CAPSTONE VIEW ----------

export function renderCapstone() {
  const container = ctx.onNavigate.toView("capstone");
  container.innerHTML = "";
  const c = ctx.curriculum.capstoneAssessment;
  if (!c) return;

  const head = document.createElement("div");
  head.className = "module-header";
  head.innerHTML = `
    <button class="btn btn-link" id="backFromCapstone">← Back to course</button>
    <div style="margin-top:8px">
      <span class="module-badge capstone">Capstone Assessment</span>
      <h2>${escapeHtml(c.title)}</h2>
      <p style="margin:6px 0 0;color:var(--text-muted);font-size:13px">
        Pass: ${c.passingScore}%${c.criticalSafetyItemsMustAllPass ? " · safety-critical items must all pass" : ""}
      </p>
    </div>
  `;
  container.appendChild(head);
  head.querySelector("#backFromCapstone").addEventListener("click", () => ctx.onNavigate.toTree());

  const desc = document.createElement("div");
  desc.className = "scenario-prompt";
  desc.innerHTML = `<p class="scenario-q">${escapeHtml(c.description)}</p>`;
  container.appendChild(desc);

  if (c.requiredVisuals?.length) {
    const vis = document.createElement("div");
    vis.className = "rubric";
    vis.innerHTML = `
      <h4>Required evidence</h4>
      <ul>${c.requiredVisuals.map((v) => `<li><strong>${escapeHtml(v.type)}</strong> — ${escapeHtml(v.purpose)}</li>`).join("")}</ul>
    `;
    container.appendChild(vis);
  }

  if (c.stages?.length) {
    const stages = document.createElement("div");
    stages.className = "practical-steps";
    c.stages.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "practical-step";
      el.innerHTML = `
        <div class="step-num">${i + 1}</div>
        <div class="step-body"><p>${escapeHtml(s)}</p></div>
      `;
      stages.appendChild(el);
    });
    container.appendChild(stages);
  }

  if (c.rubric?.length) {
    const rub = document.createElement("div");
    rub.className = "rubric";
    rub.innerHTML = `
      <h4>Final rubric</h4>
      <ul>${c.rubric.map((r) => `<li><strong>${escapeHtml(r.criterion)}</strong> — ${r.weightPercent}%</li>`).join("")}</ul>
      <p class="rubric-pass">Passing score: ${c.passingScore}%</p>
    `;
    container.appendChild(rub);
  }

  const actions = document.createElement("div");
  actions.className = "module-actions";
  actions.innerHTML = `<button class="btn btn-primary" id="capstoneDone">Mark capstone as complete</button>`;
  container.appendChild(actions);
  actions.querySelector("#capstoneDone").addEventListener("click", () => {
    const key = "capstone." + ctx.career.id;
    recordModule(ctx.career.id, key, 100);
    window.__fpToast?.("Capstone marked complete", "success");
    setTimeout(() => renderSkillTree(ctx.onNavigate.toView("tree")), 300);
  });
}

// ============================================================
// MODULE RENDERERS
// ============================================================

function renderLesson(container, mod) {
  const content = document.createElement("div");
  content.className = "lesson-content";
  content.innerHTML = mod.content || "<p>Lesson content coming soon.</p>";
  container.appendChild(content);

  const actions = document.createElement("div");
  actions.className = "module-actions";
  actions.innerHTML = `<button class="btn btn-primary" id="lessonDone">Mark as read</button>`;
  container.appendChild(actions);

  actions.querySelector("#lessonDone").addEventListener("click", () => complete(mod, 100));
}

function renderDrill(container, mod) {
  const steps = mod.steps || [];
  const passing = mod.passingScore || 70;
  let idx = 0;
  let correct = 0;

  function render() {
    container.innerHTML = "";

    if (idx >= steps.length) {
      const pct = Math.round((correct / steps.length) * 100);
      const passed = pct >= passing;
      const done = document.createElement("div");
      done.className = "drill-complete";
      done.innerHTML = `
        <h3>${passed ? "Drill complete" : "Keep practicing"}</h3>
        <p>You answered <strong>${correct} of ${steps.length}</strong> correctly — ${pct}%</p>
        <p style="color:var(--text-muted);font-size:13px">
          ${passed ? "You're ready to move on." : `You need ${passing}% to pass. Repeat the drill.`}
        </p>
      `;

      const actions = document.createElement("div");
      actions.className = "module-actions";
      actions.style.marginTop = "18px";
      actions.style.justifyContent = "center";
      actions.innerHTML = `
        <button class="btn btn-ghost" id="repeat">Repeat drill</button>
        ${passed ? '<button class="btn btn-primary" id="done">Continue</button>' : ""}
      `;
      container.appendChild(done);
      container.appendChild(actions);

      actions.querySelector("#repeat").addEventListener("click", () => {
        idx = 0; correct = 0; render();
      });
      const doneBtn = actions.querySelector("#done");
      if (doneBtn) doneBtn.addEventListener("click", () => complete(mod, pct));
      return;
    }

    const step = steps[idx];

    const prog = document.createElement("div");
    prog.className = "drill-progress";
    prog.innerHTML = `
      <div class="bar"><span style="width:${(idx / steps.length) * 100}%"></span></div>
      <span>${idx + 1} / ${steps.length}</span>
    `;
    container.appendChild(prog);

    const q = document.createElement("p");
    q.className = "drill-q";
    q.textContent = step.q;
    container.appendChild(q);

    const grid = document.createElement("div");
    grid.className = "opt-grid";
    container.appendChild(grid);

    step.o.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "opt";
      btn.innerHTML = `<span class="mark">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(opt)}</span>`;

      btn.addEventListener("click", () => {
        grid.querySelectorAll(".opt").forEach((b) => b.disabled = true);
        const isCorrect = i === step.c;
        if (isCorrect) correct++;

        grid.querySelectorAll(".opt").forEach((b, j) => {
          if (j === step.c) b.classList.add("correct");
          else if (j === i && !isCorrect) b.classList.add("wrong");
        });

        const fb = document.createElement("div");
        fb.className = "feedback" + (isCorrect ? "" : " wrong");
        fb.innerHTML = `
          <div class="feedback-head">${isCorrect ? "✓ Correct" : "✕ Not quite"}</div>
          <p>${escapeHtml(step.f || "")}</p>
        `;
        container.appendChild(fb);

        const actions = document.createElement("div");
        actions.className = "module-actions";
        actions.innerHTML = `<button class="btn btn-primary" id="nextStep">${idx === steps.length - 1 ? "Finish" : "Next"}</button>`;
        container.appendChild(actions);

        actions.querySelector("#nextStep").addEventListener("click", () => {
          idx++;
          render();
        });
      });

      grid.appendChild(btn);
    });
  }

  render();
}

function renderScenario(container, mod) {
  const prompt = document.createElement("div");
  prompt.className = "scenario-prompt";
  prompt.innerHTML = `
    <p class="scenario-q">${escapeHtml(mod.prompt)}</p>
    ${mod.context ? `<p class="scenario-context">${escapeHtml(mod.context)}</p>` : ""}
  `;
  container.appendChild(prompt);

  const ta = document.createElement("textarea");
  ta.className = "scenario-input";
  ta.placeholder = mod.placeholder || "Type your response…";
  container.appendChild(ta);

  if (mod.rubric?.length) {
    const rubric = document.createElement("div");
    rubric.className = "rubric";
    rubric.innerHTML = `
      <h4>What success looks like</h4>
      <ul>${mod.rubric.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
    `;
    container.appendChild(rubric);
  }

  const actions = document.createElement("div");
  actions.className = "module-actions";
  actions.innerHTML = `<button class="btn btn-primary" id="submit" disabled>Submit response</button>`;
  container.appendChild(actions);

  ta.addEventListener("input", () => {
    actions.querySelector("#submit").disabled = ta.value.trim().length < 40;
  });

  actions.querySelector("#submit").addEventListener("click", () => {
    complete(mod, 100);
    window.__fpToast?.("Response saved", "success");
  });
}

function renderPortfolio(container, mod) {
  const prompt = document.createElement("div");
  prompt.className = "scenario-prompt";
  prompt.innerHTML = `
    <p class="scenario-q">${escapeHtml(mod.prompt)}</p>
    ${mod.context ? `<p class="scenario-context">${escapeHtml(mod.context)}</p>` : ""}
  `;
  container.appendChild(prompt);

  if (mod.steps?.length) {
    const steps = document.createElement("ol");
    steps.className = "portfolio-steps";
    mod.steps.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      steps.appendChild(li);
    });
    container.appendChild(steps);
  }

  const ta = document.createElement("textarea");
  ta.className = "scenario-input";
  ta.placeholder = "Describe what you made, how you made it, and what you learned…";
  container.appendChild(ta);

  const upload = document.createElement("input");
  upload.type = "file";
  upload.accept = "image/*,video/*,.pdf";
  upload.className = "portfolio-upload";
  container.appendChild(upload);

  const actions = document.createElement("div");
  actions.className = "module-actions";
  actions.innerHTML = `<button class="btn btn-primary" id="save" disabled>Save to portfolio</button>`;
  container.appendChild(actions);

  ta.addEventListener("input", () => {
    actions.querySelector("#save").disabled = ta.value.trim().length < 20;
  });

  actions.querySelector("#save").addEventListener("click", () => {
    complete(mod, 100);
    window.__fpToast?.("Saved to your portfolio", "success");
  });
}

function renderAssessment(container, mod) {
  renderDrill(container, {
    ...mod,
    passingScore: mod.passingScore || 80
  });
}

function renderSandbox(container, mod) {
  const prompt = document.createElement("div");
  prompt.className = "scenario-prompt";
  prompt.innerHTML = `
    <p class="scenario-q">${escapeHtml(mod.prompt)}</p>
    ${mod.context ? `<p class="scenario-context">${escapeHtml(mod.context)}</p>` : ""}
  `;
  container.appendChild(prompt);

  const controls = document.createElement("div");
  controls.className = "sandbox-controls";
  controls.innerHTML = (mod.controls || []).map((c) => `
    <label>
      <span>${escapeHtml(c.label)}</span>
      <input type="range" min="${c.min}" max="${c.max}" step="${c.step || 1}" value="${c.default ?? c.min}" data-param="${c.id}">
      <strong data-out="${c.id}">${c.default ?? c.min}${c.unit || ""}</strong>
    </label>
  `).join("");
  container.appendChild(controls);

  const result = document.createElement("div");
  result.className = "sandbox-result";
  result.textContent = "Adjust parameters above to see the outcome.";
  container.appendChild(result);

  function update() {
    const params = {};
    controls.querySelectorAll("input[type=range]").forEach((input) => {
      const param = input.dataset.param;
      const ctrl = mod.controls.find((c) => c.id === param);
      params[param] = parseFloat(input.value);
      controls.querySelector(`[data-out="${param}"]`).textContent =
        input.value + (ctrl?.unit || "");
    });
    if (typeof mod.compute === "function") {
      result.textContent = mod.compute(params);
    }
  }

  controls.querySelectorAll("input[type=range]").forEach((input) => {
    input.addEventListener("input", update);
  });
  update();

  const actions = document.createElement("div");
  actions.className = "module-actions";
  actions.innerHTML = `<button class="btn btn-primary" id="explored">Mark as explored</button>`;
  container.appendChild(actions);

  actions.querySelector("#explored").addEventListener("click", () => complete(mod, 100));
}

// ============================================================
// COMPLETION
// ============================================================

function complete(mod, score) {
  const key = moduleKey(ctx.skill.id, ctx.levelIndex, mod.id);
  recordModule(ctx.career.id, key, score);
  window.__fpToast?.(`Progress saved — ${score}%`, "success");
  setTimeout(() => renderSkillPath(), 300);
}

// ============================================================
// PROGRESS MATH
// ============================================================

function moduleKey(skillId, levelIdx, moduleId) {
  return `${skillId}.${levelIdx}.${moduleId}`;
}

function computeTotals(domains, careerId) {
  let skills = 0, modules = 0, done = 0;
  domains.forEach((d) => {
    d.skills.forEach((s) => {
      skills++;
      Object.keys(s.levels || {}).forEach((lvl) => {
        (s.levels[lvl].modules || []).forEach((m) => {
          modules++;
          const key = moduleKey(s.id, parseInt(lvl, 10), m.id);
          if (getModuleScore(careerId, key) >= 100) done++;
        });
      });
    });
  });
  return {
    skills,
    modules,
    completedPct: modules ? Math.round((done / modules) * 100) : 0
  };
}

function computeDomainProgress(domain, careerId) {
  if (!domain.skills.length) return 0;
  const sum = domain.skills.reduce((a, s) => a + computeSkillProgress(s, careerId), 0);
  return Math.round(sum / domain.skills.length);
}

function computeSkillProgress(skill, careerId) {
  const total = Object.keys(skill.levels || {}).length;
  if (!total) return 0;
  const sum = Object.keys(skill.levels).reduce(
    (a, lvl) => a + computeLevelProgress(skill, parseInt(lvl, 10), careerId),
    0
  );
  return Math.round(sum / total);
}

function computeLevelProgress(skill, levelIdx, careerId) {
  const mods = skill.levels?.[levelIdx]?.modules || [];
  if (!mods.length) return 0;
  const sum = mods.reduce((a, m) => a + getModuleScore(careerId, moduleKey(skill.id, levelIdx, m.id)), 0);
  return Math.round(sum / mods.length);
}

function getCurrentLevel(skill, careerId) {
  const levels = Object.keys(skill.levels || {}).length;
  for (let i = 0; i < levels; i++) {
    if (computeLevelProgress(skill, i, careerId) < 100) return i;
  }
  return Math.max(0, levels - 1);
}

// ============================================================
// UTIL
// ============================================================

function moduleIcon(type) {
  return {
    lesson: "📖",
    drill: "🎯",
    scenario: "🧩",
    portfolio: "🗂️",
    assess: "🎓",
    sandbox: "🧪",
    practical: "⚙",
    simulation: "🎮"
  }[type] || "•";
}

function moduleLabel(type) {
  return {
    lesson: "Lesson",
    drill: "Drill",
    scenario: "Scenario",
    portfolio: "Portfolio",
    assess: "Assessment",
    sandbox: "Sandbox",
    practical: "Supervised Practical",
    simulation: "Interactive Simulation"
  }[type] || "Module";
}

function moduleMeta(mod) {
  if (mod.type === "drill") return `${(mod.steps || []).length} questions`;
  if (mod.type === "lesson") return "Read";
  if (mod.type === "assess") return "Pass to unlock";
  if (mod.type === "portfolio") return "Artifact";
  if (mod.type === "sandbox") return "Free play";
  if (mod.type === "scenario") return "Written response";
  if (mod.type === "simulation") return "Play";
  return "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export { resetCareer };
