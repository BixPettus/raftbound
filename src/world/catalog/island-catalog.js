import { ISLAND_CATALOG_VERSION } from "../../data/world/catalog-version.js";
import { ISLAND_ARCHETYPES } from "../../data/world/island-archetypes.js";
import { ISLAND_TEMPLATES } from "../../data/world/island-templates.js";
import { WORLD_BIOMES } from "../../data/world/biomes.js";
import { EDGE_PROFILES } from "../../data/world/edge-profiles.js";
import { SPECIAL_ATTRIBUTES } from "../../data/world/special-attributes.js";
import { ENEMY_DEFINITIONS } from "../../data/world/enemy-definitions.js";
import { ENEMY_SPAWN_TABLES } from "../../data/world/enemy-spawn-tables.js";

export const islandCatalog = Object.freeze({
  version: ISLAND_CATALOG_VERSION,
  archetypes: freezeRecords(ISLAND_ARCHETYPES),
  templates: freezeRecords(ISLAND_TEMPLATES),
  biomes: freezeRecords(WORLD_BIOMES),
  edgeProfiles: freezeRecords(EDGE_PROFILES),
  specialAttributes: freezeRecords(SPECIAL_ATTRIBUTES),
  enemyDefinitions: freezeRecords(ENEMY_DEFINITIONS),
  enemySpawnTables: freezeRecords(ENEMY_SPAWN_TABLES)
});

export function listIslandTemplates({ naturalOnly = false, includeExperimental = false, includePlaceholders = false } = {}) {
  return islandCatalog.templates.filter((template) => {
    if (!naturalOnly) return true;
    if (!template.enabled || template.encounterWeight <= 0) return false;
    if (template.implementationStatus === "validated" || template.implementationStatus === "release") return true;
    if (template.implementationStatus === "experimental") return includeExperimental;
    if (template.implementationStatus === "placeholder") return includePlaceholders;
    return false;
  });
}

export function getIslandTemplate(id) {
  return mustFind(islandCatalog.templates, id, "island template");
}

export function getIslandArchetype(id) {
  return mustFind(islandCatalog.archetypes, id, "island archetype");
}

export function getWorldBiome(id) {
  return mustFind(islandCatalog.biomes, id, "biome");
}

export function getEdgeProfile(id) {
  return mustFind(islandCatalog.edgeProfiles, id, "edge profile");
}

export function getSpecialAttribute(id) {
  return mustFind(islandCatalog.specialAttributes, id, "special attribute");
}

export function getEnemySpawnTable(id) {
  return mustFind(islandCatalog.enemySpawnTables, id, "enemy spawn table");
}

export function getEnemyDefinition(id) {
  return mustFind(islandCatalog.enemyDefinitions, id, "enemy definition");
}

function mustFind(records, id, label) {
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error(`Unknown ${label}: ${id}`);
  return record;
}

function freezeRecords(records) {
  return Object.freeze(records.map((record) => deepFreeze(structuredClone(record))));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
