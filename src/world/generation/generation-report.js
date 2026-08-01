export function buildGenerationReport(context, validation, { usedFallback = false, elapsedMs = 0 } = {}) {
  const metrics = validation.metrics ?? context.diagnostics.metrics ?? {};
  return {
    seed: context.definition.seed,
    biome: context.definition.biome,
    size: context.definition.size,
    generationVersion: context.definition.generationVersion,
    selectedAttempt: context.diagnostics.attempt,
    usedFallback,
    width: context.definition.width,
    height: context.definition.height,
    seaLevelTile: context.definition.seaLevelTile,
    tileCounts: metrics.tileCounts ?? {},
    surfaceMinimum: metrics.surfaceMinimum,
    surfaceMaximum: metrics.surfaceMaximum,
    maximumSurfaceSlope: metrics.maximumSurfaceSlope,
    caveAirRatio: metrics.caveAirRatio,
    entranceCount: metrics.entranceCount,
    upperChamberCount: metrics.upperChamberCount,
    midChamberCount: metrics.midChamberCount,
    deepCavernCount: metrics.deepCavernCount,
    graphEdgeCount: metrics.graphEdgeCount,
    loopCount: metrics.loopCount,
    reachableCaveTiles: countReachableCaves(context),
    waterTileCount: metrics.waterTileCount,
    floodedCaveRatio: caveWaterRatio(context),
    dryCaveRatio: 1 - caveWaterRatio(context),
    resourceCounts: metrics.resourceCounts ?? {},
    oreCounts: metrics.oreCounts ?? {},
    enemyCount: metrics.enemyCount,
    stageTimingsMs: context.diagnostics.stageTimingsMs,
    totalGenerationMs: elapsedMs,
    validationFailures: validation.failures ?? []
  };
}

function countReachableCaves(context) {
  const reachable = context.diagnostics.reachable;
  if (!reachable) return 0;
  let count = 0;
  for (let i = 0; i < reachable.length; i += 1) {
    if (reachable[i] && context.caveMask[i]) count += 1;
  }
  return count;
}

function caveWaterRatio(context) {
  let caves = 0;
  let water = 0;
  for (let i = 0; i < context.caveMask.length; i += 1) {
    if (!context.caveMask[i]) continue;
    caves += 1;
    if (context.waterMask[i]) water += 1;
  }
  return caves > 0 ? water / caves : 0;
}
