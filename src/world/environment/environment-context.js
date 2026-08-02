import { CONFIG } from "../../config.js";
import { getHazardDefinition } from "../content/hazard-registry.js";
import { worldToTile } from "../coordinates.js";

export function createEnvironmentContext({ player, world, localBiome }) {
  const tile = worldToTile(player.x + player.width / 2, player.y + player.height);
  const island = world.island;
  const surfaceY = island?.surfaceHeights?.[tile.tileX] ?? Infinity;
  const arrivalSafeEnd = island ? island.recipe.biomeRegions[0].startX : -Infinity;
  const farSafeStart = island ? island.width - island.recipe.edgeProfiles.far.width - 18 : Infinity;
  return {
    biomeId: localBiome?.id ?? null,
    zone: island && tile.tileY <= surfaceY ? "surface" : "underground",
    inWater: player.inWater,
    underground: island ? tile.tileY > surfaceY + 1 : false,
    safeZone: island ? tile.tileX < arrivalSafeEnd || tile.tileX >= farSafeStart : false,
    tileX: tile.tileX,
    tileY: tile.tileY,
    tileSize: CONFIG.TILE_SIZE,
    activeEnvironmentalEffectIds: island ? activeEnvironmentalEffectIds(player, island) : []
  };
}

function activeEnvironmentalEffectIds(player, island) {
  const active = new Set();
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  for (const node of island.resources ?? []) {
    if (node.destroyed || !node.hazardId) continue;
    const hazard = getHazardDefinition(node.hazardId);
    if (!hazard.effectId) continue;
    const radius = (hazard.radiusTiles ?? 1) * CONFIG.TILE_SIZE;
    const nodeCenterX = node.x + node.width / 2;
    const nodeCenterY = node.y + node.height / 2;
    if (Math.hypot(playerCenterX - nodeCenterX, playerCenterY - nodeCenterY) <= radius) active.add(hazard.effectId);
  }
  return [...active];
}
