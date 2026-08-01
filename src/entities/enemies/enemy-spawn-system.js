import { generatedFeatureId } from "../../world/feature-id.js";
import { createEnemy } from "./enemy-factory.js";
import { getRuntimeEnemyDefinition } from "./enemy-registry.js";

export function spawnEnemiesForRecipe(context) {
  const random = context.randomStreams.get("enemies");
  const plan = context.recipe.enemySpawnPlan;
  let budgetRemaining = plan.enemySpawnBudget;
  const countsByType = {};
  for (const entry of plan.entries) {
    const definition = getRuntimeEnemyDefinition(entry.enemyId);
    if (!definition.implemented) continue;
    const maxCount = entry.maxCountBySize[context.definition.size] ?? 0;
    let spawned = 0;
    while (spawned < maxCount && budgetRemaining >= definition.threatCost) {
      if (spawned >= entry.minCount && random.next() > entry.density * 0.55) break;
      const point = pickSpawnPoint(context, random, definition);
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
      countsByType[entry.enemyId] = ordinal + 1;
      budgetRemaining -= definition.threatCost;
      spawned += 1;
    }
  }
  context.diagnostics.enemySpawn = {
    budget: plan.enemySpawnBudget,
    used: plan.enemySpawnBudget - budgetRemaining,
    remaining: budgetRemaining,
    countsByType
  };
}

function pickSpawnPoint(context, random, definition) {
  const arrivalSafeEnd = context.profile.startX + context.recipe.edgeProfiles.arrival.width + definition.spawnConstraints.minDistanceFromDock;
  const farSafeStart = context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width - definition.spawnConstraints.minDistanceFromEdges;
  for (let attempts = 0; attempts < 80; attempts += 1) {
    const tileX = random.int(arrivalSafeEnd, farSafeStart);
    const tileY = context.surfaceHeights[tileX] - 1;
    if (tileY <= 0 || context.tileMap.isSolidTile(tileX, tileY)) continue;
    return { tileX, tileY };
  }
  return null;
}

