import { RESOURCE_TABLES } from "../../data/world/resource-tables.js";

const tables = new Map(RESOURCE_TABLES.map((table) => [table.id, deepFreeze(structuredClone(table))]));

export function getResourceTable(id) {
  const table = tables.get(id);
  if (!table) throw new Error(`Unknown resource table: ${id}`);
  return table;
}

export function listResourceTables() {
  return [...tables.values()];
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
