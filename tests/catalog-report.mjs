import { mkdir, writeFile } from "node:fs/promises";
import { validateIslandCatalog } from "../src/world/catalog/catalog-validator.js";
import { islandCatalog, listIslandTemplates } from "../src/world/catalog/island-catalog.js";
import { calculateTemplateDanger } from "../src/world/catalog/danger-calculator.js";

const validation = validateIslandCatalog();
const templates = islandCatalog.templates;
const enabled = templates.filter((template) => template.enabled);
const report = {
  catalogVersion: islandCatalog.version,
  templateCount: templates.length,
  enabledCount: enabled.length,
  placeholderCount: templates.filter((template) => template.implementationStatus === "placeholder").length,
  validatedCount: templates.filter((template) => template.implementationStatus === "validated").length,
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
  edgeProfileCoverage: islandCatalog.edgeProfiles.map((edge) => ({ id: edge.id, implemented: edge.implemented })),
  naturalTemplateIds: listIslandTemplates({ naturalOnly: true }).map((template) => template.id),
  suggestedValidationGrade: validation.ok ? "validated" : "broken"
};

await mkdir("reports", { recursive: true });
await writeFile("reports/island-catalog-report.json", `${JSON.stringify(report, null, 2)}\n`);
console.log("reports/island-catalog-report.json");

