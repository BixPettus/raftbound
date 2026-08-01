import { calculateTemplateDanger } from "./danger-calculator.js";
import { compileIslandRecipe } from "./island-recipe-compiler.js";
import { islandCatalog } from "./island-catalog.js";

const IMPLEMENTED_ENEMY_BEHAVIORS = new Set(["shore_crawler"]);

export function validateIslandCatalog(catalog = islandCatalog) {
  const errors = [];
  validateUnique("archetype", catalog.archetypes, errors);
  validateUnique("template", catalog.templates, errors);
  validateUnique("biome", catalog.biomes, errors);
  validateUnique("edge profile", catalog.edgeProfiles, errors);
  validateUnique("special attribute", catalog.specialAttributes, errors);
  validateUnique("enemy definition", catalog.enemyDefinitions, errors);
  validateUnique("enemy spawn table", catalog.enemySpawnTables, errors);

  for (const biome of catalog.biomes) validateBiome(biome, catalog, errors);
  for (const table of catalog.enemySpawnTables) validateSpawnTable(table, catalog, errors);
  for (const template of catalog.templates) validateTemplate(template, catalog, errors);
  return { ok: errors.length === 0, errors };
}

function validateTemplate(template, catalog, errors) {
  const path = `template ${template.id}`;
  ref(path, "archetypeId", template.archetypeId, catalog.archetypes, errors);
  const archetype = catalog.archetypes.find((item) => item.id === template.archetypeId);
  if (template.generationRating < 1 || template.generationRating > 5) errors.push(`${path}.generationRating must be 1-5`);
  if (template.level.rating < 1 || template.level.minimumAccessLevel < 1) errors.push(`${path}.level has invalid rating`);
  if (template.level.minimumAccessLevel > template.level.recommendedMinimum || template.level.recommendedMinimum > template.level.recommendedMaximum) {
    errors.push(`${path}.level recommended ordering is invalid`);
  }
  const sizeTotal = Object.values(template.allowedSizes).reduce((sum, value) => sum + value, 0);
  if (sizeTotal <= 0) errors.push(`${path}.allowedSizes must sum positive`);
  const coverage = template.biomeSlots.reduce((sum, slot) => sum + slot.coverage, 0);
  if (Math.abs(coverage - 1) > 0.001) errors.push(`${path}.biomeSlots coverage must sum to 1`);
  if (archetype) {
    const min = archetype.compatibility.minimumBiomes;
    const max = archetype.compatibility.maximumBiomes;
    if (template.biomeSlots.length < min || template.biomeSlots.length > max) errors.push(`${path}.biomeSlots count is outside archetype ${archetype.id} range`);
    if (template.enabled && template.implementationStatus === "validated" && !archetype.implemented) errors.push(`${path} validated template uses unimplemented archetype ${archetype.id}`);
  }
  for (const slot of template.biomeSlots) ref(path, "biomeSlots.biomeId", slot.biomeId, catalog.biomes, errors);
  ref(path, "edges.arrival", template.edges.arrival, catalog.edgeProfiles, errors);
  ref(path, "edges.far", template.edges.far, catalog.edgeProfiles, errors);
  const arrivalEdge = catalog.edgeProfiles.find((item) => item.id === template.edges.arrival);
  const farEdge = catalog.edgeProfiles.find((item) => item.id === template.edges.far);
  validateEdgeUse(path, "arrival", arrivalEdge, template, catalog, errors);
  validateEdgeUse(path, "far", farEdge, template, catalog, errors);
  for (const attributeId of template.specialAttributes) {
    ref(path, "specialAttributes", attributeId, catalog.specialAttributes, errors);
    const attribute = catalog.specialAttributes.find((item) => item.id === attributeId);
    if (attribute && archetype) {
      if (!archetype.compatibility.allowedSpecialAttributes.includes(attributeId)) errors.push(`${path} attribute ${attributeId} is not allowed by archetype ${archetype.id}`);
      if (!attribute.requirements.compatibleArchetypes.includes(archetype.id)) errors.push(`${path} attribute ${attributeId} is incompatible with archetype ${archetype.id}`);
      if (template.generationRating < attribute.requirements.minimumGenerationRating) errors.push(`${path} attribute ${attributeId} requires generation rating ${attribute.requirements.minimumGenerationRating}`);
    }
  }
  if (template.enabled && template.implementationStatus === "validated") {
    for (const slot of template.biomeSlots) {
      const biome = catalog.biomes.find((item) => item.id === slot.biomeId);
      if (!biome.implemented || biome.implementationStatus !== "validated") errors.push(`${path} natural template uses placeholder biome ${slot.biomeId}`);
      if (template.level.minimumAccessLevel < biome.access.minimumLevel) errors.push(`${path}.minimumAccessLevel is below biome ${slot.biomeId} access`);
    }
    for (const attributeId of template.specialAttributes) {
      const attribute = catalog.specialAttributes.find((item) => item.id === attributeId);
      if (!attribute.implemented) errors.push(`${path} uses placeholder attribute ${attributeId}`);
    }
    if (!arrivalEdge?.implemented) errors.push(`${path} validated template uses unimplemented arrival edge ${template.edges.arrival}`);
    if (!farEdge?.implemented) errors.push(`${path} validated template uses unimplemented far edge ${template.edges.far}`);
  }
  if (catalog === islandCatalog) {
    const a = compileIslandRecipe({ templateId: template.id, seed: "catalog-validation", size: Object.keys(template.allowedSizes)[0] });
    const b = compileIslandRecipe({ templateId: template.id, seed: "catalog-validation", size: Object.keys(template.allowedSizes)[0] });
    if (a.recipeHash !== b.recipeHash) errors.push(`${path}.recipeHash is not deterministic`);
  }
  calculateTemplateDanger(template);
}

function validateBiome(biome, catalog, errors) {
  const path = `biome ${biome.id}`;
  for (const [key, value] of Object.entries(biome.danger)) {
    if (value < 0 || value > 100) errors.push(`${path}.danger.${key} out of range`);
  }
  ref(path, "enemies.spawnTableId", biome.enemies.spawnTableId, catalog.enemySpawnTables, errors);
}

function validateSpawnTable(table, catalog, errors) {
  const path = `spawnTable ${table.id}`;
  for (const entry of table.entries) {
    ref(path, "entries.enemyId", entry.enemyId, catalog.enemyDefinitions, errors);
    const enemy = catalog.enemyDefinitions.find((item) => item.id === entry.enemyId);
    if (table.implemented && !enemy.implemented) errors.push(`${path} implemented table references placeholder enemy ${entry.enemyId}`);
    if (enemy?.implemented && !IMPLEMENTED_ENEMY_BEHAVIORS.has(enemy.behaviorId)) errors.push(`${path}.${entry.enemyId} uses unavailable behavior ${enemy.behaviorId}`);
    if (entry.weight <= 0 || entry.density <= 0) errors.push(`${path}.${entry.enemyId} weight and density must be positive`);
  }
}

function validateEdgeUse(path, role, edge, template, catalog, errors) {
  if (!edge) return;
  if (role === "arrival" && !edge.compatibility.canBeArrivalEdge) errors.push(`${path}.edges.arrival uses edge that cannot be arrival`);
  if (role === "far" && !edge.compatibility.canBeFarEdge) errors.push(`${path}.edges.far uses edge that cannot be far`);
  if (edge.compatibility.allowedBiomeTags.includes("*")) return;
  for (const slot of template.biomeSlots) {
    const biome = catalog.biomes.find((item) => item.id === slot.biomeId);
    const compatible = biome?.tags.some((tag) => edge.compatibility.allowedBiomeTags.includes(tag));
    if (!compatible) errors.push(`${path}.edges.${role} is incompatible with biome ${slot.biomeId}`);
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
