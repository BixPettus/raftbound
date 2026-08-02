import { ResourceNode } from "../../entities/resource-node.js";
import { spawnEnemiesForRecipe } from "../../entities/enemies/enemy-spawn-system.js";
import { generatedFeatureId } from "../feature-id.js";
import { getResourceDefinition } from "../content/resource-registry.js";
import { getResourceTable } from "../content/resource-table-registry.js";

export function placeFeatures(context) {
  placeResources(context);
  placeEnemies(context);
}

function placeResources(context) {
  const random = context.randomStreams.get("surface-resources");
  for (let regionIndex = 0; regionIndex < context.recipe.biomeRegions.length; regionIndex += 1) {
    const region = context.recipe.biomeRegions[regionIndex];
    const biome = context.getBiomeAt(region.startX);
    const table = getResourceTable(biome.resources.surfaceTableId);
    const density = (table.densityBySize[context.definition.size] ?? 1) * (context.recipe.generationModifiers.resourceMultiplier ?? 1) * region.coverage;
    const minX = Math.max(region.startX + 4, context.profile.startX + context.recipe.edgeProfiles.arrival.width + 6);
    const maxX = Math.min(region.endX - 4, context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width - 8);
    if (minX > maxX) continue;

    let guaranteeOffset = 0;
    for (const entry of table.entries) {
      for (let i = 0; i < (entry.guarantee ?? 0); i += 1) {
        addResource(context, entry.resourceId, clamp(minX + guaranteeOffset, minX, maxX), regionIndex);
        guaranteeOffset += 5;
      }
    }

    for (const entry of table.entries) {
      const count = Math.ceil((entry.baseCount ?? 1) * density);
      for (let i = 0; i < count; i += 1) {
        addResource(context, entry.resourceId, random.int(minX, maxX), regionIndex);
      }
    }
  }
}

function addResource(context, type, tileX, regionIndex = 0) {
  const definition = getResourceDefinition(type);
  const tileY = context.surfaceHeights[tileX] - 1;
  if (tileY <= 0 || context.tileMap.isSolidTile(tileX, tileY)) return;
  const spacing = definition.placement.minimumSpacingTiles ?? 1;
  if (context.resources.some((node) => Math.hypot(node.tileX - tileX, node.tileY - tileY) < spacing)) return;
  const biome = context.getBiomeAt(tileX);
  if (!definition.placement.biomeIds.includes(biome.id)) return;
  const ordinal = context.resources.filter((node) => node.type === type).length;
  context.resources.push(ResourceNode.create(type, tileX, tileY, generatedFeatureId({
    kind: "resource",
    generationVersion: context.definition.generationVersion,
    islandSeed: context.definition.seed,
    featureType: `${regionIndex}:${type}`,
    tileX,
    tileY,
    ordinal
  })));
}

function placeEnemies(context) {
  spawnEnemiesForRecipe(context);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
