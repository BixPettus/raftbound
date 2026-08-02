import assert from "node:assert/strict";
import { CONFIG } from "../src/config.js";
import { generateIsland } from "../src/world/island-generator.js";
import { compileIslandRecipe } from "../src/world/catalog/island-recipe-compiler.js";
import { listIslandTemplates } from "../src/world/catalog/island-catalog.js";

const templates = listIslandTemplates({ naturalOnly: true });
const reports = [];

for (const template of templates) {
  const seedCount = template.id === "temperate_haven" || template.id === "temperate_caverns" ? 24 : 50;
  const representativeSeeds = Array.from({ length: seedCount }, (_, index) => `matrix-${index.toString().padStart(3, "0")}`);
  for (const size of Object.keys(template.allowedSizes)) {
    for (const seedId of representativeSeeds) {
      const seed = `${template.id}-${size}-${seedId}`;
      const recipe = compileIslandRecipe({ templateId: template.id, seed, size, generationVersion: CONFIG.GENERATION_VERSION });
      const start = performance.now();
      const island = generateIsland({ recipe });
      const elapsed = performance.now() - start;
      const report = { ...island.generationReport, measuredMs: elapsed };
      reports.push(report);
      assert.equal(report.validationFailures.length, 0, `${template.id} ${seed} ${size} failed validation: ${report.validationFailures.join(",")}`);
      assert.equal(report.usedFallback, false, `${template.id} ${seed} ${size} used fallback`);
      assert.equal(report.templateId, template.id);
      assert.equal(report.recipeHash, recipe.recipeHash);
      assert.equal(report.entranceCount > 0, true, `${template.id} ${seed} ${size} missing entrance`);
      assert.equal(report.waterTileCount > 0, true, `${template.id} ${seed} ${size} missing water`);
      assert.equal(report.oreCounts.copper_ore > 0, true, `${template.id} ${seed} ${size} missing copper`);
      assert.equal(report.oreCounts.iron_ore > 0, true, `${template.id} ${seed} ${size} missing iron`);
      assert.equal(report.edgeProfiles.arrival.id, "sandy_beach");
      assert.equal(report.edgeProfiles.far.id, "sandy_beach");
      assert.equal(report.realizedThreat.enemyCount, report.enemyCount);
      assert.equal(report.enemySpawnByRegion.every((region) => region.remaining >= 0), true);
      assert.equal(report.biomeRegions.every((region) => region.endX > region.startX), true);
      if (template.biomeSlots.length === 1 && template.biomeSlots[0].biomeId === "desert") assert.equal(report.dryCaveRatio >= 0.9, true, `${template.id} ${seed} ${size} dry cave ratio ${report.dryCaveRatio}`);
      assert.equal(elapsed < 350, true, `${template.id} ${seed} ${size} exceeded hard ceiling: ${elapsed.toFixed(1)}ms`);
    }
  }
}

const timings = reports.map((report) => report.measuredMs).sort((a, b) => a - b);
const p95 = percentile(timings, 0.95);
const p99 = percentile(timings, 0.99);
const fallbackCount = reports.filter((report) => report.usedFallback).length;

console.log(JSON.stringify({
  generated: reports.length,
  templateIds: [...new Set(reports.map((report) => report.templateId))],
  fallbackCount,
  p95Ms: Number(p95.toFixed(2)),
  p99Ms: Number(p99.toFixed(2)),
  maxMs: Number(timings[timings.length - 1].toFixed(2)),
  attemptDistribution: reports.reduce((counts, report) => {
    counts[report.selectedAttempt] = (counts[report.selectedAttempt] ?? 0) + 1;
    return counts;
  }, {}),
  danger: {
    min: Number(Math.min(...reports.map((report) => report.dangerScore)).toFixed(2)),
    max: Number(Math.max(...reports.map((report) => report.dangerScore)).toFixed(2))
  },
  caveAirRatio: {
    min: Number(Math.min(...reports.map((report) => report.caveAirRatio)).toFixed(4)),
    max: Number(Math.max(...reports.map((report) => report.caveAirRatio)).toFixed(4))
  },
  dryCaveRatio: {
    min: Number(Math.min(...reports.map((report) => report.dryCaveRatio)).toFixed(4)),
    max: Number(Math.max(...reports.map((report) => report.dryCaveRatio)).toFixed(4))
  },
  biomeRegionCoverage: reports.reduce((counts, report) => {
    for (const region of report.biomeRegions) counts[region.biomeId] = (counts[region.biomeId] ?? 0) + 1;
    return counts;
  }, {}),
  resourceCountsByBiome: reports.reduce((counts, report) => {
    counts[report.templateId] ??= {};
    for (const [resourceId, count] of Object.entries(report.resourceCounts)) counts[report.templateId][resourceId] = (counts[report.templateId][resourceId] ?? 0) + count;
    return counts;
  }, {}),
  enemyCountsByRegion: reports.reduce((summary, report) => {
    for (const region of report.enemySpawnByRegion) {
      const key = `${report.templateId}:${region.biomeId}`;
      summary[key] ??= {};
      for (const [enemyId, count] of Object.entries(region.countsByType)) summary[key][enemyId] = (summary[key][enemyId] ?? 0) + count;
    }
    return summary;
  }, {})
}, null, 2));

function percentile(values, p) {
  const index = Math.min(values.length - 1, Math.ceil(values.length * p) - 1);
  return values[index];
}
