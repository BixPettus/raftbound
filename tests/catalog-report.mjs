import { mkdir, writeFile } from "node:fs/promises";
import { validateIslandCatalog } from "../src/world/catalog/catalog-validator.js";
import { islandCatalog, listIslandTemplates } from "../src/world/catalog/island-catalog.js";
import { calculateTemplateDanger } from "../src/world/catalog/danger-calculator.js";
import { listCaveProfiles, listOreProfiles, listStrataProfiles, listSurfaceProfiles } from "../src/world/content/biome-profile-registry.js";
import { listResourceDefinitions } from "../src/world/content/resource-registry.js";
import { listResourceTables } from "../src/world/content/resource-table-registry.js";
import { listEnvironmentalEffects } from "../src/world/content/environmental-effect-registry.js";

const validation = validateIslandCatalog();
const templates = islandCatalog.templates;
const enabled = templates.filter((template) => template.enabled);
const report = {
  catalogVersion: islandCatalog.version,
  templateCount: templates.length,
  enabledCount: enabled.length,
  placeholderCount: templates.filter((template) => template.implementationStatus === "placeholder").length,
  validatedCount: templates.filter((template) => template.implementationStatus === "validated").length,
  implementedBiomeCount: islandCatalog.biomes.filter((biome) => biome.implemented).length,
  validatedBiomeCount: islandCatalog.biomes.filter((biome) => biome.implementationStatus === "validated").length,
  templatesByBiome: templates.reduce((counts, template) => {
    for (const slot of template.biomeSlots) counts[slot.biomeId] = (counts[slot.biomeId] ?? 0) + 1;
    return counts;
  }, {}),
  mixedBiomeTemplateCount: templates.filter((template) => template.biomeSlots.length > 1).length,
  brokenReferences: validation.errors,
  dangerDistribution: templates.reduce((counts, template) => {
    const tier = calculateTemplateDanger(template).tier;
    counts[tier] = (counts[tier] ?? 0) + 1;
    return counts;
  }, {}),
  levelDistribution: templates.reduce((counts, template) => {
    counts[template.level.rating] = (counts[template.level.rating] ?? 0) + 1;
    return counts;
  }, {}),
  sizeDistribution: templates.reduce((counts, template) => {
    for (const size of Object.keys(template.allowedSizes)) counts[size] = (counts[size] ?? 0) + 1;
    return counts;
  }, {}),
  biomeCoverage: templates.reduce((counts, template) => {
    for (const slot of template.biomeSlots) counts[slot.biomeId] = (counts[slot.biomeId] ?? 0) + 1;
    return counts;
  }, {}),
  enemyCoverage: islandCatalog.enemySpawnTables.map((table) => ({ id: table.id, implemented: table.implemented, entries: table.entries.length })),
  resourceDefinitionCoverage: listResourceDefinitions().map((definition) => ({ id: definition.id, biomeIds: definition.placement.biomeIds, tags: definition.resourceTags ?? [] })),
  resourceTableCoverage: listResourceTables().map((table) => ({ id: table.id, entries: table.entries.length, requiredTags: table.requiredTags ?? [] })),
  surfaceProfileCoverage: listSurfaceProfiles().map((profile) => ({ id: profile.id, landmarks: profile.landmarks?.map((landmark) => landmark.type) ?? [] })),
  strataProfileCoverage: listStrataProfiles().map((profile) => ({ id: profile.id, layers: profile.layers.length })),
  caveProfileCoverage: listCaveProfiles().map((profile) => ({ id: profile.id, wetness: profile.water.wetness, entranceStyles: profile.entrances.styles })),
  oreProfileCoverage: listOreProfiles().map((profile) => ({ id: profile.id, entries: profile.entries.map((entry) => entry.tileId) })),
  environmentalEffectCoverage: listEnvironmentalEffects().map((effect) => ({ id: effect.id, biomeIds: effect.activation.biomeIds, zones: effect.activation.zones })),
  enemyBehaviourCoverage: islandCatalog.enemyDefinitions.map((enemy) => ({ id: enemy.id, implemented: enemy.implemented, behaviorId: enemy.behaviorId })),
  spawnTableRegionalValidation: islandCatalog.enemySpawnTables.map((table) => ({ id: table.id, regionalEntries: table.entries.filter((entry) => entry.allowedRegion).length })),
  biomeProductionStatus: islandCatalog.biomes.map((biome) => ({ id: biome.id, implemented: biome.implemented, status: biome.implementationStatus })),
  edgeProfileCoverage: islandCatalog.edgeProfiles.map((edge) => ({ id: edge.id, implemented: edge.implemented })),
  naturalTemplateIds: listIslandTemplates({ naturalOnly: true }).map((template) => template.id),
  suggestedValidationGrade: validation.ok ? "validated" : "broken"
};

await mkdir("reports", { recursive: true });
await writeFile("reports/island-catalog-report.json", `${JSON.stringify(report, null, 2)}\n`);
console.log("reports/island-catalog-report.json");

