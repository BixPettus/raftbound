export function buildGenerationReport(context, validation, { usedFallback = false, elapsedMs = 0 } = {}) {
  const metrics = validation.metrics ?? context.diagnostics.metrics ?? {};
  return {
    seed: context.definition.seed,
    biome: context.definition.biome,
    size: context.definition.size,
    catalogVersion: context.definition.catalogVersion,
    generationVersion: context.definition.generationVersion,
    recipeHash: context.definition.recipeHash,
    templateId: context.definition.templateId,
    templateName: context.definition.templateName,
    archetypeId: context.definition.archetypeId,
    generationRating: context.recipe.generationRating,
    levelRating: context.recipe.level.rating,
    minimumAccessLevel: context.recipe.level.minimumAccessLevel,
    dangerScore: context.recipe.danger.finalScore,
    dangerTier: context.recipe.danger.tier,
    dangerBreakdown: context.recipe.danger,
    biomeRegions: context.recipe.biomeRegions,
    edgeProfiles: {
      arrival: context.recipe.edges.arrival,
      far: context.recipe.edges.far
    },
    specialAttributes: context.recipe.specialAttributes,
    selectedAttempt: context.diagnostics.attempt,
    usedFallback,
    failedAttempts: context.diagnostics.failedAttempts ?? [],
    width: context.definition.width,
    height: context.definition.height,
    seaLevelTile: context.definition.seaLevelTile,
    shorelineDatum: context.shorelineDatum,
    shorelinePlans: context.shorelinePlans.map((plan) => ({
      side: plan.side,
      offshoreStartX: plan.offshoreStartX,
      shorelineX: plan.shorelineX,
      foreshoreEndX: plan.foreshoreEndX,
      dryBeachEndX: plan.dryBeachEndX,
      inlandTransitionEndX: plan.inlandTransitionEndX,
      zones: [...new Set(plan.columns.map((column) => column.zone))]
    })),
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
    geology: metrics.geology,
    resourceCounts: metrics.resourceCounts ?? {},
    oreCounts: metrics.oreCounts ?? {},
    enemyCount: metrics.enemyCount,
    enemySpawnBudget: context.diagnostics.enemySpawn?.budget ?? 0,
    enemySpawnBudgetUsed: context.diagnostics.enemySpawn?.used ?? 0,
    enemySpawnBudgetRemaining: context.diagnostics.enemySpawn?.remaining ?? 0,
    enemyCountsByType: context.diagnostics.enemySpawn?.countsByType ?? {},
    enemySpawnByRegion: context.diagnostics.enemySpawn?.enemySpawnByRegion ?? [],
    enemyLevels: context.enemies.map((enemy) => enemy.level),
    realizedThreat: realizedThreat(context),
    stageTimingsMs: context.diagnostics.stageTimingsMs,
    totalGenerationMs: elapsedMs,
    validationFailures: validation.failures ?? []
  };
}

function realizedThreat(context) {
  const enemyThreatTotal = context.enemies.reduce((sum, enemy) => sum + (enemy.threatCost ?? 0), 0);
  const enemyLevels = context.enemies.map((enemy) => enemy.level ?? 1);
  return {
    enemyThreatTotal,
    hazardThreatTotal: 0,
    enemyCount: context.enemies.length,
    averageEnemyLevel: enemyLevels.length ? Number((enemyLevels.reduce((sum, level) => sum + level, 0) / enemyLevels.length).toFixed(2)) : 0,
    highestEnemyLevel: enemyLevels.length ? Math.max(...enemyLevels) : 0
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
