import { HAZARD_DEFINITIONS } from "../../data/world/hazard-definitions.js";

const hazards = new Map(HAZARD_DEFINITIONS.map((hazard) => [hazard.id, deepFreeze(structuredClone(hazard))]));

export function getHazardDefinition(id) {
  const hazard = hazards.get(id);
  if (!hazard) throw new Error(`Unknown hazard: ${id}`);
  return hazard;
}

export function listHazards() {
  return [...hazards.values()];
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
