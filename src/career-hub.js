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

// ---------- Layout constants ----------
const PORTAL_Y = 1.9;          // height of portal centres
const SECTOR_RADIUS = 17;
const PORTAL_SCALE_SECTOR = 1.0;
const PORTAL_SCALE_CAREER = 0.85;
const CAMERA_IDLE_SPEED = 0.05;
const CAMERA_IDLE_WAIT_MS = 6000;

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
  openCareer: null,
  cameraAnimating: false
};

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);
const canvas = $("renderCanvas");

// ============================================================
// 0. LOADING INDICATOR
// ============================================================

function createLoader() {
  const el = document.createElement("div");
  el.id = "fpLoader";
  el.textContent = "Loading FuturePath…";
  el.style.cssText = [
    "position:fixed", "inset:0", "z-index:60",
    "display:flex", "align-items:center", "justify-content:center",
    "background:#05080f", "color:#9fb0cc",
    "font-family:system-ui,-apple-system,sans-serif",
    "font-size:14px", "letter-spacing:0.06em",
    "transition:opacity 0.4s ease"
  ].join(";");
  document.body.appendChild(el);
  return el;
}

function hideLoader(el) {
  if (!el) return;
  el.style.opacity = "0";
  setTimeout(() => el.remove(), 450);
}

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
camera.lowerRadiusLimit = 8;
camera.upperRadiusLimit = 65;
camera.lowerBetaLimit = 0.35;
camera.upperBetaLimit = Math.PI / 2.05;
camera.wheelDeltaPercentage = 0.02;
camera.panningSensibility = 0;
camera.useAutoRotationBehavior = true;
if (camera.autoRotationBehavior) {
  camera.autoRotationBehavior.idleRotationSpeed = CAMERA_IDLE_SPEED;
  camera.autoRotationBehavior.idleRotationWaitTime = CAMERA_IDLE_WAIT_MS;
}

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
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 160, height: 160 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3(0.02, 0.03, 0.055);
groundMat.specularColor = BABYLON.Color3.Black();
groundMat.emissiveColor = new BABYLON.Color3(0.008, 0.012, 0.024);
ground.material = groundMat;
ground.position.y = -0.02;
ground.isPickable = false;

// ---------- Starfield ----------
function createStarfield() {
  const positions = [];
  const COUNT = 900;
  for (let i = 0; i < COUNT; i++) {
    const r = 70 + Math.random() * 90;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = Math.abs(r * Math.cos(phi)) * 0.7 + 4;
    const z = r * Math.sin(phi) * Math.sin(theta);
    positions.push(x, y, z);
  }
  const mesh = new BABYLON.Mesh("stars", scene);
  const vd = new BABYLON.VertexData();
  vd.positions = positions;
  vd.applyToMesh(mesh);

  const mat = new BABYLON.StandardMaterial("starsMat", scene);
  mat.emissiveColor = new BABYLON.Color3(0.55, 0.65, 0.95);
  mat.diffuseColor = BABYLON.Color3.Black();
  mat.specularColor = BABYLON.Color3.Black();
  mat.pointsCloud = true;
  mat.pointSize = 2.4;
  mat.disableLighting = true;
  mesh.material = mat;
  mesh.isPickable = false;
  mesh.infiniteDistance = true;
  mesh.renderingGroupId = 0;
  return mesh;
}
createStarfield();

// ============================================================
// 2. WEBXR
// ============================================================

let xrHelper = null;
let xrSupported = false;

async function initXR() {
  const btn = $("xrBtn");
  try {
    if (!navigator.xr) {
      btn.disabled = true;
      btn.textContent = "VR not available";
      return;
    }
    xrSupported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!xrSupported) {
      btn.disabled = true;
      btn.textContent = "VR not available";
      return;
    }
    xrHelper = await scene.createDefaultXRExperienceAsync({ uiOptions: false });
  } catch (err) {
    console.warn("XR init failed:", err);
    btn.disabled = true;
    btn.textContent = "VR not available";
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
  const res = await fetch("./src/data/careers.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("Could not load careers.json (HTTP " + res.status + ")");
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error("careers.json is empty or malformed");

  data.sort((a, b) => {
    if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
    return a.name.localeCompare(b.name);
  });

  state.careers = data;

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
// 4. CAMERA ANIMATION HELPERS
// ============================================================

function animateCameraTo({ radius, alpha, beta }, duration = 900) {
  const fps = 60;
  const frames = Math.max(1, Math.round((duration / 1000) * fps));
  const ease = new BABYLON.CubicEase();
  ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

  if (typeof radius === "number") {
    BABYLON.Animation.CreateAndStartAnimation(
      "camRadius", camera, "radius", fps, frames,
      camera.radius, radius,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease
    );
  }
  if (typeof alpha === "number") {
    let target = alpha;
    // Take shortest path around the circle
    while (target - camera.alpha > Math.PI) target -= Math.PI * 2;
    while (target - camera.alpha < -Math.PI) target += Math.PI * 2;
    BABYLON.Animation.CreateAndStartAnimation(
      "camAlpha", camera, "alpha", fps, frames,
      camera.alpha, target,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease
    );
  }
  if (typeof beta === "number") {
    BABYLON.Animation.CreateAndStartAnimation(
      "camBeta", camera, "beta", fps, frames,
      camera.beta, beta,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease
    );
  }
}

function pauseAutoRotation() {
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationWaitTime = Number.MAX_SAFE_INTEGER;
  }
}

function resumeAutoRotation() {
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationWaitTime = CAMERA_IDLE_WAIT_MS;
  }
}

// ============================================================
// 5. MESH BUILDERS
// ============================================================

function hexToColor3(hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function clearMeshes() {
  state.meshes.forEach((m) => m.dispose());
  state.meshes = [];
  state.floating = [];
}

function buildPortal({ text, colorHex, position, scale = 1, onClick }) {
  const color = hexToColor3(colorHex);
  const ringDiameter = 3.4 * scale;

  // --- Torus ring ---
  const ring = BABYLON.MeshBuilder.CreateTorus(
    "ring",
    { diameter: ringDiameter, thickness: 0.2 * scale, tessellation: 52 },
    scene
  );
  ring.position = position.clone();
  ring.rotation.x = Math.PI / 2;
  const ringMat = new BABYLON.StandardMaterial("ringMat", scene);
  ringMat.emissiveColor = color;
  ringMat.diffuseColor = color.scale(0.4);
  ringMat.specularColor = BABYLON.Color3.Black();
  ring.material = ringMat;

  // --- Inner disc ---
  const disc = BABYLON.MeshBuilder.CreateDisc(
    "disc",
    { radius: ringDiameter * 0.42, tessellation: 52 },
    scene
  );
  disc.position = position.clone();
  disc.rotation.x = -Math.PI / 2;
  const discMat = new BABYLON.StandardMaterial("discMat", scene);
  discMat.emissiveColor = color.scale(0.28);
  discMat.diffuseColor = color.scale(0.1);
  discMat.alpha = 0.9;
  discMat.backFaceCulling = false;
  disc.material = discMat;

  // --- Label ---
  const labelW = 4.6 * scale;
  const labelH = 1.15 * scale;
  const label = BABYLON.MeshBuilder.CreatePlane("label", { width: labelW, height: labelH }, scene);
  const labelBaseY = position.y + ringDiameter * 0.78;
  label.position = new BABYLON.Vector3(position.x, labelBaseY, position.z);
  label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

  const dt = new BABYLON.DynamicTexture("dt", { width: 1024, height: 256 }, scene, true);
  dt.hasAlpha = true;
  // Safe font stack — no external font required
  const font = "bold 68px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  dt.drawText(text, null, 130, font, "#ffffff", "transparent", true);

  const labelMat = new BABYLON.StandardMaterial("labelMat", scene);
  labelMat.diffuseTexture = dt;
  labelMat.emissiveTexture = dt;
  labelMat.opacityTexture = dt;
  labelMat.backFaceCulling = false;
  labelMat.disableLighting = true;
  labelMat.specularColor = BABYLON.Color3.Black();
  label.material = labelMat;
  label.isPickable = false;

  // --- Picking + hover ---
  const hoverTargets = [ring, disc];
  hoverTargets.forEach((mesh) => {
    mesh.isPickable = true;
    mesh.actionManager = new BABYLON.ActionManager(scene);
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, onClick)
    );
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
        document.body.style.cursor = "pointer";
        ringMat.emissiveColor = color.scale(1.5);
        ring.scaling.setAll(1.06);
        disc.scaling.setAll(1.06);
      })
    );
    mesh.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
        document.body.style.cursor = "default";
        ringMat.emissiveColor = color;
        ring.scaling.setAll(1);
        disc.scaling.setAll(1);
      })
    );
  });

  state.meshes.push(ring, disc, label);
  state.floating.push({
    ring,
    disc,
    label,
    baseY: position.y,
    labelBaseY,
    phase: Math.random() * Math.PI * 2
  });

  return { ring, disc, label };
}

// ============================================================
// 6. VIEWS
// ============================================================

function showSectors() {
  state.view = "sectors";
  state.sector = null;
  clearMeshes();
  closeCard();

  $("breadcrumb").classList.add("hidden");

  state.sectors.forEach((sector, i) => {
    const angle = (i / state.sectors.length) * Math.PI * 2;
    const pos = new BABYLON.Vector3(
      Math.cos(angle) * SECTOR_RADIUS,
      PORTAL_Y,
      Math.sin(angle) * SECTOR_RADIUS
    );
    const color = SECTOR_COLORS[sector] || "#4a90ff";
    const count = careersInSector(sector).length;

    buildPortal({
      text: sector,
      colorHex: color,
      position: pos,
      scale: PORTAL_SCALE_SECTOR,
      onClick: () => {
        if (count === 0) {
          toast("No careers in this sector for " + countryLabel());
          return;
        }
        showCareers(sector);
      }
    });
  });

  // Reset to a comfortable overhead angle
  animateCameraTo({ radius: 30, beta: Math.PI / 2.7 });
  resumeAutoRotation();
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

  list.forEach((career, i) => {
    const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
    const pos = new BABYLON.Vector3(
      Math.cos(angle) * radius,
      PORTAL_Y,
      Math.sin(angle) * radius
    );

    buildPortal({
      text: career.name,
      colorHex: color,
      position: pos,
      scale: PORTAL_SCALE_CAREER,
      onClick: () => openCard(career)
    });
  });

  // Smooth pull-in
  animateCameraTo({
    radius: Math.max(14, radius + 10),
    beta: Math.PI / 2.5
  });
  resumeAutoRotation();
}

// ============================================================
// 7. CAREER CARD
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
  pauseAutoRotation();
}

function closeCard() {
  $("card").classList.add("hidden");
  state.openCareer = null;
  resumeAutoRotation();
}

$("cardClose").addEventListener("click", closeCard);

$("addBtn").addEventListener("click", () => {
  if (!state.openCareer) return;
  addToPlan(state.openCareer);
});

// ============================================================
// 8. PLAN
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
  } catch { /* storage disabled — ignore */ }
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
    .map((c) => `
      <li>
        <span>${c.name}<br><small style="color:#7f8ba6">${c.sector}</small></span>
        <button class="remove" data-id="${c.id}" aria-label="Remove">×</button>
      </li>`)
    .join("");

  list.querySelectorAll(".remove").forEach((btn) => {
    btn.addEventListener("click", () => removeFromPlan(btn.dataset.id));
  });
}

$("planBtn").addEventListener("click", () => {
  renderPlan();
  const plan = $("plan");
  const willOpen = plan.classList.contains("hidden");
  plan.classList.toggle("hidden");
  if (willOpen) {
    closeCard();
    pauseAutoRotation();
  } else {
    resumeAutoRotation();
  }
});

$("planClose").addEventListener("click", () => {
  $("plan").classList.add("hidden");
  resumeAutoRotation();
});

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
    const countryText = c.countries === "ALL" ? "All ECOWAS" : c.countries.join(", ");
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
// 9. COUNTRY SELECTOR
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
// 10. UI EVENTS
// ============================================================

$("backBtn").addEventListener("click", showSectors);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCard();
    $("plan").classList.add("hidden");
    resumeAutoRotation();
  }
});

// Toast helper
let toastTimer = null;
function toast(msg) {
  const el = $("toast");
  if (!el) return;
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
// 11. ANIMATION LOOP
// ============================================================

let t = 0;
scene.registerBeforeRender(() => {
  const dt = engine.getDeltaTime() / 1000;
  t += dt;

  for (let i = 0; i < state.floating.length; i++) {
    const f = state.floating[i];
    const offset = Math.sin(t * 1.1 + f.phase) * 0.16;
    f.ring.position.y = f.baseY + offset;
    f.disc.position.y = f.baseY + offset;
    f.label.position.y = f.labelBaseY + offset;
  }
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
window.addEventListener("orientationchange", () => setTimeout(() => engine.resize(), 200));

// ============================================================
// 12. BOOT
// ============================================================

(async function boot() {
  const loader = createLoader();
  try {
    buildCountrySelector();
    await loadCareers();
    updatePlanCount();
    renderPlan();
    showSectors();
    initXR();
    hideLoader(loader);
    console.log(
      `FuturePath loaded — ${state.careers.length} careers across ${state.sectors.length} sectors.`
    );
  } catch (err) {
    console.error(err);
    hideLoader(loader);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#05080f;color:#e6eefc;font-family:system-ui;padding:24px;text-align:center;z-index:100">
        <div>
          <h2 style="margin:0 0 12px">Could not load careers data</h2>
          <p style="color:#7f8ba6;max-width:440px;line-height:1.6">
            ${err.message}<br><br>
            Make sure <code>src/data/careers.json</code> exists and you are serving over HTTP
            (GitHub Pages or <code>python3 -m http.server</code>), not opening the HTML file directly.
          </p>
        </div>
      </div>`
    );
  }
})();
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
