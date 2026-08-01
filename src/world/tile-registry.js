import { TILE_DEFINITIONS } from "../data/tiles.js";

const tileMap = new Map(TILE_DEFINITIONS.map((tile) => [tile.id, Object.freeze({ ...tile })]));

export function getTileDefinition(tileId) {
  const tile = tileMap.get(tileId);
  if (!tile) throw new Error(`Unknown tile id: ${tileId}`);
  return tile;
}

export function listTiles() {
  return [...tileMap.values()];
}
