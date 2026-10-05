/* ============================================================
   FuturePath — West Africa Career Explorer
   Phase 1 — complete WebXR-ready career explorer.
   No build step. No backend. Runs on GitHub Pages.
   ============================================================ */

// ---------- ECOWAS member states ----------
const ECOWAS = [
  "Benin", "Burkina Faso", "Cabo Verde", "Côte d'Ivoire", "The Gambia",
  "Ghana", "Guinea", "Guinea-Bissau", "Liberia", "Mali", "Niger",
  "Nigeria", "Senegal", "Sierra Leone", "Togo"
];

// ---------- Sector colours ----------
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

// ---------- App state ----------
const state = {
  careers: [],
  sectors: [],
  view: "sectors",       // "sectors" | "careers"
  sector: null,
  country: "ALL",
  plan: loadPlan(),
  meshes: [],
  floating: [],
  openCareer: null
};

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);
const canvas = $("renderCanvas");

// ============================================================
// 1. BABYLON SCENE SETUP
// ============================================================

const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
  antialias: true
});

const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.02, 0.03, 0.06, 1);

// Orbit camera around the ring
const camera = new BABYLON.ArcRotateCamera(
  "camera",
  -Math.PI / 2,
  Math.PI / 2.7,
  30,
  BABYLON.Vector3.Zero(),
  scene
);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 10;
camera.upperRadiusLimit = 60;
camera.lowerBetaLimit = 0.35;
camera.upperBetaLimit = Math.PI / 2.05;
camera.wheelDeltaPercentage = 0.02;
camera.panningSensibility = 0;
camera.useAutoRotationBehavior = true;
camera.autoRotationBehavior.idleRotationSpeed = 0.08;
camera.autoRotationBehavior.idleRotationWaitTime = 5000;
camera.autoRotationBehavior.idleRotationRadius = 30;

// Lights
const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
hemi.intensity = 0.5;
hemi.groundColor = new BABYLON.Color3(0.04, 0.05, 0.09);

const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -2, -1), scene);
dir.intensity = 0.6;

// Glow layer for the neon portal look
const glow = new BABYLON.GlowLayer("glow", scene);
glow.intensity = 1.1;

// Ground
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 140, height: 140 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3(0.02, 0.03, 0.055);
groundMat.specularColor = BABYLON.Color3.Black();
groundMat.emissiveColor = new BABYLON.Color3(0.008, 0.012, 0.024);
ground.material = groundMat;
ground.position.y = -0.02;
ground.isPickable = false;

// ============================================================
// 2. WEBXR
// ============================================================

let xrHelper = null;
let xrSupported = false;

async function initXR() {
  try {
    if (!navigator.xr) return;
    xrSupported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!xrSupported) {
      $("xrBtn").disabled = true;
      $("xrBtn").textContent = "VR not available";
      return;
    }
    xrHelper = await scene.createDefaultXRExperienceAsync({ uiOptions: false });
  } catch (err) {
    console.warn("XR init failed:", err);
    $("xrBtn").disabled = true;
    $("xrBtn").textContent = "VR not available";
  }
}

$("xrBtn").addEventListener("click", async () => {
  if (!xrHelper || !xrSupported) {
    toast("No VR headset detected. The 3D view still works.");
    return;
  }
  try {
    await xrHelper.baseExperience.enterXRAsync("immersive-vr", "local-floor");
  } catch (err) {
    console.warn(err);
    toast("Could not enter VR. The 3D view still works.");
  }
});

// ============================================================
// 3. DATA LOADING
// ============================================================

async function loadCareers() {
  const res = await fetch("./src/data/careers.json");
  if (!res.ok) throw new Error("Could not load careers.json");
  const data = await res.json();

  // Sort careers by sector then name
  data.sort((a, b) => {
    if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
    return a.name.localeCompare(b.name);
  });

  state.careers = data;

  // Derive unique sectors in a stable order
  const seen = new Set();
  state.sectors = [];
  data.forEach((c) => {
    if (!seen.has(c.sector)) {
      seen.add(c.sector);
      state.sectors.push(c.sector);
    }
  });
}

// ---------- Country filter ----------
function matchesCountry(career) {
  if (state.country === "ALL") return true;
  if (career.countries === "ALL") return true;
  return Array.isArray(career.countries) && career.countries.includes(state.country);
}

function careersInSector(sector) {
  return state.careers.filter((c) => c.sector === sector && matchesCountry(c));
}

// ============================================================
// 4. MESH BUILDERS
// ============================================================

function hexToColor3(hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function clearMeshes() {
  state.meshes.forEach((m) => m.dispose());
  state.meshes = [];
  state.floating = [];
}

/**
 * Builds a portal (ring + disc + label) and returns the meshes.
 */
function buildPortal({ text, colorHex, position, scale = 1, onClick }) {
  const color = hexToColor3(colorHex);
  const ringDiameter = 3.4 * scale;

  // Torus ring
  const ring = BABYLON.MeshBuilder.CreateTorus(
    "ring",
    { diameter: ringDiameter, thickness: 0.2 * scale, tessellation: 52 },
    scene
  );
  ring.position = position;
  ring.rotation.x = Math.PI / 2;
  const ringMat = new BABYLON.StandardMaterial("ringMat", scene);
  ringMat.emissiveColor = color;
  ringMat.diffuseColor = color.scale(0.4);
  ringMat.specularColor = BABYLON.Color3.Black();
  ring.material = ringMat;

  // Inner disc
  const disc = BABYLON.MeshBuilder.CreateDisc(
    "disc",
    { radius: ringDiameter * 0.42, tessellation: 52 },
    scene
  );
  disc.position = position;
  disc.rotation.x = -Math.PI / 2;
  const discMat = new BABYLON.StandardMaterial("discMat", scene);
  discMat.emissiveColor = color.scale(0.28);
  discMat.diffuseColor = color.scale(0.1);
  discMat.alpha = 0.9;
  discMat.backFaceCulling = false;
  disc.material = discMat;

  // Label plane
  const labelW = 4.6 * scale;
  const labelH = 1.15 * scale;
  const label = BABYLON.MeshBuilder.CreatePlane("label", { width: labelW, height: labelH }, scene);
  label.position = position.add(new BABYLON.Vector3(0, ringDiameter * 0.78, 0));
  label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

  const dt = new BABYLON.DynamicTexture(
    "dt",
    { width: 1024, height: 256 },
    scene,
    true
  );
  dt.hasAlpha = true;
  dt.drawText(text, null, 130, "bold 66px Inter, system-ui, sans-serif", "#ffffff", "transparent", true);
  const labelMat = new BABYLON.StandardMaterial("labelMat", scene);
  labelMat.diffuseTexture = dt;
  labelMat.emissiveTexture = dt;
  labelMat.opacityTexture = dt;
  labelMat.backFaceCulling = false;
  labelMat.disableLighting = true;
  label.material = labelMat;
  label.isPickable = false;

  // Picking
  [ring, disc].forEach((mesh) => {
    mesh.isPickable = true;
    mesh.actionManager = new BABYLON.ActionManager(scene);
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, onClick)
    );
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
        document.body.style.cursor = "pointer";
        ringMat.emissiveColor = color.scale(1.4);
      })
    );
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
        document.body.style.cursor = "default";
        ringMat.emissiveColor = color;
      })
    );
  });

  state.meshes.push(ring, disc, label);
  state.floating.push({
    ring,
    disc,
    baseY: position.y,
    phase: Math.random() * Math.PI * 2
  });

  return { ring, disc, label };
}

// ============================================================
// 5. VIEWS
// ============================================================

function showSectors() {
  state.view = "sectors";
  state.sector = null;
  clearMeshes();
  closeCard();

  $("breadcrumb").classList.add("hidden");

  const radius = 17;
  const y = 2.6;

  state.sectors.forEach((sector, i) => {
    const angle = (i / state.sectors.length) * Math.PI * 2;
    const pos = new BABYLON.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );
    const color = SECTOR_COLORS[sector] || "#4a90ff";
    const count = careersInSector(sector).length;

    buildPortal({
      text: sector,
      colorHex: color,
      position: pos,
      scale: 1,
      onClick: () => {
        if (count === 0) {
          toast("No careers in this sector for " + countryLabel());
          return;
        }
        showCareers(sector);
      }
    });
  });
}

function showCareers(sector) {
  state.view = "careers";
  state.sector = sector;
  clearMeshes();
  closeCard();

  const list = careersInSector(sector);

  $("breadcrumb").classList.remove("hidden");
  $("crumbText").textContent = sector + " · " + list.length + " careers";

  const color = SECTOR_COLORS[sector] || "#4a90ff";
  const radius = Math.max(9, Math.min(14, 6 + list.length * 0.8));
  const y = 2.6;

  list.forEach((career, i) => {
    const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
    const pos = new BABYLON.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );

    buildPortal({
      text: career.name,
      colorHex: color,
      position: pos,
      scale: 0.85,
      onClick: () => openCard(career)
    });
  });

  // Smooth camera pull-in
  camera.radius = Math.max(14, radius + 10);
}

// ============================================================
// 6. CAREER CARD
// ============================================================

function openCard(career) {
  state.openCareer = career;

  $("cardName").textContent = career.name;

  const countryText =
    career.countries === "ALL"
      ? "All ECOWAS"
      : career.countries.join(", ");

  $("cardMeta").innerHTML = `
    <span class="tag">${career.sector}</span>
    <span class="tag">${career.type}</span>
    <span class="tag">${countryText}</span>
  `;

  $("cardTasks").innerHTML = career.tasks.map((t) => `<li>${t}</li>`).join("");
  $("cardSkills").innerHTML = career.skills
    .map((s) => `<span class="chip">${s}</span>`)
    .join("");
  $("cardPathway").textContent = career.pathway;
  $("cardCert").textContent = career.certification;

  const addBtn = $("addBtn");
  if (state.plan.includes(career.id)) {
    addBtn.textContent = "In your plan ✓";
    addBtn.disabled = true;
  } else {
    addBtn.textContent = "Add to my plan";
    addBtn.disabled = false;
  }

  $("card").classList.remove("hidden");
  $("plan").classList.add("hidden");
}

function closeCard() {
  $("card").classList.add("hidden");
  state.openCareer = null;
}

$("cardClose").addEventListener("click", closeCard);

$("addBtn").addEventListener("click", () => {
  if (!state.openCareer) return;
  addToPlan(state.openCareer);
});

// ============================================================
// 7. PLAN
// ============================================================

function loadPlan() {
  try {
    const raw = localStorage.getItem("futurepath.plan");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlan() {
  try {
    localStorage.setItem("futurepath.plan", JSON.stringify(state.plan));
  } catch {
    /* ignore */
  }
}

function addToPlan(career) {
  if (state.plan.includes(career.id)) return;
  state.plan.push(career.id);
  savePlan();
  updatePlanCount();
  renderPlan();
  toast(career.name + " added to your plan");
  $("addBtn").textContent = "In your plan ✓";
  $("addBtn").disabled = true;
}

function removeFromPlan(id) {
  state.plan = state.plan.filter((x) => x !== id);
  savePlan();
  updatePlanCount();
  renderPlan();
  if (state.openCareer && state.openCareer.id === id) {
    $("addBtn").textContent = "Add to my plan";
    $("addBtn").disabled = false;
  }
}

function updatePlanCount() {
  $("planCount").textContent = state.plan.length;
}

function renderPlan() {
  const list = $("planList");
  const chosen = state.plan
    .map((id) => state.careers.find((c) => c.id === id))
    .filter(Boolean);

  if (!chosen.length) {
    list.innerHTML = `<li class="empty">No careers yet. Click a portal and add one.</li>`;
    return;
  }

  list.innerHTML = chosen
    .map(
      (c) => `
      <li>
        <span>${c.name}<br><small style="color:#7f8ba6">${c.sector}</small></span>
        <button class="remove" data-id="${c.id}" aria-label="Remove">×</button>
      </li>`
    )
    .join("");

  list.querySelectorAll(".remove").forEach((btn) => {
    btn.addEventListener("click", () => removeFromPlan(btn.dataset.id));
  });
}

$("planBtn").addEventListener("click", () => {
  renderPlan();
  $("plan").classList.toggle("hidden");
  if (!$("plan").classList.contains("hidden")) closeCard();
});

$("planClose").addEventListener("click", () => $("plan").classList.add("hidden"));

$("clearBtn").addEventListener("click", () => {
  if (!state.plan.length) return;
  if (!confirm("Clear all careers from your plan?")) return;
  state.plan = [];
  savePlan();
  updatePlanCount();
  renderPlan();
  if (state.openCareer) {
    $("addBtn").textContent = "Add to my plan";
    $("addBtn").disabled = false;
  }
});

$("downloadBtn").addEventListener("click", downloadPlan);

function downloadPlan() {
  const chosen = state.plan
    .map((id) => state.careers.find((c) => c.id === id))
    .filter(Boolean);

  if (!chosen.length) {
    toast("Add at least one career first");
    return;
  }

  const lines = [
    "# My FuturePath Career Plan",
    "",
    "**Generated:** " + new Date().toLocaleString(),
    "**Country focus:** " + (state.country === "ALL" ? "All ECOWAS" : state.country),
    "**Careers chosen:** " + chosen.length,
    "",
    "---",
    ""
  ];

  chosen.forEach((c, i) => {
    const countryText =
      c.countries === "ALL" ? "All ECOWAS" : c.countries.join(", ");

    lines.push(`## ${i + 1}. ${c.name}`);
    lines.push("");
    lines.push(`- **Sector:** ${c.sector}`);
    lines.push(`- **Type:** ${c.type}`);
    lines.push(`- **Countries:** ${countryText}`);
    lines.push("");
    lines.push("**Typical tasks**");
    c.tasks.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
    lines.push(`**Skills to build:** ${c.skills.join(", ")}`);
    lines.push("");
    lines.push(`**Pathway:** ${c.pathway}`);
    lines.push("");
    lines.push(`**Certification:** ${c.certification}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  lines.push("Built with FuturePath — West Africa Career Explorer.");

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "futurepath-career-plan.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Plan downloaded");
}

// ============================================================
// 8. COUNTRY SELECTOR
// ============================================================

function countryLabel() {
  return state.country === "ALL" ? "all countries" : state.country;
}

function buildCountrySelector() {
  const sel = $("countrySelect");
  sel.innerHTML =
    `<option value="ALL">All ECOWAS</option>` +
    ECOWAS.map((c) => `<option value="${c}">${c}</option>`).join("");

  sel.addEventListener("change", () => {
    state.country = sel.value;
    if (state.view === "careers" && state.sector) {
      const list = careersInSector(state.sector);
      if (!list.length) {
        toast("No careers in this sector for " + countryLabel());
        showSectors();
        return;
      }
      showCareers(state.sector);
    } else {
      showSectors();
    }
  });
}

// ============================================================
// 9. UI EVENTS
// ============================================================

$("backBtn").addEventListener("click", showSectors);

// ESC closes panels
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCard();
    $("plan").classList.add("hidden");
  }
});

// Toast helper
let toastTimer = null;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
}

// Hide the hint after the first interaction
let hintHidden = false;
function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  const h = $("hint");
  if (h) {
    h.style.opacity = "0";
    setTimeout(() => h.remove(), 500);
  }
}
canvas.addEventListener("pointerdown", hideHint, { once: true });
canvas.addEventListener("wheel", hideHint, { once: true });

// ============================================================
// 10. ANIMATION LOOP
// ============================================================

let t = 0;
scene.registerBeforeRender(() => {
  const dt = engine.getDeltaTime() / 1000;
  t += dt;

  state.floating.forEach((f) => {
    const y = f.baseY + Math.sin(t * 1.1 + f.phase) * 0.16;
    f.ring.position.y = y;
    f.disc.position.y = y;
    f.ring.rotation.z += 0.0035;
    f.disc.rotation.z -= 0.002;
  });
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

// ============================================================
// 11. BOOT
// ============================================================

(async function boot() {
  try {
    buildCountrySelector();
    await loadCareers();
    updatePlanCount();
    renderPlan();
    showSectors();
    initXR();
    console.log(
      `FuturePath loaded — ${state.careers.length} careers across ${state.sectors.length} sectors.`
    );
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#05080f;color:#e6eefc;font-family:system-ui;padding:24px;text-align:center;z-index:100">
        <div>
          <h2 style="margin:0 0 12px">Could not load careers data</h2>
          <p style="color:#7f8ba6;max-width:420px;line-height:1.6">
            Make sure <code>src/data/careers.json</code> exists and you are serving the site
            over HTTP (GitHub Pages or a local server), not opening the HTML file directly.
          </p>
        </div>
      </div>`
    );
  }
})();
