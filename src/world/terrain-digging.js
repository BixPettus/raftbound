import { getTileDefinition } from "./tile-registry.js";

export function tryDigTile(tileMap, tileX, tileY, tool, inventory) {
  const tileId = tileMap.getTile(tileX, tileY);
  const tile = getTileDefinition(tileId);
  if (!tile.breakable) return { ok: false, reason: "Tile cannot be dug." };
  if (!canToolDigTile(tool, tile)) return { ok: false, reason: tile.requiredTool ? `Needs ${tile.requiredTool}.` : "Needs a stronger tool." };
  if (!tileMap.removeTile(tileX, tileY)) return { ok: false, reason: "Tile is outside the world." };

  const drops = [];
  for (const drop of tile.dropTable ?? []) {
    const min = drop.min ?? drop.quantity ?? 1;
    const max = drop.max ?? drop.quantity ?? min;
    const quantity = min === max ? min : min + Math.floor(Math.random() * (max - min + 1));
    if (quantity <= 0) continue;
    inventory.addItem(drop.itemId, quantity);
    drops.push({ itemId: drop.itemId, quantity });
  }
  return { ok: true, tileId, drops };
}

export function tryPlaceTile(tileMap, tileX, tileY, tileId, inventory, sourceItemId) {
  if (!tileId || tileMap.getTile(tileX, tileY) !== "air") return { ok: false, reason: "Tile space is occupied." };
  if (!hasNeighbor(tileMap, tileX, tileY)) return { ok: false, reason: "Tile must connect to terrain." };
  if (!tileMap.setTile(tileX, tileY, tileId, true)) return { ok: false, reason: "Tile is outside the world." };
  if (sourceItemId && inventory && !inventory.removeItem(sourceItemId, 1)) {
    tileMap.removeTile(tileX, tileY);
    return { ok: false, reason: "Missing item." };
  }
  return { ok: true, tileId };
}

export function canToolDigTile(tool, tile) {
  if (!tool?.toolType) return false;
  if (tile.requiredTool && tool.toolType !== tile.requiredTool) return false;
  return (tool.toolPower ?? 0) >= (tile.minimumToolPower ?? 0);
}

function hasNeighbor(tileMap, tileX, tileY) {
  const neighbors = [
    [tileX - 1, tileY],
    [tileX + 1, tileY],
    [tileX, tileY - 1],
    [tileX, tileY + 1]
  ];
  return neighbors.some(([x, y]) => tileMap.inBounds(x, y) && tileMap.getTile(x, y) !== "air");
}
