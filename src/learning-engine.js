/* ============================================================
   FuturePath — Learning Engine (Diploma Edition)
   Renders skill trees, level paths, module types, visuals,
   teaching notes, practical evidence, and capstone.
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
  PRACTICAL: "practical"
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
// SKILL TREE VIEW (course root)
// ============================================================

export function renderSkillTree(container) {
  container.innerHTML = "";
  const domains = ctx.curriculum.skillDomains || [];

  // ---------- Course header (diploma metadata) ----------
  renderCourseHeader(container);

  // ---------- Domains ----------
  const domainWrap = document.createElement("div");
  domains.forEach((domain) => {
    domainWrap.appendChild(buildDomainCard(domain));
  });
  container.appendChild(domainWrap);

  // ---------- Capstone ----------
  if (ctx.curriculum.capstoneAssessment) {
    container.appendChild(buildCapstoneCard(ctx.curriculum.capstoneAssessment));
  }

  // ---------- Implementation notes (collapsible) ----------
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
    ${c.qualificationNote ? `<p class="qualification-note">${escapeHtml(c.qualificationNote)}</p>` : ""}
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

  // ---------- Diploma practicals per domain ----------
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

    // Gate badge
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

  // Practical modules get a different layout
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
      <span class="module-badge">${moduleLabel(mod.type)}</span>
      <h2>${escapeHtml(mod.title)}</h2>
      <p style="margin:6px 0 0;color:var(--text-muted);font-size:13px">${escapeHtml(level.name)} · ${escapeHtml(skill.name)}</p>
    </div>
  `;
  container.appendChild(head);
  head.querySelector("#backToPath").addEventListener("click", () => renderSkillPath());

  // ---------- Visuals (rendered first, before content) ----------
  if (mod.visuals?.length) {
    const visWrap = document.createElement("div");
    visWrap.className = "visuals-block";
    mod.visuals.forEach((v) => visWrap.appendChild(buildVisualCard(v)));
    container.appendChild(visWrap);
  }

  // ---------- Body ----------
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

  // ---------- Teaching panel (objectives + notes + evidence) ----------
  container.appendChild(buildTeachingPanel(mod));
}

// ---------- VISUAL CARD ----------

function buildVisualCard(v) {
  const card = document.createElement("div");
  card.className = "visual-card";

  const isPlaceholder = v.assetStatus && v.assetStatus !== "ready";
  const typeLabel = (v.type || "visual").replace(/([A-Z])/g, " $1").trim();

  card.innerHTML = `
    <div class="visual-frame">
      <div class="visual-placeholder">
        <span class="visual-icon">◫</span>
        <span class="visual-type">${escapeHtml(typeLabel)}</span>
        ${isPlaceholder ? `<span class="visual-status">${escapeHtml(v.assetStatus || "")}</span>` : ""}
      </div>
    </div>
    <div class="visual-meta">
      <h4>${escapeHtml(v.title || "Visual")}</h4>
      <p>${escapeHtml(v.description || "")}</p>
      ${v.learningPurpose ? `<p class="visual-purpose"><strong>Purpose:</strong> ${escapeHtml(v.learningPurpose)}</p>` : ""}
      ${v.caption ? `<p class="visual-caption">${escapeHtml(v.caption)}</p>` : ""}
      ${v.altText ? `<p class="visual-alt"><strong>Alt text:</strong> ${escapeHtml(v.altText)}</p>` : ""}
    </div>
  `;
  return card;
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

  // Visuals
  if (mod.visuals?.length) {
    const visWrap = document.createElement("div");
    visWrap.className = "visuals-block";
    mod.visuals.forEach((v) => visWrap.appendChild(buildVisualCard(v)));
    container.appendChild(visWrap);
  }

  // Prompt
  const prompt = document.createElement("div");
  prompt.className = "scenario-prompt";
  prompt.innerHTML = `<p class="scenario-q">${escapeHtml(mod.prompt || "")}</p>`;
  container.appendChild(prompt);

  // Steps
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

  // Rubric
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

  // Mark-complete button
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

  // Required visuals
  if (c.requiredVisuals?.length) {
    const vis = document.createElement("div");
    vis.className = "rubric";
    vis.innerHTML = `
      <h4>Required evidence</h4>
      <ul>${c.requiredVisuals.map((v) => `<li><strong>${escapeHtml(v.type)}</strong> — ${escapeHtml(v.purpose)}</li>`).join("")}</ul>
    `;
    container.appendChild(vis);
  }

  // Stages
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

  // Rubric
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
// MODULE RENDERERS (unchanged behavior)
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
  return { lesson: "📖", drill: "🎯", scenario: "🧩", portfolio: "🗂️", assess: "🎓", sandbox: "🧪", practical: "⚙" }[type] || "•";
}

function moduleLabel(type) {
  return { lesson: "Lesson", drill: "Drill", scenario: "Scenario", portfolio: "Portfolio", assess: "Assessment", sandbox: "Sandbox", practical: "Supervised Practical" }[type] || "Module";
}

function moduleMeta(mod) {
  if (mod.type === "drill") return `${(mod.steps || []).length} questions`;
  if (mod.type === "lesson") return "Read";
  if (mod.type === "assess") return "Pass to unlock";
  if (mod.type === "portfolio") return "Artifact";
  if (mod.type === "sandbox") return "Free play";
  if (mod.type === "scenario") return "Written response";
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
