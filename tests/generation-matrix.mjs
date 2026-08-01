import assert from "node:assert/strict";
import { CONFIG } from "../src/config.js";
import { generateIsland } from "../src/world/island-generator.js";

const sizes = ["small", "medium", "large"];
const reports = [];

for (let seedIndex = 0; seedIndex < 100; seedIndex += 1) {
  for (const size of sizes) {
    const seed = `matrix-${seedIndex.toString().padStart(3, "0")}`;
    const start = performance.now();
    const island = generateIsland({ seed, biome: "temperate", size, generationVersion: CONFIG.GENERATION_VERSION });
    const elapsed = performance.now() - start;
    const report = { ...island.generationReport, measuredMs: elapsed };
    reports.push(report);
    assert.equal(report.validationFailures.length, 0, `${seed} ${size} failed validation: ${report.validationFailures.join(",")}`);
    assert.equal(report.usedFallback, false, `${seed} ${size} used fallback`);
    assert.equal(report.entranceCount > 0, true, `${seed} ${size} missing entrance`);
    assert.equal(report.waterTileCount > 0, true, `${seed} ${size} missing water`);
    assert.equal(report.oreCounts.copper_ore > 0, true, `${seed} ${size} missing copper`);
    assert.equal(report.oreCounts.iron_ore > 0, true, `${seed} ${size} missing iron`);
    assert.equal(elapsed < 300, true, `${seed} ${size} exceeded hard ceiling: ${elapsed.toFixed(1)}ms`);
  }
}

const timings = reports.map((report) => report.measuredMs).sort((a, b) => a - b);
const p95 = percentile(timings, 0.95);
const p99 = percentile(timings, 0.99);
const fallbackCount = reports.filter((report) => report.usedFallback).length;

console.log(JSON.stringify({
  generated: reports.length,
  fallbackCount,
  p95Ms: Number(p95.toFixed(2)),
  p99Ms: Number(p99.toFixed(2)),
  maxMs: Number(timings[timings.length - 1].toFixed(2)),
  attemptDistribution: reports.reduce((counts, report) => {
    counts[report.selectedAttempt] = (counts[report.selectedAttempt] ?? 0) + 1;
    return counts;
  }, {}),
  caveAirRatio: {
    min: Number(Math.min(...reports.map((report) => report.caveAirRatio)).toFixed(4)),
    max: Number(Math.max(...reports.map((report) => report.caveAirRatio)).toFixed(4))
  }
}, null, 2));

function percentile(values, p) {
  const index = Math.min(values.length - 1, Math.ceil(values.length * p) - 1);
  return values[index];
}
