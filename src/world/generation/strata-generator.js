import { contextIndex } from "./generation-context.js";
import { getStrataProfile } from "../content/biome-profile-registry.js";

export function fillStrata(context) {
  const { width, height } = context.definition;
  for (let x = 0; x < width; x += 1) {
    const surfaceY = context.surfaceHeights[x];
    const edge = context.getEdgeAt(x);
    const biome = context.getBiomeAt(x);
    for (let y = 0; y < height; y += 1) {
      if (y < surfaceY) {
        context.tileMap.setTile(x, y, "air");
        continue;
      }
      const ratio = (y - surfaceY) / Math.max(1, height - surfaceY);
      context.depthBands[contextIndex(context, x, y)] = ratio;
      if (y >= height - 3 || ratio >= 0.94) context.tileMap.setTile(x, y, "bedrock");
      else if (edge && y === surfaceY) context.tileMap.setTile(x, y, edge.profile.surface.surfaceTile);
      else if (edge && y - surfaceY <= edge.profile.surface.transitionDepth) context.tileMap.setTile(x, y, edge.profile.surface.subsurfaceTile);
      else if (edge && y - surfaceY <= edge.profile.surface.transitionDepth + 3) context.tileMap.setTile(x, y, edge.profile.surface.deepTransitionTile);
      else if (y === surfaceY) context.tileMap.setTile(x, y, surfaceTileForBlend(context, x, biome.tiles.surface));
      else context.tileMap.setTile(x, y, tileForStrata(biome.terrain.strataProfileId, ratio, x, y));
    }
  }
}

function tileForStrata(profileId, ratio, x, y) {
  const profile = getStrataProfile(profileId);
  const layer = profile.layers.find((entry) => ratio <= entry.maximumDepthRatio) ?? profile.layers[profile.layers.length - 1];
  if (layer.alternateTile && layer.alternateModulo && (x + y) % layer.alternateModulo !== 0) return layer.alternateTile;
  return layer.primaryTile;
}

function surfaceTileForBlend(context, x, fallback) {
  const blend = context.getBiomeBlendAt(x);
  if (!blend || blend.primaryBiomeId === blend.secondaryBiomeId) return fallback;
  if (blend.primaryBiomeId === "temperate" && blend.secondaryBiomeId === "desert") {
    if (blend.blend > 0.66) return "sand";
    if (blend.blend > 0.33) return "dirt";
  }
  if (blend.primaryBiomeId === "desert" && blend.secondaryBiomeId === "temperate") {
    if (blend.blend > 0.66) return "grass";
    if (blend.blend > 0.33) return "dirt";
  }
  return fallback;
}
