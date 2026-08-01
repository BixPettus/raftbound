import { CONFIG } from "../config.js";

export class WaterSystem {
  constructor(seaLevelTile = CONFIG.SEA_LEVEL_TILE) {
    this.seaLevelTile = seaLevelTile;
    this.seaLevelY = seaLevelTile * CONFIG.TILE_SIZE;
    this.animationTime = 0;
  }

  update(dt) {
    this.animationTime += dt;
  }

  containsPoint(x, y, tileMap) {
    const tileX = Math.floor(x / CONFIG.TILE_SIZE);
    const tileY = Math.floor(y / CONFIG.TILE_SIZE);
    return y >= this.seaLevelY && (!tileMap || tileMap.isWaterTile(tileX, tileY));
  }

  isHeadUnderwater(player, tileMap) {
    return this.containsPoint(player.x + player.width / 2, player.y + 8, tileMap);
  }
}
