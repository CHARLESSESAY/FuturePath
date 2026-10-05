/* FuturePath — PWA registration */

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}

export function setupInstallPrompt(onAvailable) {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__fpInstallPrompt = e;
    if (onAvailable) onAvailable();
  });
  window.addEventListener("appinstalled", () => {
    window.__fpInstallPrompt = null;
  });
}

export async function triggerInstall() {
  const p = window.__fpInstallPrompt;
  if (!p) return false;
  p.prompt();
  const { outcome } = await p.userChoice;
  window.__fpInstallPrompt = null;
  return outcome === "accepted";
}

export function canInstall() {
  return !!window.__fpInstallPrompt;
}
