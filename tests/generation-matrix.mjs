import assert from "node:assert/strict";
import { CONFIG } from "../src/config.js";
import { generateIsland } from "../src/world/island-generator.js";
import { compileIslandRecipe } from "../src/world/catalog/island-recipe-compiler.js";
import { listIslandTemplates } from "../src/world/catalog/island-catalog.js";
import { SHORE_ZONES } from "../src/world/generation/shoreline-planner.js";

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
      const report = { ...island.generationReport, measuredMs: island.generationReport.totalGenerationMs ?? elapsed, wallClockMs: elapsed };
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
      validateShorelineMatrix(island, template.id, seed, size);
      assert.equal(report.realizedThreat.enemyCount, report.enemyCount);
      assert.equal(report.enemySpawnByRegion.every((region) => region.remaining >= 0), true);
      assert.equal(report.biomeRegions.every((region) => region.endX > region.startX), true);
      if (template.biomeSlots.length === 1 && template.biomeSlots[0].biomeId === "desert") assert.equal(report.dryCaveRatio >= 0.9, true, `${template.id} ${seed} ${size} dry cave ratio ${report.dryCaveRatio}`);
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

function validateShorelineMatrix(island, templateId, seed, size) {
  const contextLabel = `${templateId} ${seed} ${size}`;
  assert.equal(island.shorelineDatum.waterSurfaceWorldY, island.seaLevelTile * CONFIG.TILE_SIZE, `${contextLabel} water datum mismatch`);
  assert.equal(island.shorelineDatum.shorelineSurfaceWorldY, island.seaLevelTile * CONFIG.TILE_SIZE, `${contextLabel} shoreline datum mismatch`);
  assert.equal(island.shorelineDatum.raftDeckWorldY, island.seaLevelTile * CONFIG.TILE_SIZE, `${contextLabel} raft datum mismatch`);
  for (const side of ["arrival", "far"]) {
    const plan = island.shorelinePlans.find((entry) => entry.side === side);
    assert.ok(plan, `${contextLabel} missing ${side} plan`);
    const zones = new Set(plan.columns.map((column) => column.zone));
    for (const zone of [SHORE_ZONES.SUBMERGED_SHELF, SHORE_ZONES.FORESHORE, SHORE_ZONES.DRY_BEACH, SHORE_ZONES.INLAND_TRANSITION]) assert.equal(zones.has(zone), true, `${contextLabel} ${side} missing ${zone}`);
    const shoreline = plan.columns.find((column) => column.tileX === plan.shorelineX);
    assert.equal(shoreline.surfaceTileY, island.seaLevelTile, `${contextLabel} ${side} shoreline not at waterline`);
    const managed = plan.columns.filter((column) => column.zone !== SHORE_ZONES.DEEP_OFFSHORE).sort((a, b) => a.tileX - b.tileX);
    for (let i = 1; i < managed.length; i += 1) assert.equal(Math.abs(managed[i].surfaceTileY - managed[i - 1].surfaceTileY) <= 1, true, `${contextLabel} ${side} steep shore step`);
    const [minCap, maxCap] = island.recipe.edgeProfiles[side].profile.materials.capDepthRange;
    for (const column of plan.columns) {
      if (column.zone === SHORE_ZONES.SUBMERGED_SHELF) {
        const exposed = island.tileMap.getTile(column.tileX, column.surfaceTileY);
        assert.equal(exposed, "sand", `${contextLabel} ${side} shelf exposed ${exposed}`);
        assert.notEqual(exposed, "grass", `${contextLabel} ${side} underwater grass`);
        assert.notEqual(exposed, "dirt", `${contextLabel} ${side} underwater dirt`);
      }
      if (![SHORE_ZONES.SUBMERGED_SHELF, SHORE_ZONES.FORESHORE, SHORE_ZONES.DRY_BEACH].includes(column.zone)) continue;
      const capDepth = contiguousTileDepth(island, column.tileX, column.surfaceTileY, "sand");
      assert.equal(capDepth >= minCap && capDepth <= maxCap, true, `${contextLabel} ${side} sand cap ${capDepth}`);
    }
  }
}

function contiguousTileDepth(island, x, startY, tileId) {
  let depth = 0;
  for (let y = startY; y < island.height; y += 1) {
    if (island.tileMap.getTile(x, y) !== tileId) break;
    depth += 1;
  }
  return depth;
}
