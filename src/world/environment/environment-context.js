import { CONFIG } from "../../config.js";
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
    tileSize: CONFIG.TILE_SIZE
  };
}
