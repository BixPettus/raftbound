import { CONFIG } from "../config.js";
import { getStructureDefinition } from "../raft/structure-registry.js";
import { tileKey } from "./coordinates.js";

export const PLACEMENT_DOMAINS = Object.freeze({
  ISLAND_TERRAIN: "island_terrain",
  RAFT_BLOCK: "raft_block",
  RAFT_STRUCTURE: "raft_structure"
});

export const FAILURE_REASONS = Object.freeze({
  OUT_OF_RANGE: { code: "OUT_OF_RANGE", message: "Too far away." },
  NO_LINE_OF_SIGHT: { code: "NO_LINE_OF_SIGHT", message: "No clear line of sight." },
  CELL_OCCUPIED: { code: "CELL_OCCUPIED", message: "Space is occupied." },
  PLAYER_OVERLAP: { code: "PLAYER_OVERLAP", message: "Cannot place inside the player." },
  NO_SUPPORT: { code: "NO_SUPPORT", message: "Needs support underneath." },
  OUT_OF_BOUNDS: { code: "OUT_OF_BOUNDS", message: "Outside build bounds." },
  MISSING_ITEM: { code: "MISSING_ITEM", message: "Missing item." },
  INVALID_DOMAIN: { code: "INVALID_DOMAIN", message: "Cannot place that here." },
  INVALID_ITEM: { code: "INVALID_ITEM", message: "Invalid item." },
  PROTECTED_CELL: { code: "PROTECTED_CELL", message: "Cannot place on the spawn point." },
  WRONG_TOOL: { code: "WRONG_TOOL", message: "Wrong tool." },
  TOOL_TOO_WEAK: { code: "TOOL_TOO_WEAK", message: "Tool is too weak." },
  INVENTORY_FULL: { code: "INVENTORY_FULL", message: "Inventory is full." },
  ACTION_RECOVERING: { code: "ACTION_RECOVERING", message: "Still recovering." }
});

export function fail(code, message = null) {
  const base = FAILURE_REASONS[code] ?? { code, message: "Action failed." };
  return { ok: false, code: base.code, message: message ?? base.message, reason: message ?? base.message };
}

export function ok(extra = {}) {
  return { ok: true, ...extra };
}

export function validateRange(actor, tileX, tileY, rangeTiles) {
  const center = {
    x: (tileX + 0.5) * CONFIG.TILE_SIZE,
    y: (tileY + 0.5) * CONFIG.TILE_SIZE
  };
  return Math.hypot(center.x - actor.center().x, center.y - actor.center().y) <= rangeTiles * CONFIG.TILE_SIZE;
}

export function hasLineOfSight(tileMap, from, tileX, tileY) {
  const to = {
    x: (tileX + 0.5) * CONFIG.TILE_SIZE,
    y: (tileY + 0.5) * CONFIG.TILE_SIZE
  };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (CONFIG.TILE_SIZE * 0.5)));
  for (let i = 1; i < steps; i += 1) {
    const x = Math.floor((from.x + dx * (i / steps)) / CONFIG.TILE_SIZE);
    const y = Math.floor((from.y + dy * (i / steps)) / CONFIG.TILE_SIZE);
    if (x === tileX && y === tileY) continue;
    if (tileMap.isSolidTile(x, y)) return false;
  }
  return true;
}

export function rectForTile(tileX, tileY) {
  return {
    x: tileX * CONFIG.TILE_SIZE,
    y: tileY * CONFIG.TILE_SIZE,
    width: CONFIG.TILE_SIZE,
    height: CONFIG.TILE_SIZE
  };
}

export function rectsIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function hasIslandNeighbor(tileMap, tileX, tileY) {
  return [
    [tileX - 1, tileY],
    [tileX + 1, tileY],
    [tileX, tileY - 1],
    [tileX, tileY + 1]
  ].some(([x, y]) => tileMap.inBounds(x, y) && tileMap.getTile(x, y) !== "air");
}

export function raftStructureCells(raft) {
  const occupied = new Map();
  for (const structure of raft.structures) {
    const definition = getStructureDefinition(structure.structureType);
    for (let y = 0; y < definition.height; y += 1) {
      for (let x = 0; x < definition.width; x += 1) {
        occupied.set(tileKey(structure.gridX + x, structure.gridY + y), structure);
      }
    }
  }
  return occupied;
}
