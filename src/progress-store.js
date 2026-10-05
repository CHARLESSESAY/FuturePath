/* FuturePath — progress persistence */

const KEY = "futurepath.progress";

export function loadAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function loadCareer(careerId) {
  const all = loadAll();
  return all[careerId] || { modules: {}, started: Date.now() };
}

export function recordModule(careerId, moduleKey, score) {
  const all = loadAll();
  const c = all[careerId] || { modules: {}, started: Date.now() };
  c.modules[moduleKey] = Math.max(c.modules[moduleKey] || 0, score);
  c.lastUpdate = Date.now();
  all[careerId] = c;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
}

export function getModuleScore(careerId, moduleKey) {
  return loadCareer(careerId).modules[moduleKey] || 0;
}

export function resetCareer(careerId) {
  const all = loadAll();
  delete all[careerId];
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch {}
}
