import { ResourceNode } from "../../entities/resource-node.js";
import { spawnEnemiesForRecipe } from "../../entities/enemies/enemy-spawn-system.js";
import { generatedFeatureId } from "../feature-id.js";

export function placeFeatures(context) {
  placeResources(context);
  placeEnemies(context);
}

function placeResources(context) {
  const random = context.randomStreams.get("surface-resources");
  const counts = ({ small: 1, medium: 1.35, large: 1.7 }[context.definition.size] ?? 1) * (context.recipe.generationModifiers.resourceMultiplier ?? 1);
  const beachOffset = context.recipe.edgeProfiles.arrival.width + 6;
  const guaranteed = [
    { type: "tree", tileX: context.profile.startX + beachOffset },
    { type: "surface_stone", tileX: context.profile.startX + beachOffset + 5 },
    { type: "fibre_plant", tileX: context.profile.startX + beachOffset + 10 }
  ];
  guaranteed.forEach((item) => addResource(context, item.type, item.tileX));
  for (const [type, count] of Object.entries({ tree: Math.ceil(8 * counts), surface_stone: Math.ceil(7 * counts), fibre_plant: Math.ceil(10 * counts) })) {
    for (let i = 0; i < count; i += 1) {
      addResource(context, type, random.int(context.profile.startX + beachOffset, context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width - 8));
    }
  }
}

function addResource(context, type, tileX) {
  const tileY = context.surfaceHeights[tileX] - 1;
  if (tileY <= 0 || context.tileMap.isSolidTile(tileX, tileY)) return;
  if (context.resources.some((node) => Math.abs(node.tileX - tileX) <= 1 && node.type === type)) return;
  const ordinal = context.resources.filter((node) => node.type === type).length;
  context.resources.push(ResourceNode.create(type, tileX, tileY, generatedFeatureId({
    kind: "resource",
    generationVersion: context.definition.generationVersion,
    islandSeed: context.definition.seed,
    featureType: type,
    tileX,
    tileY,
    ordinal
  })));
}

function placeEnemies(context) {
  spawnEnemiesForRecipe(context);
}
