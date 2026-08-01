import { CONFIG } from "../config.js?v=wp4-catalog-1";
import { Inventory } from "../items/inventory.js";
import { getStructureDefinition } from "./structure-registry.js";
import { RaftGrid } from "./raft-grid.js";
import { RaftBlockLayer } from "./raft-block-layer.js";

let structureCounter = 0;

export class Raft {
  constructor({ structures, storage, spawnPosition, baseTileX, baseTileY, baseWorldX, baseWorldY, blocks } = {}) {
    this.grid = new RaftGrid();
    this.baseWorldX = baseWorldX ?? (baseTileX ?? 8) * CONFIG.TILE_SIZE;
    this.baseWorldY = baseWorldY ?? raftDeckWorldY(baseTileY);
    this.syncBaseTiles();
    this.spawnPosition = spawnPosition ?? { gridX: 2, gridY: -3 };
    this.structures = structures ?? createInitialStructures();
    this.blocks = new RaftBlockLayer(blocks ?? []);
    primeStructureCounter(this.structures);
    this.storage = new Map();
    if (storage) {
      for (const [id, slots] of Object.entries(storage)) this.storage.set(id, new Inventory(12, slots));
    }
    this.ensureStorageForCrates();
  }

  static createInitial() {
    return new Raft();
  }

  ensureStorageForCrates() {
    for (const structure of this.structures) {
      const def = getStructureDefinition(structure.structureType);
      if (def.storageSlots && !this.storage.has(structure.id)) {
        this.storage.set(structure.id, new Inventory(def.storageSlots));
      }
    }
  }

  setDock(tileX, tileY) {
    this.baseWorldX = tileX * CONFIG.TILE_SIZE;
    this.baseWorldY = raftDeckWorldY(tileY);
    this.syncBaseTiles();
  }

  gridToWorld(gridX, gridY) {
    return {
      x: this.baseWorldX + gridX * CONFIG.TILE_SIZE,
      y: this.baseWorldY + gridY * CONFIG.TILE_SIZE
    };
  }

  worldToGrid(x, y) {
    return {
      gridX: Math.floor((x - this.baseWorldX) / CONFIG.TILE_SIZE),
      gridY: Math.floor((y - this.baseWorldY) / CONFIG.TILE_SIZE)
    };
  }

  getSpawnWorldPosition() {
    const pos = this.gridToWorld(this.spawnPosition.gridX, 0);
    return {
      x: pos.x + (CONFIG.TILE_SIZE - CONFIG.PLAYER_WIDTH) / 2,
      y: raftCollisionDeckY(this.baseWorldY) - CONFIG.PLAYER_HEIGHT
    };
  }

  solidTileAt(tileX, tileY) {
    const rect = {
      x: tileX * CONFIG.TILE_SIZE,
      y: tileY * CONFIG.TILE_SIZE,
      width: CONFIG.TILE_SIZE,
      height: CONFIG.TILE_SIZE
    };
    return this.querySolidRects(rect)[0]?.structure ?? null;
  }

  querySolidRects(bounds) {
    const rects = [];
    for (const structure of this.structures) {
      const def = getStructureDefinition(structure.structureType);
      if (!def.solid) continue;
      const pos = this.gridToWorld(structure.gridX, structure.gridY);
      const rect = {
        x: pos.x,
        y: structure.structureType === "wood_foundation" ? raftCollisionDeckY(pos.y) : pos.y,
        width: def.width * CONFIG.TILE_SIZE,
        height: def.height * CONFIG.TILE_SIZE,
        source: "raft",
        structure
      };
      if (intersects(bounds, rect)) rects.push(rect);
    }
    return [...rects, ...this.queryBlockCollisionRects(bounds)];
  }

  queryBlockCollisionRects(bounds) {
    return this.blocks.queryCollisionRects(bounds, this);
  }

  findNearbyStorage(worldX, worldY, maxDistanceTiles = 2) {
    for (const structure of this.structures) {
      const def = getStructureDefinition(structure.structureType);
      if (!def.storageSlots) continue;
      const pos = this.gridToWorld(structure.gridX, structure.gridY);
      const dx = pos.x + CONFIG.TILE_SIZE / 2 - worldX;
      const dy = pos.y + CONFIG.TILE_SIZE / 2 - worldY;
      if (Math.hypot(dx, dy) <= maxDistanceTiles * CONFIG.TILE_SIZE) return structure;
    }
    return null;
  }

  hasStation(stationType) {
    return this.structures.some((structure) => getStructureDefinition(structure.structureType).stationType === stationType);
  }

  addStructure(structureType, gridX, gridY) {
    const def = getStructureDefinition(structureType);
    const structure = {
      id: createStructureId(structureType),
      structureType,
      gridX,
      gridY,
      rotation: 0,
      health: def.maxHealth,
      state: {}
    };
    this.structures.push(structure);
    this.ensureStorageForCrates();
    return structure;
  }

  getBlock(gridX, gridY) {
    return this.blocks.get(gridX, gridY);
  }

  hasBlock(gridX, gridY) {
    return this.blocks.has(gridX, gridY);
  }

  addBlock(tileId, gridX, gridY) {
    return this.blocks.add(tileId, gridX, gridY);
  }

  removeBlock(gridX, gridY) {
    return this.blocks.remove(gridX, gridY);
  }

  serializeBlocks() {
    return this.blocks.serialize();
  }

  removeStructure(structureId) {
    const structure = this.structures.find((item) => item.id === structureId);
    if (!structure) return { ok: false, reason: "Structure not found." };
    const def = getStructureDefinition(structure.structureType);
    if (def.storageSlots) {
      const storage = this.storage.get(structure.id);
      const hasItems = storage?.slots.some(Boolean);
      if (hasItems) return { ok: false, reason: "Storage is not empty." };
    }
    this.structures = this.structures.filter((item) => item.id !== structureId);
    this.storage.delete(structure.id);
    return { ok: true };
  }

  serialize() {
    const storage = {};
    for (const [id, inventory] of this.storage.entries()) storage[id] = inventory.serialize();
    return {
      width: this.grid.width,
      height: this.grid.height,
      baseTileX: this.baseTileX,
      baseTileY: this.baseTileY,
      baseWorldX: this.baseWorldX,
      baseWorldY: this.baseWorldY,
      structures: this.structures.map((structure) => ({ ...structure, state: { ...structure.state } })),
      blocks: this.serializeBlocks(),
      storage,
      spawnPosition: { ...this.spawnPosition }
    };
  }

  syncBaseTiles() {
    this.baseTileX = Math.floor(this.baseWorldX / CONFIG.TILE_SIZE);
    this.baseTileY = Math.floor(this.baseWorldY / CONFIG.TILE_SIZE);
  }
}

function createInitialStructures() {
  const structures = [];
  for (let x = 0; x < 6; x += 1) {
    structures.push({ id: createStructureId("wood_foundation"), structureType: "wood_foundation", gridX: x, gridY: 0, rotation: 0, health: 100, state: {} });
  }
  structures.push({ id: createStructureId("sail"), structureType: "sail", gridX: 2, gridY: -2, rotation: 0, health: 120, state: {} });
  structures.push({ id: createStructureId("storage_crate"), structureType: "storage_crate", gridX: 4, gridY: -1, rotation: 0, health: 70, state: {} });
  structures.push({ id: createStructureId("workbench"), structureType: "workbench", gridX: 1, gridY: -1, rotation: 0, health: 90, state: {} });
  return structures;
}

function createStructureId(type) {
  structureCounter += 1;
  return `${type}-${structureCounter}`;
}

function primeStructureCounter(structures) {
  for (const structure of structures) {
    const match = /-(\d+)$/.exec(structure.id);
    if (match) structureCounter = Math.max(structureCounter, Number(match[1]));
  }
}

function raftDeckWorldY(dockTileY = CONFIG.SEA_LEVEL_TILE + CONFIG.RAFT_WATERLINE_TILE_OFFSET) {
  const seaLevelTile = dockTileY - CONFIG.RAFT_WATERLINE_TILE_OFFSET;
  return (seaLevelTile - CONFIG.RAFT_SUBMERGED_TILES) * CONFIG.TILE_SIZE;
}

function raftCollisionDeckY(visualDeckY) {
  return visualDeckY - CONFIG.RAFT_SUBMERGED_TILES * CONFIG.TILE_SIZE;
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
