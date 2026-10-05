/* ============================================================
   FuturePath — Learning Engine
   Renders skill trees, level paths, and all module types.
   ============================================================ */

import { loadCareer, recordModule, getModuleScore, resetCareer } from "./progress-store.js";

export const LEVELS = [
  { name: "Orientation",  desc: "Understand what this skill is and why it matters." },
  { name: "Foundations",  desc: "Learn the core concepts and vocabulary." },
  { name: "Guided",       desc: "Practice with step-by-step support." },
  { name: "Applied",      desc: "Apply it in realistic scenarios without hints." },
  { name: "Proficient",   desc: "Handle variations and pressure with confidence." }
];

export const MODULE_TYPES = {
  LESSON: "lesson",
  DRILL: "drill",
  SCENARIO: "scenario",
  PORTFOLIO: "portfolio",
  ASSESS: "assess",
  SANDBOX: "sandbox"
};

// ============================================================
// STATE (per-navigation)
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
  const progress = loadCareer(ctx.career.id);
  const domains = ctx.curriculum.skillDomains || [];

  // Summary
  const totals = computeTotals(domains, ctx.career.id);
  const summary = document.createElement("div");
  summary.className = "career-hero";
  summary.innerHTML = `
    <span class="eyebrow">Learning Path</span>
    <h1>${ctx.career.name}</h1>
    <div class="hero-meta">
      <span class="tag">${ctx.career.sector}</span>
      <span class="tag ${ctx.career.type}">${ctx.career.type}</span>
      <span class="tag">${ctx.career.countries === "ALL" ? "All ECOWAS" : ctx.career.countries.join(", ")}</span>
    </div>
    <p>${ctx.curriculum.intro || ""}</p>
    <div class="hero-stats">
      <div class="hero-stat"><strong>${totals.skills}</strong><span>Skills</span></div>
      <div class="hero-stat"><strong>${totals.modules}</strong><span>Modules</span></div>
      <div class="hero-stat"><strong>${totals.completedPct}%</strong><span>Complete</span></div>
    </div>
  `;
  container.appendChild(summary);

  // Domains
  const domainWrap = document.createElement("div");
  domains.forEach((domain) => {
    domainWrap.appendChild(buildDomainCard(domain));
  });
  container.appendChild(domainWrap);
}

function buildDomainCard(domain) {
  const card = document.createElement("div");
  card.className = "domain-card";

  const dPct = computeDomainProgress(domain, ctx.career.id);

  const head = document.createElement("div");
  head.className = "domain-head";
  head.innerHTML = `
    <div>
      <h3>${domain.name}</h3>
      <p class="domain-desc">${domain.description || ""}</p>
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
        <span class="skill-name">${skill.name}</span>
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
  return card;
}

// ============================================================
// SKILL PATH VIEW (levels within a skill)
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
    <button class="btn btn-link" id="backToTree">← Back to skills</button>
    <h2>${skill.name}</h2>
    <p class="lead">${skill.description || ""}</p>
    <div class="skill-path-progress">
      <div class="bar"><span style="width:${skillPct}%"></span></div>
      <span>${skillPct}% · ${LEVELS[Math.min(currentLevel, LEVELS.length - 1)].name}</span>
    </div>
  `;
  container.appendChild(head);
  head.querySelector("#backToTree").addEventListener("click", () => {
    ctx.onNavigate.toTree();
  });

  const ladder = document.createElement("div");
  ladder.className = "level-ladder";

  LEVELS.forEach((level, levelIdx) => {
    const levelData = skill.levels?.[levelIdx];
    if (!levelData) return;

    const levelPct = computeLevelProgress(skill, levelIdx, ctx.career.id);
    const isLocked = levelIdx > currentLevel;
    const isCurrent = levelIdx === currentLevel;
    const isDone = levelPct >= 100;

    const row = document.createElement("div");
    row.className = "level-row" +
      (isLocked ? " locked" : "") +
      (isCurrent ? " current" : "") +
      (isDone ? " done" : "");

    row.innerHTML = `
      <div class="level-dot">${isDone ? "✓" : levelIdx + 1}</div>
      <div class="level-body">
        <div class="level-head">
          <strong>${level.name}</strong>
          ${isLocked ? '<span class="lock-tag">Locked</span>' : ""}
          ${isCurrent ? '<span class="current-tag">Current</span>' : ""}
        </div>
        <p class="level-desc">${level.desc}</p>
        <div class="level-modules"></div>
      </div>
    `;

    const modsWrap = row.querySelector(".level-modules");
    const modules = levelData.modules || [];

    modules.forEach((mod, modIdx) => {
      const mKey = moduleKey(skill.id, levelIdx, mod.id);
      const mScore = getModuleScore(ctx.career.id, mKey);
      const modLocked = isLocked || (modIdx > 0 && getModuleScore(ctx.career.id, moduleKey(skill.id, levelIdx, modules[modIdx - 1].id)) < 100);

      const modRow = document.createElement("button");
      modRow.className = "module-row" + (modLocked ? " locked" : "");
      modRow.disabled = modLocked;
      modRow.innerHTML = `
        <span class="module-icon">${moduleIcon(mod.type)}</span>
        <span class="module-name">${mod.title}</span>
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
  const skill = ctx.skill;
  const level = LEVELS[ctx.levelIndex];

  const head = document.createElement("div");
  head.className = "module-header";
  head.innerHTML = `
    <button class="btn btn-link" id="backToPath">← ${skill.name}</button>
    <div style="margin-top:8px">
      <span class="module-badge">${moduleLabel(mod.type)}</span>
      <h2>${mod.title}</h2>
      <p style="margin:6px 0 0;color:var(--text-muted);font-size:13px">${level.name} · ${skill.name}</p>
    </div>
  `;
  container.appendChild(head);
  head.querySelector("#backToPath").addEventListener("click", () => {
    renderSkillPath();
  });

  const body = document.createElement("div");
  body.className = "module-body";
  container.appendChild(body);

  switch (mod.type) {
    case MODULE_TYPES.LESSON:    return renderLesson(body, mod);
    case MODULE_TYPES.DRILL:     return renderDrill(body, mod);
    case MODULE_TYPES.SCENARIO:  return renderScenario(body, mod);
    case MODULE_TYPES.PORTFOLIO: return renderPortfolio(body, mod);
    case MODULE_TYPES.ASSESS:    return renderAssessment(body, mod);
    case MODULE_TYPES.SANDBOX:   return renderSandbox(body, mod);
  }
}

// ---------- LESSON ----------

function renderLesson(container, mod) {
  const content = document.createElement("div");
  content.className = "lesson-content";
  content.innerHTML = mod.content || "<p>Lesson content coming soon.</p>";
  container.appendChild(content);

  const actions = document.createElement("div");
  actions.className = "module-actions";
  actions.innerHTML = `<button class="btn btn-primary" id="lessonDone">Mark as read</button>`;
  container.appendChild(actions);

  actions.querySelector("#lessonDone").addEventListener("click", () => {
    complete(mod, 100);
  });
}

// ---------- DRILL ----------

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
          ${passed
            ? "You're ready to move on."
            : `You need ${passing}% to pass. Repeat the drill.`}
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

// ---------- SCENARIO ----------

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

// ---------- PORTFOLIO ----------

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

// ---------- ASSESSMENT ----------

function renderAssessment(container, mod) {
  // Reuses drill renderer but with mandatory pass
  renderDrill(container, {
    ...mod,
    passingScore: mod.passingScore || 80
  });
}

// ---------- SANDBOX ----------

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

  actions.querySelector("#explored").addEventListener("click", () => {
    complete(mod, 100);
  });
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
  return { lesson: "📖", drill: "🎯", scenario: "🧩", portfolio: "🗂️", assess: "🎓", sandbox: "🧪" }[type] || "•";
}

function moduleLabel(type) {
  return { lesson: "Lesson", drill: "Drill", scenario: "Scenario", portfolio: "Portfolio", assess: "Assessment", sandbox: "Sandbox" }[type] || "Module";
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
