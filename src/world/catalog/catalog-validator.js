import { calculateTemplateDanger } from "./danger-calculator.js";
import { compileIslandRecipe } from "./island-recipe-compiler.js";
import { islandCatalog } from "./island-catalog.js";

export function validateIslandCatalog() {
  const errors = [];
  validateUnique("archetype", islandCatalog.archetypes, errors);
  validateUnique("template", islandCatalog.templates, errors);
  validateUnique("biome", islandCatalog.biomes, errors);
  validateUnique("edge profile", islandCatalog.edgeProfiles, errors);
  validateUnique("special attribute", islandCatalog.specialAttributes, errors);
  validateUnique("enemy definition", islandCatalog.enemyDefinitions, errors);
  validateUnique("enemy spawn table", islandCatalog.enemySpawnTables, errors);

  for (const biome of islandCatalog.biomes) validateBiome(biome, errors);
  for (const table of islandCatalog.enemySpawnTables) validateSpawnTable(table, errors);
  for (const template of islandCatalog.templates) validateTemplate(template, errors);
  return { ok: errors.length === 0, errors };
}

function validateTemplate(template, errors) {
  const path = `template ${template.id}`;
  ref(path, "archetypeId", template.archetypeId, islandCatalog.archetypes, errors);
  if (template.generationRating < 1 || template.generationRating > 5) errors.push(`${path}.generationRating must be 1-5`);
  if (template.level.rating < 1 || template.level.minimumAccessLevel < 1) errors.push(`${path}.level has invalid rating`);
  const sizeTotal = Object.values(template.allowedSizes).reduce((sum, value) => sum + value, 0);
  if (sizeTotal <= 0) errors.push(`${path}.allowedSizes must sum positive`);
  const coverage = template.biomeSlots.reduce((sum, slot) => sum + slot.coverage, 0);
  if (Math.abs(coverage - 1) > 0.001) errors.push(`${path}.biomeSlots coverage must sum to 1`);
  for (const slot of template.biomeSlots) ref(path, "biomeSlots.biomeId", slot.biomeId, islandCatalog.biomes, errors);
  ref(path, "edges.arrival", template.edges.arrival, islandCatalog.edgeProfiles, errors);
  ref(path, "edges.far", template.edges.far, islandCatalog.edgeProfiles, errors);
  for (const attributeId of template.specialAttributes) ref(path, "specialAttributes", attributeId, islandCatalog.specialAttributes, errors);
  if (template.enabled && template.implementationStatus === "validated") {
    for (const slot of template.biomeSlots) {
      const biome = islandCatalog.biomes.find((item) => item.id === slot.biomeId);
      if (!biome.implemented || biome.implementationStatus !== "validated") errors.push(`${path} natural template uses placeholder biome ${slot.biomeId}`);
      if (template.level.minimumAccessLevel < biome.access.minimumLevel) errors.push(`${path}.minimumAccessLevel is below biome ${slot.biomeId} access`);
    }
    for (const attributeId of template.specialAttributes) {
      const attribute = islandCatalog.specialAttributes.find((item) => item.id === attributeId);
      if (!attribute.implemented) errors.push(`${path} uses placeholder attribute ${attributeId}`);
    }
  }
  const a = compileIslandRecipe({ templateId: template.id, seed: "catalog-validation", size: Object.keys(template.allowedSizes)[0] });
  const b = compileIslandRecipe({ templateId: template.id, seed: "catalog-validation", size: Object.keys(template.allowedSizes)[0] });
  if (a.recipeHash !== b.recipeHash) errors.push(`${path}.recipeHash is not deterministic`);
  calculateTemplateDanger(template);
}

function validateBiome(biome, errors) {
  const path = `biome ${biome.id}`;
  for (const [key, value] of Object.entries(biome.danger)) {
    if (value < 0 || value > 100) errors.push(`${path}.danger.${key} out of range`);
  }
  ref(path, "enemies.spawnTableId", biome.enemies.spawnTableId, islandCatalog.enemySpawnTables, errors);
}

function validateSpawnTable(table, errors) {
  const path = `spawnTable ${table.id}`;
  for (const entry of table.entries) {
    ref(path, "entries.enemyId", entry.enemyId, islandCatalog.enemyDefinitions, errors);
    const enemy = islandCatalog.enemyDefinitions.find((item) => item.id === entry.enemyId);
    if (table.implemented && !enemy.implemented) errors.push(`${path} implemented table references placeholder enemy ${entry.enemyId}`);
    if (entry.weight <= 0 || entry.density <= 0) errors.push(`${path}.${entry.enemyId} weight and density must be positive`);
  }
}

function ref(path, field, id, records, errors) {
  if (!records.some((record) => record.id === id)) errors.push(`${path}.${field} references unknown id ${id}`);
}

function validateUnique(label, records, errors) {
  const seen = new Set();
  for (const record of records) {
    if (seen.has(record.id)) errors.push(`Duplicate ${label} id ${record.id}`);
    seen.add(record.id);
  }
}

