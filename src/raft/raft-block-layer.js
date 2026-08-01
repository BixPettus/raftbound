import { CONFIG } from "../config.js";
import { tileKey } from "../world/coordinates.js";

export class RaftBlockLayer {
  constructor(blocks = []) {
    this.blocks = new Map();
    for (const block of Array.isArray(blocks) ? blocks : Object.values(blocks ?? {})) {
      if (!Number.isFinite(block.gridX) || !Number.isFinite(block.gridY) || !block.tileId) continue;
      this.blocks.set(tileKey(block.gridX, block.gridY), {
        gridX: block.gridX,
        gridY: block.gridY,
        tileId: block.tileId,
        health: block.health ?? 100,
        state: { ...(block.state ?? {}) }
      });
    }
  }

  get(gridX, gridY) {
    return this.blocks.get(tileKey(gridX, gridY)) ?? null;
  }

  has(gridX, gridY) {
    return this.blocks.has(tileKey(gridX, gridY));
  }

  add(tileId, gridX, gridY) {
    const block = { gridX, gridY, tileId, health: 100, state: {} };
    this.blocks.set(tileKey(gridX, gridY), block);
    return block;
  }

  remove(gridX, gridY) {
    const key = tileKey(gridX, gridY);
    const block = this.blocks.get(key);
    this.blocks.delete(key);
    return block;
  }

  values() {
    return [...this.blocks.values()];
  }

  serialize() {
    return this.values().map((block) => ({ ...block, state: { ...block.state } }));
  }

  queryCollisionRects(bounds, raft) {
    const rects = [];
    for (const block of this.blocks.values()) {
      const pos = raft.gridToWorld(block.gridX, block.gridY);
      const rect = {
        x: pos.x,
        y: pos.y,
        width: CONFIG.TILE_SIZE,
        height: CONFIG.TILE_SIZE,
        source: "raft_block",
        block
      };
      if (intersects(bounds, rect)) rects.push(rect);
    }
    return rects;
  }
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
