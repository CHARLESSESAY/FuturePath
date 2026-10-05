/* ============================================================
   FuturePath — PWA Module
   Service worker registration, install prompt, update handling.
   ============================================================ */

let deferredInstallPrompt = null;
let swRegistration = null;

// ---------- Service Worker Registration ----------

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("[PWA] Service workers not supported.");
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });

    console.log("[PWA] Service worker registered. Scope:", swRegistration.scope);

    // Listen for updates
    swRegistration.addEventListener("updatefound", () => {
      const newWorker = swRegistration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New version is ready but not yet active
          showUpdateToast();
        }
      });
    });

    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      const data = event.data || {};
      if (data.type === "SW_ACTIVATED") {
        console.log("[PWA] New service worker activated:", data.version);
      }
    });

    return swRegistration;
  } catch (err) {
    console.error("[PWA] Service worker registration failed:", err);
    return null;
  }
}

// ---------- Install Prompt ----------

export function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Prevent the default mini-infobar
    event.preventDefault();
    deferredInstallPrompt = event;

    console.log("[PWA] Install prompt captured.");
    showInstallButton();
  });

  // Detect successful install
  window.addEventListener("appinstalled", () => {
    console.log("[PWA] App installed.");
    deferredInstallPrompt = null;
    hideInstallButton();
    showToast("FuturePath installed. You can now use it offline.");
  });

  // Detect if already installed (standalone mode)
  if (window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true) {
    console.log("[PWA] Running in standalone mode.");
    hideInstallButton();
  }
}

export async function triggerInstall() {
  if (!deferredInstallPrompt) {
    showToast("Install not available. On iOS, tap Share then 'Add to Home Screen'.");
    return false;
  }

  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;

  console.log("[PWA] Install outcome:", outcome);
  deferredInstallPrompt = null;

  if (outcome === "accepted") {
    showToast("Installing FuturePath…");
    return true;
  }

  return false;
}

export function isInstallAvailable() {
  return !!deferredInstallPrompt;
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// ---------- Update Handling ----------

function showUpdateToast() {
  const toast = document.getElementById("toast");
  if (!toast) return;

  // Build a custom update toast with an action button
  const updateToast = document.createElement("div");
  updateToast.id = "updateToast";
  updateToast.style.cssText = [
    "position:fixed",
    "bottom:80px",
    "left:50%",
    "transform:translateX(-50%) translateY(8px)",
    "z-index:50",
    "background:#0d1424",
    "border:1px solid #1a6bff",
    "color:#e6eefc",
    "font-size:13px",
    "padding:12px 16px",
    "border-radius:10px",
    "box-shadow:0 12px 32px rgba(0,0,0,0.5)",
    "display:flex",
    "align-items:center",
    "gap:14px",
    "transition:opacity 0.25s, transform 0.25s"
  ].join(";");

  updateToast.innerHTML = `
    <span>A new version is ready.</span>
    <button id="updateBtn" style="
      background:#1a6bff;
      border:none;
      color:#fff;
      font-weight:600;
      font-size:12px;
      padding:7px 14px;
      border-radius:7px;
      cursor:pointer;
      font-family:inherit;
    ">Update now</button>
  `;

  document.body.appendChild(updateToast);

  requestAnimationFrame(() => {
    updateToast.style.transform = "translateX(-50%) translateY(0)";
  });

  document.getElementById("updateBtn").addEventListener("click", () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    // Reload after a short delay so the new SW takes control
    setTimeout(() => window.location.reload(), 300);
  });

  // Auto-dismiss after 30 seconds if ignored
  setTimeout(() => {
    updateToast.style.opacity = "0";
    updateToast.style.transform = "translateX(-50%) translateY(8px)";
    setTimeout(() => updateToast.remove(), 300);
  }, 30000);
}

// ---------- Install Button UI ----------

function showInstallButton() {
  // Avoid duplicates
  if (document.getElementById("installBtn")) return;

  const btn = document.createElement("button");
  btn.id = "installBtn";
  btn.textContent = "Install app";
  btn.style.cssText = [
    "position:fixed",
    "bottom:22px",
    "right:22px",
    "z-index:20",
    "background:#2ec49a",
    "border:1px solid #2ec49a",
    "color:#05080f",
    "font-weight:700",
    "padding:11px 20px",
    "border-radius:10px",
    "cursor:pointer",
    "font-family:inherit",
    "font-size:13px"
  ].join(";");

  btn.addEventListener("click", () => {
    triggerInstall();
  });

  document.body.appendChild(btn);

  // Hide the "Enter VR" button position conflict — move install button up if VR button exists
  adjustButtonPositions();
}

function hideInstallButton() {
  const btn = document.getElementById("installBtn");
  if (btn) btn.remove();
  adjustButtonPositions();
}

function adjustButtonPositions() {
  const installBtn = document.getElementById("installBtn");
  const xrBtn = document.getElementById("xrBtn");
  if (installBtn && xrBtn) {
    installBtn.style.bottom = "80px";
  } else if (installBtn) {
    installBtn.style.bottom = "22px";
  }
}

// ---------- Toast helper (local, so pwa.js works even before career-hub loads) ----------

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(el._pwaTimer);
  el._pwaTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

// ---------- Online/Offline Status ----------

export function setupOfflineDetection() {
  const indicator = document.createElement("div");
  indicator.id = "offlineIndicator";
  indicator.style.cssText = [
    "position:fixed",
    "top:74px",
    "left:50%",
    "transform:translateX(-50%)",
    "z-index:30",
    "background:#e8b60c",
    "color:#05080f",
    "font-size:12px",
    "font-weight:700",
    "padding:6px 14px",
    "border-radius:20px",
    "display:none",
    "letter-spacing:0.04em"
  ].join(";");
  indicator.textContent = "Offline — using saved data";
  document.body.appendChild(indicator);

  function update() {
    if (navigator.onLine) {
      indicator.style.display = "none";
    } else {
      indicator.style.display = "block";
    }
  }

  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}
