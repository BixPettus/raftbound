import { CONFIG } from "../config.js?v=wp4-catalog-1";
import { getTileDefinition } from "./tile-registry.js";
import { tileKey, worldToTile } from "./coordinates.js";

export class TileMap {
  constructor(width, height, defaultTile = "air", seaLevelTile = CONFIG.SEA_LEVEL_TILE) {
    this.width = width;
    this.height = height;
    this.defaultTile = defaultTile;
    this.seaLevelTile = seaLevelTile;
    this.tiles = new Array(width * height).fill(defaultTile);
    this.waterMask = null;
    this.modifiedTiles = new Map();
  }

  index(tileX, tileY) {
    return tileY * this.width + tileX;
  }

  inBounds(tileX, tileY) {
    return tileX >= 0 && tileY >= 0 && tileX < this.width && tileY < this.height;
  }

  getTile(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return this.defaultTile;
    return this.tiles[this.index(tileX, tileY)];
  }

  setTile(tileX, tileY, tileId, recordModification = false) {
    if (!this.inBounds(tileX, tileY)) return false;
    this.tiles[this.index(tileX, tileY)] = tileId;
    if (recordModification) this.modifiedTiles.set(tileKey(tileX, tileY), tileId);
    return true;
  }

  isSolidTile(tileX, tileY) {
    return getTileDefinition(this.getTile(tileX, tileY)).solid;
  }

  isWaterTile(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return false;
    if (this.waterMask) return this.waterMask[this.index(tileX, tileY)] === 1;
    const tileId = this.getTile(tileX, tileY);
    const tile = getTileDefinition(tileId);
    return tile.liquid || (tileY >= this.seaLevelTile && !tile.solid);
  }

  setWaterMask(waterMask) {
    this.waterMask = waterMask;
  }

  waterAt(tileX, tileY) {
    return this.isWaterTile(tileX, tileY);
  }

  isHazardTile(tileX, tileY) {
    const tile = getTileDefinition(this.getTile(tileX, tileY));
    return tile.damaging ? tile : null;
  }

  removeTile(tileX, tileY) {
    return this.setTile(tileX, tileY, "air", true);
  }

  applyModifications(modifiedTiles = []) {
    for (const change of modifiedTiles) {
      this.setTile(change.tileX, change.tileY, change.tileId, true);
    }
  }

  serializeModifications() {
    return [...this.modifiedTiles.entries()].map(([key, tileId]) => {
      const [tileX, tileY] = key.split(",").map(Number);
      return { tileX, tileY, tileId };
    });
  }

  querySolidTiles(bounds) {
    const min = worldToTile(bounds.x, bounds.y);
    const max = worldToTile(bounds.x + bounds.width, bounds.y + bounds.height);
    const tiles = [];
    for (let y = min.tileY; y <= max.tileY; y += 1) {
      for (let x = min.tileX; x <= max.tileX; x += 1) {
        if (this.isSolidTile(x, y)) tiles.push({ tileX: x, tileY: y });
      }
    }
    return tiles;
  }

  querySolidRects(bounds) {
    return this.querySolidTiles(bounds).map(({ tileX, tileY }) => ({
      x: tileX * CONFIG.TILE_SIZE,
      y: tileY * CONFIG.TILE_SIZE,
      width: CONFIG.TILE_SIZE,
      height: CONFIG.TILE_SIZE,
      tileX,
      tileY,
      source: "terrain"
    }));
  }
}
