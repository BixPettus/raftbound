import { CONFIG } from "../../config.js";
import { contextIndex } from "./generation-context.js";

export function buildTraversalGrid(context, starts) {
  const reachable = new Uint8Array(context.definition.width * context.definition.height);
  const queue = [];
  const enqueue = (x, y) => {
    if (!canStand(context, x, y)) return;
    const index = contextIndex(context, x, y);
    if (reachable[index]) return;
    reachable[index] = 1;
    queue.push([x, y]);
  };
  starts.forEach(({ tileX, tileY }) => enqueue(tileX, tileY));
  for (let i = 0; i < queue.length; i += 1) {
    const [x, y] = queue[i];
    for (let dx = -3; dx <= 3; dx += 1) {
      for (let dy = -4; dy <= 6; dy += 1) {
        if (Math.abs(dx) + Math.abs(dy) > 7) continue;
        enqueue(x + dx, y + dy);
      }
    }
  }
  return reachable;
}

export function canStand(context, tileX, tileY) {
  const widthTiles = Math.ceil(CONFIG.PLAYER_WIDTH / CONFIG.TILE_SIZE);
  const heightTiles = Math.ceil(CONFIG.PLAYER_HEIGHT / CONFIG.TILE_SIZE);
  if (tileX < 0 || tileY < 0 || tileX + widthTiles >= context.definition.width || tileY + heightTiles >= context.definition.height) return false;
  for (let y = tileY; y < tileY + heightTiles; y += 1) {
    for (let x = tileX; x < tileX + widthTiles; x += 1) {
      if (context.tileMap.isSolidTile(x, y)) return false;
    }
  }
  let hasFloor = false;
  const floorY = tileY + heightTiles;
  for (let x = tileX; x < tileX + widthTiles; x += 1) {
    if (context.tileMap.inBounds(x, floorY) && context.tileMap.isSolidTile(x, floorY)) hasFloor = true;
  }
  return hasFloor || context.tileMap.isWaterTile(tileX, tileY + heightTiles - 1);
}
