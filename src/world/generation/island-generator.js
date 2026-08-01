import { CONFIG } from "../../config.js";
import { createGenerationContext, createIslandDefinition, stageTiming } from "./generation-context.js";
import { generateSurface } from "./surface-generator.js";
import { fillStrata } from "./strata-generator.js";
import { createCaveGraph } from "./cave-graph.js";
import { carveCaves } from "./cave-carver.js";
import { generateWaterMask } from "./water-mask.js";
import { placeOres } from "./ore-generator.js";
import { placeFeatures } from "./feature-placer.js";
import { validateGeneratedIsland } from "./island-validator.js";
import { buildGenerationReport } from "./generation-report.js";

export { createIslandDefinition };

export function generateIslandV3(options) {
  const definition = createIslandDefinition(options);
  const start = now();
  const failedAttempts = [];
  for (let attempt = 0; attempt < CONFIG.GENERATION_MAX_ATTEMPTS; attempt += 1) {
    const context = runAttempt(definition, attempt);
    const validation = validateGeneratedIsland(context);
    if (validation.ok) return finalizeIsland(context, validation, { elapsedMs: now() - start });
    failedAttempts.push({ attempt, failures: validation.failures });
  }
  const context = runAttempt(definition, 0, true);
  const validation = validateGeneratedIsland(context);
  if (!validation.ok) {
    const attemptSummary = failedAttempts
      .map(({ attempt, failures }) => `attempt ${attempt}: ${failures.join(",")}`)
      .join("; ");
    throw new Error(`Generation V3 fallback invalid for ${definition.seed}/${definition.size}: ${validation.failures.join(",")} after ${attemptSummary}`);
  }
  context.diagnostics.validationFailures = [];
  context.diagnostics.failedAttempts = failedAttempts;
  return finalizeIsland(context, validation, { usedFallback: true, elapsedMs: now() - start });
}

function runAttempt(definition, attempt, fallback = false) {
  const context = createGenerationContext(definition, attempt);
  stageTiming(context, "surface", () => generateSurface(context));
  stageTiming(context, "strata", () => fillStrata(context));
  stageTiming(context, "caveGraph", () => createCaveGraph(context));
  stageTiming(context, "caves", () => carveCaves(context));
  stageTiming(context, "arrivalRepair", () => repairArrival(context));
  stageTiming(context, "water", () => generateWaterMask(context));
  stageTiming(context, "ores", () => placeOres(context));
  stageTiming(context, "features", () => placeFeatures(context));
  if (fallback) repairArrival(context);
  return context;
}

function finalizeIsland(context, validation, options) {
  const report = buildGenerationReport(context, validation, options);
  const island = {
    ...context.definition,
    tileMap: context.tileMap,
    surfaceHeights: context.surfaceHeights,
    caveGraph: context.caveGraph,
    caveMask: context.caveMask,
    waterMask: context.waterMask,
    resources: context.resources,
    enemies: context.enemies,
    itemDrops: [],
    removedResourceIds: new Set(),
    openedContainerIds: new Set(),
    raftDockTile: context.raftDockTile,
    playerSpawnTile: context.playerSpawnTile,
    generationReport: report
  };
  exposeDevelopmentHelpers(island);
  return island;
}

function repairArrival(context) {
  const startX = context.profile.startX;
  const sea = context.definition.seaLevelTile;
  for (let x = startX - 2; x < startX; x += 1) {
    for (let y = sea - 8; y < sea + 1; y += 1) context.tileMap.setTile(x, y, "air");
  }
  for (let x = startX; x <= startX + context.profile.arrivalFlatTiles; x += 1) {
    for (let y = sea - 8; y < sea - 1; y += 1) context.tileMap.setTile(x, y, "air");
    context.tileMap.setTile(x, sea - 1, "grass");
    for (let y = sea; y < Math.min(context.definition.height - 3, sea + 8); y += 1) context.tileMap.setTile(x, y, y > sea + 4 ? "stone" : "dirt");
  }
}

function exposeDevelopmentHelpers(island) {
  if (!CONFIG.DEVELOPMENT_MODE || typeof window === "undefined") return;
  window.__RAFTBOUND_GENERATION_REPORT__ = island.generationReport;
  window.__RAFTBOUND_GENERATE_ISLAND__ = (options) => generateIslandV3({ generationVersion: CONFIG.GENERATION_VERSION, ...options });
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
