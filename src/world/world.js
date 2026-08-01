import { CONFIG } from "../config.js?v=terrain-inventory-4";
import { TileMap } from "./tile-map.js?v=terrain-inventory-4";
import { WaterSystem } from "./water-system.js";

export class World {
  constructor({ island = null, raft }) {
    this.island = island;
    this.raft = raft;
    this.tileMap = island?.tileMap ?? new TileMap(110, CONFIG.ISLAND_HEIGHT, "air", CONFIG.SEA_LEVEL_TILE);
    this.waterSystem = new WaterSystem(CONFIG.SEA_LEVEL_TILE);
    this.width = this.tileMap.width;
    this.height = this.tileMap.height;
  }

  setIsland(island) {
    this.island = island;
    this.tileMap = island.tileMap;
    this.width = island.tileMap.width;
    this.height = island.tileMap.height;
    this.waterSystem = new WaterSystem(island.tileMap.seaLevelTile);
  }

  clearIsland() {
    this.island = null;
    this.tileMap = new TileMap(120, CONFIG.ISLAND_HEIGHT, "air", CONFIG.SEA_LEVEL_TILE);
    this.width = this.tileMap.width;
    this.height = this.tileMap.height;
    this.waterSystem = new WaterSystem(CONFIG.SEA_LEVEL_TILE);
  }

  getCollisionWorld() {
    return {
      isSolidTile: (tileX, tileY) => this.tileMap.isSolidTile(tileX, tileY),
      querySolidRects: (bounds) => [
        ...this.tileMap.querySolidRects(bounds),
        ...this.raft.querySolidRects(bounds)
      ]
    };
  }

  update(dt) {
    this.waterSystem.update(dt);
  }
}
