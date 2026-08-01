import { ResourceNode } from "../../entities/resource-node.js";
import { ShoreCrawler } from "../../entities/enemy.js";
import { generatedFeatureId } from "../feature-id.js";

export function placeFeatures(context) {
  placeResources(context);
  placeEnemies(context);
}

function placeResources(context) {
  const random = context.randomStreams.get("surface-resources");
  const counts = { small: 1, medium: 1.35, large: 1.7 }[context.definition.size] ?? 1;
  const guaranteed = [
    { type: "tree", tileX: context.profile.startX + 14 },
    { type: "surface_stone", tileX: context.profile.startX + 19 },
    { type: "fibre_plant", tileX: context.profile.startX + 24 }
  ];
  guaranteed.forEach((item) => addResource(context, item.type, item.tileX));
  for (const [type, count] of Object.entries({ tree: Math.ceil(8 * counts), surface_stone: Math.ceil(7 * counts), fibre_plant: Math.ceil(10 * counts) })) {
    for (let i = 0; i < count; i += 1) {
      addResource(context, type, random.int(context.profile.startX + 12, context.definition.width - context.profile.endMargin - 18));
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
  const random = context.randomStreams.get("enemies");
  const count = context.definition.size === "large" ? 3 : context.definition.size === "medium" ? 2 : 1;
  const minX = context.profile.startX + context.profile.arrivalFlatTiles + 35;
  const maxX = context.definition.width - context.profile.endMargin - 28;
  for (let i = 0; i < count; i += 1) {
    const tileX = random.int(minX, maxX);
    const tileY = context.surfaceHeights[tileX] - 1;
    context.enemies.push(ShoreCrawler.create(tileX, tileY, generatedFeatureId({
      kind: "enemy",
      generationVersion: context.definition.generationVersion,
      islandSeed: context.definition.seed,
      featureType: "shore-crawler",
      tileX,
      tileY,
      ordinal: i
    })));
  }
}
