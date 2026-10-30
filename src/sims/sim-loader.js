/* FuturePath — Simulation Loader
   Dispatches to career-specific simulation modules. */

import { createGaraSimulation } from "./gara-sim.js";

const SIM_REGISTRY = {
  "gara-tie-dye": createGaraSimulation
};

export function hasSimulation(careerId) {
  return !!SIM_REGISTRY[careerId];
}

export function launchSimulation({ careerId, container, onComplete, simLevel = 0 }) {
  const factory = SIM_REGISTRY[careerId];
  if (!factory) {
    container.innerHTML = `<p style="padding:24px;color:#8a99b8">No simulation available for this career yet.</p>`;
    return null;
  }
  return factory({ container, onComplete, level: simLevel });
}
