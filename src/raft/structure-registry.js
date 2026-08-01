import { STRUCTURE_DEFINITIONS } from "../data/structures.js";

const structureMap = new Map(STRUCTURE_DEFINITIONS.map((structure) => [structure.id, Object.freeze({ ...structure })]));

export function getStructureDefinition(structureType) {
  const structure = structureMap.get(structureType);
  if (!structure) throw new Error(`Unknown structure type: ${structureType}`);
  return structure;
}

export function listStructures() {
  return [...structureMap.values()];
}
