/* FuturePath — main app orchestration */

import { registerServiceWorker, setupInstallPrompt, canInstall, triggerInstall } from "./pwa.js";
import {
  setContext,
  resetContext,
  renderSkillTree,
  renderSkillPath,
  renderModuleView,
  resetCareer
} from "./learning-engine.js";
import { loadCareer } from "./progress-store.js";

// ---------- State ----------
const state = {
  careers: [],
  curricula: {},
  sectors: [],
  view: null,
  career: null
};

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const view = $("view");
const loader = $("loader");
const breadcrumb = $("breadcrumb");
const crumbPath = $("crumbPath");

// ---------- Bootstrap ----------
(async function boot() {
  registerServiceWorker();
  setupInstallPrompt(() => {});

  try {
    // 1. Load careers index
    const careersRes = await fetch("./src/data/careers.json", { cache: "no-cache" });
    if (!careersRes.ok) throw new Error("Could not load careers.json (HTTP " + careersRes.status + ")");
    state.careers = await careersRes.json();

    // 2. Load curricula manifest (list of available career IDs)
    const indexRes = await fetch("./src/data/curricula/_index.json", { cache: "no-cache" });
    if (!indexRes.ok) throw new Error("Could not load curricula/_index.json (HTTP " + indexRes.status + ")");
    const index = await indexRes.json();
    const careerIds = index.careers || [];

    // 3. Load each authored career file in parallel
    const curriculaFiles = await Promise.all(
      careerIds.map((id) =>
        fetch(`./src/data/curricula/${id}.json`, { cache: "no-cache" })
          .then((r) => {
            if (!r.ok) {
              console.warn(`[FuturePath] Curriculum missing: ${id} (HTTP ${r.status})`);
              return null;
            }
            return r.json();
          })
          .catch((err) => {
            console.error(`[FuturePath] Curriculum failed: ${id}`, err);
            return null;
          })
      )
    );

    // 4. Merge all into state.curricula
    state.curricula = {};
    curriculaFiles.forEach((data) => {
      if (data && typeof data === "object") {
        Object.assign(state.curricula, data);
      }
    });

    // 5. Build sector list
    const seen = new Set();
    state.careers.forEach((c) => {
      if (!seen.has(c.sector)) {
        seen.add(c.sector);
        state.sectors.push(c.sector);
      }
    });
    state.sectors.sort();

    // 6. Sanity log — check this in the browser console
    console.log(
      `[FuturePath] Loaded — ${state.careers.length} careers, ${Object.keys(state.curricula).length} curricula ready`
    );
    console.log("[FuturePath] Curricula IDs:", Object.keys(state.curricula));

    renderSectorsView();
    loader.classList.add("hidden");
  } catch (err) {
    console.error(err);
    loader.innerHTML = `<div style="text-align:center;max-width:400px">
      <h3 style="color:var(--danger)">Could not load data</h3>
      <p style="color:var(--text-dim);font-size:14px">${err.message}<br><br>
      Make sure you're serving over HTTP.</p>
    </div>`;
  }
})();

// ---------- Views ----------

function clearView() {
  view.innerHTML = "";
  view.scrollTop = 0;
  window.scrollTo(0, 0);
}

function setBreadcrumb(parts) {
  if (!parts.length) {
    breadcrumb.classList.add("hidden");
    return;
  }
  breadcrumb.classList.remove("hidden");
  crumbPath.textContent = parts.join(" · ");
  $("crumbBack").onclick = () => {
    if (state.view === "career") renderCareersView(state.career?.sector || null);
    else if (state.view === "careers") renderSectorsView();
  };
}

function renderSectorsView() {
  state.view = "sectors";
  resetContext();
  clearView();
  setBreadcrumb([]);

  const head = document.createElement("div");
  head.className = "page-head";
  head.innerHTML = `
    <span class="eyebrow">Explore</span>
    <h1>Choose a field. Master it.</h1>
    <p>Structured learning paths from orientation to professional mastery. Every skill, every level — built for beginners and professionals alike.</p>
  `;
  view.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "sector-grid";

  const SECTOR_COLORS = {
    "Formal Profession":  "#5b5bd6",
    "Healthcare":         "#e05c7a",
    "Digital & Tech":     "#2ec49a",
    "Trades & Technical": "#c46b1a",
    "Energy":             "#e8b60c",
    "Agriculture":        "#4a8f3c",
    "Food & Hospitality": "#e07a3a",
    "Textiles & Crafts":  "#2e7dd1",
    "Beauty":             "#c0399f",
    "Creative & Media":   "#8e44ad",
    "Business & Trade":   "#1a6bff",
    "Mining & Tourism":   "#6b7280"
  };

  state.sectors.forEach((sector) => {
    const count = state.careers.filter((c) => c.sector === sector).length;
    const card = document.createElement("button");
    card.className = "sector-card";
    card.style.setProperty("--sector-color", SECTOR_COLORS[sector] || "#2ec49a");
    card.innerHTML = `
      <h3>${sector}</h3>
      <p>${count} careers to explore</p>
      <span class="count">${count} careers</span>
    `;
    card.addEventListener("click", () => renderCareersView(sector));
    grid.appendChild(card);
  });

  view.appendChild(grid);
}

function renderCareersView(sector) {
  state.view = "careers";
  resetContext();
  clearView();
  setBreadcrumb([sector]);

  const head = document.createElement("div");
  head.className = "page-head";
  head.innerHTML = `
    <h1>${sector}</h1>
    <p>Pick a career to begin its learning path.</p>
  `;
  view.appendChild(head);

  const careers = state.careers.filter((c) => c.sector === sector);
  const grid = document.createElement("div");
  grid.className = "career-grid";

  careers.forEach((career) => {
    const hasCurriculum = !!state.curricula[career.id];
    const progress = loadCareer(career.id);
    const moduleCount = Object.keys(progress.modules || {}).length;

    const card = document.createElement("button");
    card.className = "career-card";
    card.innerHTML = `
      <h3>${career.name}</h3>
      <div class="meta">
        <span class="tag ${career.type}">${career.type}</span>
        ${hasCurriculum ? '<span class="tag accent">Curriculum ready</span>' : '<span class="tag">Coming soon</span>'}
      </div>
      <div class="career-progress">
        <div class="bar"><span style="width:${moduleCount > 0 ? Math.min(100, moduleCount * 5) : 0}%"></span></div>
        <span class="pct">${moduleCount} modules</span>
      </div>
    `;
    card.addEventListener("click", () => {
      if (!hasCurriculum) {
        toast("This curriculum is coming soon.", "error");
        return;
      }
      renderCareerView(career);
    });
    grid.appendChild(card);
  });

  view.appendChild(grid);
}

function renderCareerView(career) {
  state.view = "career";
  state.career = career;
  clearView();
  setBreadcrumb([career.sector, career.name]);

  setContext({
    career,
    curriculum: state.curricula[career.id],
    onNavigate: {
      toView(name) {
        clearView();
        // return the view element so engine can render into it
        return view;
      },
      toTree() {
        renderCareerView(career);
      }
    }
  });

  renderSkillTree(view);

  // Append "advanced" reset button
  const reset = document.createElement("div");
  reset.style.marginTop = "32px";
  reset.style.paddingTop = "24px";
  reset.style.borderTop = "1px solid var(--border)";
  reset.style.display = "flex";
  reset.style.justifyContent = "flex-end";
  reset.innerHTML = `<button class="btn btn-danger small" id="resetBtn">Reset my progress</button>`;
  view.appendChild(reset);
  reset.querySelector("#resetBtn").addEventListener("click", () => {
    if (!confirm(`Reset all progress for ${career.name}?`)) return;
    resetCareer(career.id);
    renderCareerView(career);
    toast("Progress reset", "success");
  });
}

// ---------- Top bar ----------

$("brandHome").addEventListener("click", renderSectorsView);

$("myLearningBtn").addEventListener("click", () => {
  const inProgress = state.careers.filter((c) => {
    const p = loadCareer(c.id);
    return Object.keys(p.modules || {}).length > 0;
  });
  if (!inProgress.length) {
    toast("You haven't started any careers yet", "error");
    return;
  }
  alert(`In progress:\n\n${inProgress.map((c) => "• " + c.name).join("\n")}\n\n(Full dashboard coming soon)`);
});

$("settingsBtn").addEventListener("click", () => {
  openSettings();
});

function openSettings() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <h2>Settings</h2>

    <div class="modal-section">
      <h3>Install app</h3>
      <p>Install FuturePath on your device. Works offline after the first load.</p>
      <button class="btn btn-accent" id="installBtn">${canInstall() ? "Install now" : "Install not available"}</button>
    </div>

    <div class="modal-section">
      <h3>Data</h3>
      <p>Your progress is stored on this device. Clearing it cannot be undone.</p>
      <button class="btn btn-danger small" id="resetAllBtn">Reset all progress</button>
    </div>

    <div class="modal-actions">
      <button class="btn btn-primary" id="closeModal">Close</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  modal.querySelector("#closeModal").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  modal.querySelector("#installBtn").addEventListener("click", async () => {
    if (!canInstall()) {
      toast("Install not available on this browser", "error");
      return;
    }
    await triggerInstall();
  });

  modal.querySelector("#resetAllBtn").addEventListener("click", () => {
    if (!confirm("Reset ALL progress across every career?")) return;
    localStorage.removeItem("futurepath.progress");
    backdrop.remove();
    renderSectorsView();
    toast("All progress reset", "success");
  });
}

// ---------- Toast ----------

let toastTimer = null;
function toast(msg, kind = "") {
  const el = $("toast");
  el.textContent = msg;
  el.className = "";
  if (kind) el.classList.add(kind);
  clearTimeout(toastTimer);
  requestAnimationFrame(() => el.classList.remove("hidden"));
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}
window.__fpToast = toast;
