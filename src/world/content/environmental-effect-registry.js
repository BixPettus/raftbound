import { ENVIRONMENTAL_EFFECTS } from "../../data/world/environmental-effects.js";

const effects = new Map(ENVIRONMENTAL_EFFECTS.map((effect) => [effect.id, deepFreeze(structuredClone(effect))]));

export function getEnvironmentalEffect(id) {
  const effect = effects.get(id);
  if (!effect) throw new Error(`Unknown environmental effect: ${id}`);
  return effect;
}

export function listEnvironmentalEffects() {
  return [...effects.values()];
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
