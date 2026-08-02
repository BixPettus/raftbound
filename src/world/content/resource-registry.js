import { RESOURCE_DEFINITIONS } from "../../data/world/resource-definitions.js";

const definitions = new Map(RESOURCE_DEFINITIONS.map((definition) => [definition.id, deepFreeze(structuredClone(definition))]));

export function getResourceDefinition(id) {
  const definition = definitions.get(id);
  if (!definition) throw new Error(`Unknown resource definition: ${id}`);
  return definition;
}

export function listResourceDefinitions() {
  return [...definitions.values()];
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
