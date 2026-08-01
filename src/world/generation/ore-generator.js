import { contextIndex } from "./generation-context.js";

export function placeOres(context) {
  const random = context.randomStreams.get("ores");
  for (const profile of context.profile.oreProfiles) {
    const clusters = profile.clustersByIslandSize[context.definition.size] ?? 5;
    for (let i = 0; i < clusters; i += 1) {
      const center = pickOreCenter(context, random, profile);
      if (!center) continue;
      const radius = random.int(profile.radiusRange[0], profile.radiusRange[1]);
      carveOreCluster(context, random, profile, center.x, center.y, radius);
    }
  }
}

function pickOreCenter(context, random, profile) {
  for (let attempts = 0; attempts < 80; attempts += 1) {
    const x = random.int(context.profile.startX + context.recipe.edgeProfiles.arrival.width + 12, context.definition.width - context.profile.endMargin - context.recipe.edgeProfiles.far.width - 12);
    const surfaceY = context.surfaceHeights[x];
    const y = random.int(surfaceY + 6, context.definition.height - 6);
    const ratio = context.depthBands[contextIndex(context, x, y)];
    if (ratio < profile.minimumDepthRatio || ratio > profile.maximumDepthRatio) continue;
    if (context.tileMap.isSolidTile(x, y) && context.tileMap.getTile(x, y) !== "bedrock") return { x, y };
  }
  return null;
}

function carveOreCluster(context, random, profile, centerX, centerY, radius) {
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (!context.tileMap.inBounds(x, y) || context.tileMap.getTile(x, y) === "bedrock" || context.tileMap.getTile(x, y) === "air") continue;
      const dist = Math.hypot(x - centerX, y - centerY) / radius;
      if (dist <= 1 && random.next() < profile.density * (1 - dist * 0.35)) context.tileMap.setTile(x, y, profile.tileId);
    }
  }
}
