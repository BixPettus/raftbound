import { generatedFeatureId } from "../../world/feature-id.js";
import { createEnemy } from "./enemy-factory.js";
import { getRuntimeEnemyDefinition } from "./enemy-registry.js";

export function spawnEnemiesForRecipe(context) {
  const random = context.randomStreams.get("enemies");
  const plan = context.recipe.enemySpawnPlan;
  const countsByType = {};
  const spawnedPositions = [];
  let budgetUsed = 0;
  for (const entries of groupEntriesByRegion(plan.entries)) {
    let regionalBudgetRemaining = Math.max(...entries.map((entry) => entry.regionalBudget ?? 0));
    const regionCounts = new Map();
    for (let attempts = 0; attempts < 80 && regionalBudgetRemaining > 0; attempts += 1) {
      const availableEntries = entries.filter((entry) => {
        const definition = getRuntimeEnemyDefinition(entry.enemyId);
        const spawned = regionCounts.get(entry) ?? 0;
        return definition.implemented
          && spawned < (entry.countLimits?.maxCount ?? 0)
          && regionalBudgetRemaining >= definition.threatCost;
      });
      if (!availableEntries.length) break;
      const entry = chooseWeightedEntry(availableEntries, random);
      const definition = getRuntimeEnemyDefinition(entry.enemyId);
      const spawned = regionCounts.get(entry) ?? 0;
      if (spawned >= (entry.countLimits?.minCount ?? 0) && random.next() > entry.density * 0.55) break;
      const point = pickSpawnPoint(context, random, definition, entry, spawnedPositions);
      if (!point) break;
      const ordinal = countsByType[entry.enemyId] ?? 0;
      context.enemies.push(createEnemy(entry.enemyId, point.tileX, point.tileY, generatedFeatureId({
        kind: "enemy",
        generationVersion: context.definition.generationVersion,
        islandSeed: context.definition.seed,
        featureType: entry.enemyId,
        tileX: point.tileX,
        tileY: point.tileY,
        ordinal
      })));
      spawnedPositions.push(point);
      countsByType[entry.enemyId] = ordinal + 1;
      regionCounts.set(entry, spawned + 1);
      regionalBudgetRemaining -= definition.threatCost;
      budgetUsed += definition.threatCost;
    }
  }
  context.diagnostics.enemySpawn = {
    budget: plan.enemySpawnBudget,
    used: budgetUsed,
    remaining: Math.max(0, plan.enemySpawnBudget - budgetUsed),
    countsByType
  };
}

export function chooseWeightedEntry(entries, random) {
  return random.weighted(entries, "weight");
}

function pickSpawnPoint(context, random, definition, entry, spawnedPositions) {
  const arrivalSafeEnd = context.profile.startX + context.recipe.edgeProfiles.arrival.width + definition.spawnConstraints.minDistanceFromDock;
  const farSafeStart = context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width - definition.spawnConstraints.minDistanceFromEdges;
  const minX = Math.max(entry.startX, arrivalSafeEnd);
  const maxX = Math.min(entry.endX - 1, farSafeStart);
  if (minX > maxX) return null;
  const minimumSpacing = definition.spawnConstraints.minimumSpacingTiles ?? 8;
  for (let attempts = 0; attempts < 80; attempts += 1) {
    const tileX = random.int(minX, maxX);
    const tileY = context.surfaceHeights[tileX] - 1;
    if (tileY <= 0 || context.tileMap.isSolidTile(tileX, tileY)) continue;
    if (spawnedPositions.some((point) => Math.hypot(point.tileX - tileX, point.tileY - tileY) < minimumSpacing)) continue;
    return { tileX, tileY };
  }
  return null;
}

function groupEntriesByRegion(entries) {
  const byRegion = new Map();
  for (const entry of entries) {
    if (!byRegion.has(entry.regionIndex)) byRegion.set(entry.regionIndex, []);
    byRegion.get(entry.regionIndex).push(entry);
  }
  return [...byRegion.values()];
}
