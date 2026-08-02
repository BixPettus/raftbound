import { generatedFeatureId } from "../../world/feature-id.js";
import { createEnemy } from "./enemy-factory.js";
import { getRuntimeEnemyDefinition } from "./enemy-registry.js";

export function spawnEnemiesForRecipe(context) {
  const random = context.randomStreams.get("enemies");
  const plan = context.recipe.enemySpawnPlan;
  const countsByType = {};
  const spawnedPositions = [];
  const enemySpawnByRegion = [];
  let budgetUsed = 0;
  for (const entries of groupEntriesByRegion(plan.entries)) {
    const regionIndex = entries[0]?.regionIndex ?? 0;
    const biomeId = entries[0]?.biomeId ?? "unknown";
    let regionalBudgetRemaining = Math.max(...entries.map((entry) => entry.regionalBudget ?? 0));
    const regionalBudget = regionalBudgetRemaining;
    let regionalUsed = 0;
    const regionalCountsByType = {};
    const regionCounts = new Map();
    for (let attempts = 0; attempts < 80 && regionalBudgetRemaining > 0; attempts += 1) {
      const availableEntries = entries.filter((entry) => {
        const definition = getRuntimeEnemyDefinition(entry.enemyId);
        const spawned = regionCounts.get(entry) ?? 0;
        return definition.implemented
          && isEntryRegionCompatible(entry, definition)
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
      const enemy = createEnemy(entry.enemyId, point.tileX, point.tileY, generatedFeatureId({
        kind: "enemy",
        generationVersion: context.definition.generationVersion,
        islandSeed: context.definition.seed,
        featureType: `${entry.regionIndex}:${entry.enemyId}`,
        tileX: point.tileX,
        tileY: point.tileY,
        ordinal
      }));
      enemy.biomeRegionIndex = entry.regionIndex;
      enemy.biomeId = entry.biomeId;
      context.enemies.push(enemy);
      spawnedPositions.push(point);
      countsByType[entry.enemyId] = ordinal + 1;
      regionalCountsByType[entry.enemyId] = (regionalCountsByType[entry.enemyId] ?? 0) + 1;
      regionCounts.set(entry, spawned + 1);
      regionalBudgetRemaining -= definition.threatCost;
      budgetUsed += definition.threatCost;
      regionalUsed += definition.threatCost;
    }
    enemySpawnByRegion.push({
      regionIndex,
      biomeId,
      budget: regionalBudget,
      used: regionalUsed,
      remaining: Math.max(0, regionalBudgetRemaining),
      countsByType: regionalCountsByType
    });
  }
  context.diagnostics.enemySpawn = {
    budget: plan.enemySpawnBudget,
    used: budgetUsed,
    remaining: Math.max(0, plan.enemySpawnBudget - budgetUsed),
    countsByType,
    enemySpawnByRegion
  };
}

export function chooseWeightedEntry(entries, random) {
  return random.weighted(entries, "weight");
}

function pickSpawnPoint(context, random, definition, entry, spawnedPositions) {
  const arrivalSafeEnd = context.profile.startX + context.recipe.edgeProfiles.arrival.width + (entry.safeZoneExclusionTiles ?? definition.spawnConstraints.minDistanceFromDock);
  const farSafeStart = context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width - definition.spawnConstraints.minDistanceFromEdges;
  const minX = Math.max(entry.startX, arrivalSafeEnd);
  const maxX = Math.min(entry.endX - 1, farSafeStart);
  if (minX > maxX) return null;
  const minimumSpacing = entry.minimumSpacingTiles ?? definition.spawnConstraints.minimumSpacingTiles ?? 8;
  for (let attempts = 0; attempts < 80; attempts += 1) {
    const tileX = random.int(minX, maxX);
    if (context.getBiomeAt(tileX).id !== entry.biomeId) continue;
    const tileY = context.surfaceHeights[tileX] - 1;
    if (tileY <= 0 || context.tileMap.isSolidTile(tileX, tileY)) continue;
    if (entry.requiresDryGround && context.waterMask[tileY * context.definition.width + tileX]) continue;
    if (spawnedPositions.some((point) => Math.hypot(point.tileX - tileX, point.tileY - tileY) < minimumSpacing)) continue;
    return { tileX, tileY };
  }
  return null;
}

function isEntryRegionCompatible(entry, definition) {
  const allowedRegion = entry.allowedRegion ?? definition.spawnConstraints.allowedRegion;
  if (!allowedRegion || allowedRegion === entry.biomeId) return true;
  if (allowedRegion === "shore") return false;
  return allowedRegion === entry.biomeId;
}

function groupEntriesByRegion(entries) {
  const byRegion = new Map();
  for (const entry of entries) {
    if (!byRegion.has(entry.regionIndex)) byRegion.set(entry.regionIndex, []);
    byRegion.get(entry.regionIndex).push(entry);
  }
  return [...byRegion.values()];
}
