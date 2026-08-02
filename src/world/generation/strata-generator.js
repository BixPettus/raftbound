import { contextIndex } from "./generation-context.js";
import { getStrataProfile } from "../content/biome-profile-registry.js";

export function fillStrata(context) {
  const { width, height } = context.definition;
  const patternRandom = context.randomStreams.get("strata-pattern");
  const patternSalt = Math.floor(patternRandom.next() * 0xffffffff);
  for (let x = 0; x < width; x += 1) {
    const surfaceY = context.surfaceHeights[x];
    const shorelineColumn = context.getShorelineColumn(x);
    const biome = context.getBiomeAt(x);
    for (let y = 0; y < height; y += 1) {
      if (y < surfaceY) {
        context.tileMap.setTile(x, y, "air");
        continue;
      }
      const ratio = (y - surfaceY) / Math.max(1, height - surfaceY);
      context.depthBands[contextIndex(context, x, y)] = ratio;
      if (y >= height - 3 || ratio >= 0.94) context.tileMap.setTile(x, y, "bedrock");
      else if (shorelineColumn) context.tileMap.setTile(x, y, tileForShorelineColumn(context, shorelineColumn, biome, ratio, x, y, patternSalt));
      else if (y === surfaceY) context.tileMap.setTile(x, y, surfaceTileForBlend(context, x, biome.tiles.surface));
      else context.tileMap.setTile(x, y, tileForStrata(context, biome.terrain.strataProfileId, ratio, x, y, patternSalt));
    }
  }
}

function tileForShorelineColumn(context, column, biome, ratio, x, y, patternSalt) {
  const depth = y - column.surfaceTileY;
  if (depth === 0) return column.surfaceTile;
  if (depth < column.capDepth) return column.capTile;
  if (depth < column.capDepth + column.substrateDepth) return column.substrateTile;
  if (column.zone === "DEEP_OFFSHORE" && depth < column.capDepth + column.substrateDepth + 5) return column.deepSubstrateTile;
  return tileForStrata(context, biome.terrain.strataProfileId, ratio, x, y, patternSalt, column.substrateTile);
}

function tileForStrata(context, profileId, ratio, x, y, patternSalt, shorelineSubstrate = null) {
  const profile = getStrataProfile(profileId);
  const boundaryNoise = valueNoise(context.definition.seed, x, y, 22, `${patternSalt}:${profileId}:boundary`) - 0.5;
  const adjustedRatio = clamp(ratio + boundaryNoise * 0.055, 0, 1);
  const layer = profile.layers.find((entry) => adjustedRatio <= entry.maximumDepthRatio) ?? profile.layers[profile.layers.length - 1];
  if (layer.alternateTile && ratio <= (layer.alternateMaximumDepthRatio ?? layer.maximumDepthRatio)) {
    const cluster = valueNoise(context.definition.seed, x, y, 7, `${patternSalt}:${profileId}:${layer.primaryTile}:${layer.alternateTile}`);
    const chance = layer.alternateChance ?? 0.12;
    if (cluster > 1 - chance) return layer.alternateTile;
  }
  if (shorelineSubstrate && ratio < 0.38 && layer.primaryTile === "dirt") {
    const substrateBlend = valueNoise(context.definition.seed, x, y, 11, `${patternSalt}:shore-substrate`);
    if (substrateBlend > 0.72) return shorelineSubstrate;
  }
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

function valueNoise(seed, x, y, scale, salt) {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smoothstep(fx - x0);
  const ty = smoothstep(fy - y0);
  const a = hashUnit(`${seed}:${salt}:${x0}:${y0}`);
  const b = hashUnit(`${seed}:${salt}:${x0 + 1}:${y0}`);
  const c = hashUnit(`${seed}:${salt}:${x0}:${y0 + 1}`);
  const d = hashUnit(`${seed}:${salt}:${x0 + 1}:${y0 + 1}`);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function hashUnit(input) {
  let hash = 2166136261;
  const text = String(input);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967295;
}

function smoothstep(t) {
  const clamped = clamp(t, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
