/* ============================================================
   FuturePath — Simulation Engine
   Renders interactive career simulations from a data config.
   Round types: CHOICE · MULTI · ORDER · MATCH · SLIDER · TAP
   ============================================================ */

const $ = (id) => document.getElementById(id);

// ---------- Local storage: completed sims ----------
const COMPLETED_KEY = "futurepath.completed";

export function loadCompleted() {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCompleted(map) {
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function isCompleted(careerId) {
  return !!loadCompleted()[careerId];
}

// ---------- Engine state ----------
const engineState = {
  career: null,
  sim: null,
  roundIndex: 0,
  roundScores: [],
  roundDetails: [],
  draft: null,       // current round's answer
  checked: false,    // whether current round is submitted
  onFinish: null
};

// ============================================================
// PUBLIC API
// ============================================================

export function startSimulation({ career, sim, onFinish }) {
  engineState.career = career;
  engineState.sim = sim;
  engineState.roundIndex = 0;
  engineState.roundScores = [];
  engineState.roundDetails = [];
  engineState.draft = null;
  engineState.checked = false;
  engineState.onFinish = onFinish;

  $("simTitle").textContent = career.name;
  $("simIntro").textContent = sim.intro || "Work through each round. You'll get feedback after every answer.";
  $("simLayer").classList.remove("hidden");
  $("sumLayer").classList.add("hidden");

  renderRound();
}

export function closeSimulation() {
  $("simLayer").classList.add("hidden");
  $("sumLayer").classList.add("hidden");
  engineState.career = null;
  engineState.sim = null;
}

// ============================================================
// RENDER ROUND
// ============================================================

function renderRound() {
  const { sim, roundIndex } = engineState;
  const round = sim.rounds[roundIndex];

  // Reset round state
  engineState.draft = initialDraft(round);
  engineState.checked = false;

  // Progress
  const total = sim.rounds.length;
  const pct = (roundIndex / total) * 100;
  $("simProgressFill").style.width = pct + "%";
  $("simProgressText").textContent = `Round ${roundIndex + 1} of ${total}`;

  // Hide feedback
  $("simFeedback").classList.add("hidden");
  $("simFeedback").classList.remove("wrong");

  // Render prompt + stage
  const stage = $("simStage");
  stage.innerHTML = "";

  const prompt = document.createElement("p");
  prompt.className = "sim-intro";
  prompt.style.marginBottom = "16px";
  prompt.style.color = "#e6eefc";
  prompt.style.fontSize = "15px";
  prompt.textContent = round.q;
  stage.appendChild(prompt);

  const body = document.createElement("div");
  stage.appendChild(body);

  // Dispatch by type
  switch (round.t) {
    case "CHOICE": renderChoice(body, round); break;
    case "MULTI":  renderMulti(body, round);  break;
    case "ORDER":  renderOrder(body, round);  break;
    case "MATCH":  renderMatch(body, round);  break;
    case "SLIDER": renderSlider(body, round); break;
    case "TAP":    renderTap(body, round);    break;
    default:
      body.innerHTML = `<p style="color:#e05c7a">Unknown round type: ${round.t}</p>`;
  }

  // Footer button
  const next = $("simNext");
  next.disabled = true;
  next.textContent = "Check";
  next.onclick = onNextClick;

  updateScoreDisplay();
}

function updateScoreDisplay() {
  const current = engineState.roundScores.reduce((a, b) => a + b, 0);
  const count = engineState.roundScores.length;
  const avg = count ? Math.round(current / count) : 0;
  $("simScore").textContent = avg;
}

// ============================================================
// DRAFT INIT
// ============================================================

function initialDraft(round) {
  switch (round.t) {
    case "CHOICE": return { picked: null };
    case "MULTI":  return { picked: new Set() };
    case "ORDER":  return { order: shuffled(round.items.map((_, i) => i)) };
    case "MATCH":  return { pairs: {}, activeLeft: null };
    case "SLIDER": return { values: round.sliders.map((s) => Math.round((s.min + s.max) / 2)) };
    case "TAP":    return { picked: new Set() };
    default:       return {};
  }
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Ensure it's not accidentally already correct for small arrays
  if (a.length > 1 && a.every((v, i) => v === i)) {
    [a[0], a[1]] = [a[1], a[0]];
  }
  return a;
}

// ============================================================
// RENDERERS
// ============================================================

// ---------- CHOICE ----------
function renderChoice(container, round) {
  const grid = document.createElement("div");
  grid.className = "opt-grid";

  round.o.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "opt";
    btn.type = "button";
    btn.dataset.index = i;
    btn.innerHTML = `<span class="mark">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(text)}</span>`;

    btn.addEventListener("click", () => {
      if (engineState.checked) return;
      engineState.draft.picked = i;
      grid.querySelectorAll(".opt").forEach((el) => el.classList.remove("selected"));
      btn.classList.add("selected");
      $("simNext").disabled = false;
    });

    grid.appendChild(btn);
  });

  container.appendChild(grid);
}

// ---------- MULTI ----------
function renderMulti(container, round) {
  const grid = document.createElement("div");
  grid.className = "opt-grid";

  round.o.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "opt";
    btn.type = "button";
    btn.dataset.index = i;
    btn.innerHTML = `<span class="mark">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(text)}</span>`;

    btn.addEventListener("click", () => {
      if (engineState.checked) return;
      if (engineState.draft.picked.has(i)) {
        engineState.draft.picked.delete(i);
        btn.classList.remove("selected");
      } else {
        engineState.draft.picked.add(i);
        btn.classList.add("selected");
      }
      $("simNext").disabled = engineState.draft.picked.size === 0;
    });

    grid.appendChild(btn);
  });

  container.appendChild(grid);
}

// ---------- ORDER ----------
function renderOrder(container, round) {
  const list = document.createElement("div");
  list.className = "order-list";

  function rebuild() {
    list.innerHTML = "";
    engineState.draft.order.forEach((originalIndex, position) => {
      const item = document.createElement("div");
      item.className = "order-item";
      item.draggable = !engineState.checked;
      item.dataset.pos = position;
      item.innerHTML = `
        <span class="pos">${position + 1}</span>
        <span>${escapeHtml(round.items[originalIndex])}</span>
        <span class="grip">⋮⋮</span>
      `;

      if (!engineState.checked) {
        item.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", position);
          item.classList.add("dragging");
        });
        item.addEventListener("dragend", () => item.classList.remove("dragging"));
        item.addEventListener("dragover", (e) => {
          e.preventDefault();
          item.classList.add("over");
        });
        item.addEventListener("dragleave", () => item.classList.remove("over"));
        item.addEventListener("drop", (e) => {
          e.preventDefault();
          item.classList.remove("over");
          const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
          const to = position;
          if (from === to) return;
          const ord = engineState.draft.order;
          const [moved] = ord.splice(from, 1);
          ord.splice(to, 0, moved);
          rebuild();
        });

        // Touch / click fallback: tap to move up
        item.addEventListener("click", () => {
          if (position === 0) return;
          const ord = engineState.draft.order;
          [ord[position - 1], ord[position]] = [ord[position], ord[position - 1]];
          rebuild();
        });
      }

      list.appendChild(item);
    });
  }

  rebuild();
  container.appendChild(list);

  const hint = document.createElement("p");
  hint.style.cssText = "font-size:11.5px;color:#6c7a96;margin:12px 0 0";
  hint.textContent = "Drag to reorder, or tap an item to move it up.";
  container.appendChild(hint);

  $("simNext").disabled = false;
}

// ---------- MATCH ----------
function renderMatch(container, round) {
  const wrap = document.createElement("div");
  wrap.className = "match-wrap";

  const leftCol = document.createElement("div");
  leftCol.className = "match-col";
  leftCol.innerHTML = `<h4>${round.leftLabel || "Column A"}</h4>`;

  const rightCol = document.createElement("div");
  rightCol.className = "match-col";
  rightCol.innerHTML = `<h4>${round.rightLabel || "Column B"}</h4>`;

  // Shuffle right side for display, keep track of original index
  const rightOrder = shuffled(round.right.map((_, i) => i));

  round.left.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "match-item";
    btn.dataset.left = i;
    btn.textContent = text;
    btn.addEventListener("click", () => onLeftClick(i, btn));
    leftCol.appendChild(btn);
  });

  rightOrder.forEach((originalIndex) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "match-item";
    btn.dataset.right = originalIndex;
    btn.textContent = round.right[originalIndex];
    btn.addEventListener("click", () => onRightClick(originalIndex, btn));
    rightCol.appendChild(btn);
  });

  wrap.appendChild(leftCol);
  wrap.appendChild(rightCol);
  container.appendChild(wrap);

  function onLeftClick(i, btn) {
    if (engineState.checked) return;
    // If already paired, unpair
    if (engineState.draft.pairs[i] != null) {
      const oldRight = engineState.draft.pairs[i];
      delete engineState.draft.pairs[i];
      btn.classList.remove("paired");
      const rightBtn = rightCol.querySelector(`.match-item[data-right="${oldRight}"]`);
      if (rightBtn) {
        rightBtn.classList.remove("paired");
        rightBtn.innerHTML = escapeHtml(round.right[oldRight]);
      }
      return;
    }
    engineState.draft.activeLeft = i;
    leftCol.querySelectorAll(".match-item").forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
  }

  function onRightClick(j, btn) {
    if (engineState.checked) return;
    const leftIndex = engineState.draft.activeLeft;
    if (leftIndex == null) return;
    if (Object.values(engineState.draft.pairs).includes(j)) return; // already paired

    engineState.draft.pairs[leftIndex] = j;

    const leftBtn = leftCol.querySelector(`.match-item[data-left="${leftIndex}"]`);
    if (leftBtn) {
      leftBtn.classList.remove("active");
      leftBtn.classList.add("paired");
    }
    btn.classList.add("paired");

    engineState.draft.activeLeft = null;

    const total = Object.keys(engineState.draft.pairs).length;
    $("simNext").disabled = total < round.left.length;
  }
}

// ---------- SLIDER ----------
function renderSlider(container, round) {
  const list = document.createElement("div");
  list.className = "slider-list";

  round.sliders.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "slider-row";
    row.dataset.index = i;

    const value = engineState.draft.values[i];
    const unit = s.unit || "";

    row.innerHTML = `
      <label>
        <span>${escapeHtml(s.label)}</span>
        <strong data-value>${value}${unit}</strong>
      </label>
      <input type="range" min="${s.min}" max="${s.max}" step="${s.step || 1}" value="${value}" />
      <div class="range-hint">
        <span>${s.min}${unit}</span>
        <span>${s.max}${unit}</span>
      </div>
    `;

    const input = row.querySelector("input");
    input.addEventListener("input", () => {
      if (engineState.checked) return;
      const v = parseInt(input.value, 10);
      engineState.draft.values[i] = v;
      row.querySelector("[data-value]").textContent = v + unit;
    });

    list.appendChild(row);
  });

  container.appendChild(list);
  $("simNext").disabled = false;
}

// ---------- TAP ----------
function renderTap(container, round) {
  const cols = round.cols || 3;
  const grid = document.createElement("div");
  grid.className = `tap-grid cols-${cols}`;

  round.tiles.forEach((tile, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tap-tile";
    btn.dataset.index = i;
    btn.innerHTML = `
      ${tile.glyph ? `<span class="glyph">${tile.glyph}</span>` : ""}
      <span>${escapeHtml(tile.label)}</span>
    `;

    btn.addEventListener("click", () => {
      if (engineState.checked) return;
      if (engineState.draft.picked.has(i)) {
        engineState.draft.picked.delete(i);
        btn.classList.remove("selected");
      } else {
        engineState.draft.picked.add(i);
        btn.classList.add("selected");
      }
      $("simNext").disabled = engineState.draft.picked.size === 0;
    });

    grid.appendChild(btn);
  });

  container.appendChild(grid);
}

// ============================================================
// CHECK / SCORE
// ============================================================

function onNextClick() {
  if (!engineState.checked) {
    checkRound();
  } else {
    advance();
  }
}

function checkRound() {
  const round = engineState.sim.rounds[engineState.roundIndex];
  const result = scoreRound(round, engineState.draft);

  engineState.checked = true;
  engineState.roundScores.push(result.score);
  engineState.roundDetails.push({
    prompt: round.q,
    correct: result.correct,
    feedback: result.feedback,
    score: result.score
  });

  // Visual marking
  markRound(round, result);

  // Show feedback
  const fb = $("simFeedback");
  const icon = $("simFbIcon");
  const title = $("simFbTitle");
  const text = $("simFbText");

  fb.classList.toggle("wrong", !result.correct);
  icon.textContent = result.correct ? "✓" : "✕";
  title.textContent = result.correct ? "Correct" : "Not quite";
  text.textContent = result.feedback || (result.correct ? "Well done." : "Review this step.");
  fb.classList.remove("hidden");

  updateScoreDisplay();

  const next = $("simNext");
  const isLast = engineState.roundIndex === engineState.sim.rounds.length - 1;
  next.textContent = isLast ? "See results" : "Next round";
  next.disabled = false;
}

function markRound(round, result) {
  const stage = $("simStage");

  if (round.t === "CHOICE") {
    const buttons = stage.querySelectorAll(".opt");
    buttons.forEach((btn, i) => {
      btn.classList.add("locked");
      if (i === round.c) btn.classList.add("correct");
      else if (i === engineState.draft.picked) btn.classList.add("wrong");
    });
  }

  if (round.t === "MULTI") {
    const buttons = stage.querySelectorAll(".opt");
    const correctSet = new Set(round.c);
    buttons.forEach((btn, i) => {
      btn.classList.add("locked");
      const picked = engineState.draft.picked.has(i);
      const isCorrect = correctSet.has(i);
      if (isCorrect) btn.classList.add("correct");
      else if (picked) btn.classList.add("wrong");
    });
  }

  if (round.t === "ORDER") {
    const items = stage.querySelectorAll(".order-item");
    items.forEach((item, position) => {
      const originalIndex = engineState.draft.order[position];
      if (originalIndex === position) item.classList.add("correct");
      else item.classList.add("wrong");
    });
  }

  if (round.t === "MATCH") {
    stage.querySelectorAll(".match-item").forEach((el) => el.classList.add("locked"));
    const leftButtons = stage.querySelectorAll(".match-item[data-left]");
    leftButtons.forEach((btn) => {
      const li = parseInt(btn.dataset.left, 10);
      const paired = engineState.draft.pairs[li];
      const ok = paired === li;
      btn.classList.remove("paired", "active");
      if (ok) btn.classList.add("paired");
      else if (paired != null) btn.classList.add("wrong");
    });
    // Auto-fill correct pairs in a subtle way
    const rightButtons = stage.querySelectorAll(".match-item[data-right]");
    rightButtons.forEach((btn) => {
      const ri = parseInt(btn.dataset.right, 10);
      const isCorrect = round.left.some((_, li) => li === ri);
      if (isCorrect) {
        btn.classList.remove("paired");
        if (engineState.draft.pairs[ri] !== ri) btn.classList.add("paired");
      }
    });
  }

  if (round.t === "SLIDER") {
    round.sliders.forEach((s, i) => {
      const row = stage.querySelector(`.slider-row[data-index="${i}"]`);
      const v = engineState.draft.values[i];
      const hit = v >= s.target[0] && v <= s.target[1];
      row.classList.add(hit ? "hit" : "miss");
      const targetLine = document.createElement("div");
      targetLine.className = "target-line";
      targetLine.textContent = `Target range: ${s.target[0]}${s.unit || ""} – ${s.target[1]}${s.unit || ""}`;
      row.appendChild(targetLine);
      row.querySelector("input").disabled = true;
    });
  }

  if (round.t === "TAP") {
    const buttons = stage.querySelectorAll(".tap-tile");
    const correctSet = new Set(round.c);
    buttons.forEach((btn, i) => {
      btn.classList.add("locked");
      const picked = engineState.draft.picked.has(i);
      const isCorrect = correctSet.has(i);
      if (isCorrect) btn.classList.add("correct");
      else if (picked) btn.classList.add("wrong");
    });
  }
}

// ============================================================
// SCORING
// ============================================================

function scoreRound(round, draft) {
  switch (round.t) {
    case "CHOICE": {
      const ok = draft.picked === round.c;
      return { correct: ok, score: ok ? 100 : 0, feedback: round.f };
    }
    case "MULTI": {
      const correctSet = new Set(round.c);
      const picked = draft.picked;
      let hits = 0, misses = 0;
      picked.forEach((i) => {
        if (correctSet.has(i)) hits++;
        else misses++;
      });
      const total = correctSet.size;
      const raw = Math.max(0, hits - misses);
      const score = Math.round((raw / total) * 100);
      return { correct: score >= 100, score, feedback: round.f };
    }
    case "ORDER": {
      const ord = draft.order;
      let correctPositions = 0;
      ord.forEach((originalIndex, position) => {
        if (originalIndex === position) correctPositions++;
      });
      const score = Math.round((correctPositions / ord.length) * 100);
      return { correct: score === 100, score, feedback: round.f };
    }
    case "MATCH": {
      const pairs = draft.pairs;
      let correct = 0;
      Object.entries(pairs).forEach(([l, r]) => {
        if (parseInt(l, 10) === r) correct++;
      });
      const total = round.left.length;
      const score = Math.round((correct / total) * 100);
      return { correct: score === 100, score, feedback: round.f };
    }
    case "SLIDER": {
      let hits = 0;
      round.sliders.forEach((s, i) => {
        const v = draft.values[i];
        if (v >= s.target[0] && v <= s.target[1]) hits++;
      });
      const score = Math.round((hits / round.sliders.length) * 100);
      return { correct: score === 100, score, feedback: round.f };
    }
    case "TAP": {
      const correctSet = new Set(round.c);
      const picked = draft.picked;
      let hits = 0, misses = 0;
      picked.forEach((i) => {
        if (correctSet.has(i)) hits++;
        else misses++;
      });
      const raw = Math.max(0, hits - misses);
      const score = Math.round((raw / correctSet.size) * 100);
      return { correct: score >= 100, score, feedback: round.f };
    }
    default:
      return { correct: false, score: 0, feedback: "" };
  }
}

// ============================================================
// ADVANCE
// ============================================================

function advance() {
  const total = engineState.sim.rounds.length;
  if (engineState.roundIndex < total - 1) {
    engineState.roundIndex++;
    renderRound();
  } else {
    showSummary();
  }
}

// ============================================================
// SUMMARY
// ============================================================

function showSummary() {
  const { career, sim, roundScores, roundDetails } = engineState;

  const avg = Math.round(roundScores.reduce((a, b) => a + b, 0) / roundScores.length);

  $("sumTitle").textContent = career.name;
  $("sumPct").textContent = avg;

  // Ring fill: circumference of r=52 is ~327
  const ring = $("sumRingFill");
  const offset = 327 - (avg / 100) * 327;
  ring.style.strokeDashoffset = "327";
  ring.style.stroke = avg >= 80 ? "#2ec49a" : avg >= 50 ? "#e8b60c" : "#e05c7a";
  // Trigger transition
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = offset;
  });

  // Verdict
  let verdict = "";
  if (avg >= 90) verdict = "Outstanding. You have a strong instinct for this work.";
  else if (avg >= 70) verdict = "Solid. You understood the core of this career.";
  else if (avg >= 50) verdict = "You got the basics. A bit more practice and you'd be confident.";
  else verdict = "This one needs more study — but now you know what it involves.";

  $("sumVerdict").textContent = verdict;

  // Right / grow lists
  const rightList = $("sumRight");
  const growList = $("sumGrow");
  rightList.innerHTML = "";
  growList.innerHTML = "";

  roundDetails.forEach((d, i) => {
    if (d.correct) {
      const li = document.createElement("li");
      li.textContent = d.feedback || `Round ${i + 1}: correct.`;
      rightList.appendChild(li);
    } else {
      const li = document.createElement("li");
      li.textContent = d.feedback || `Round ${i + 1}: review this step.`;
      growList.appendChild(li);
    }
  });

  if (!rightList.children.length) {
    const li = document.createElement("li");
    li.textContent = "Keep practising — everyone starts somewhere.";
    rightList.appendChild(li);
  }
  if (!growList.children.length) {
    const li = document.createElement("li");
    li.textContent = "Nothing to fix here. You nailed every round.";
    growList.appendChild(li);
  }

  // Next step
  const nextStep = career.pathway || "Find a training programme near you.";
  $("sumNextStep").textContent = nextStep;

  // Buttons
  const addBtn = $("sumAdd");
  const alreadyInPlan = engineState.onFinish && engineState.onFinish.isInPlan(career.id);
  if (alreadyInPlan) {
    addBtn.textContent = "In your plan ✓";
    addBtn.disabled = true;
  } else {
    addBtn.textContent = "Add to my plan";
    addBtn.disabled = false;
  }

  addBtn.onclick = () => {
    if (engineState.onFinish) engineState.onFinish.addToPlan(career);
    addBtn.textContent = "In your plan ✓";
    addBtn.disabled = true;
  };

  $("sumRetry").onclick = () => {
    startSimulation({
      career,
      sim,
      onFinish: engineState.onFinish
    });
  };

  $("sumClose").onclick = () => {
    markComplete(career.id);
    closeSimulation();
    if (engineState.onFinish && engineState.onFinish.onClose) {
      engineState.onFinish.onClose(career.id);
    }
  };

  // Mark complete on the storage side
  markComplete(career.id);

  $("simLayer").classList.add("hidden");
  $("sumLayer").classList.remove("hidden");
}

function markComplete(careerId) {
  const map = loadCompleted();
  const prev = map[careerId];
  const rounds = engineState.roundScores;
  const avg = Math.round(rounds.reduce((a, b) => a + b, 0) / rounds.length);
  if (!prev || avg > prev.bestScore) {
    map[careerId] = { bestScore: avg, at: Date.now(), attempts: (prev?.attempts || 0) + 1 };
  } else {
    map[careerId] = { ...prev, at: Date.now(), attempts: prev.attempts + 1 };
  }
  saveCompleted(map);
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
