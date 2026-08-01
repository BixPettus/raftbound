import { CONFIG } from "../config.js";
import { tileKey } from "../world/coordinates.js";
import { getStructureDefinition } from "./structure-registry.js";

export class RaftGrid {
  constructor(width = CONFIG.RAFT_MAX_WIDTH, height = CONFIG.RAFT_MAX_HEIGHT, extents = CONFIG.RAFT_EXTENTS) {
    this.width = width;
    this.height = height;
    this.extents = extents;
  }

  inBounds(gridX, gridY) {
    return gridX >= this.extents.minX
      && gridX <= this.extents.maxX
      && gridY >= this.extents.minY
      && gridY <= this.extents.maxY;
  }

  occupiedCells(structures) {
    const occupied = new Map();
    for (const structure of structures) {
      const definition = getStructureDefinition(structure.structureType);
      for (let y = 0; y < definition.height; y += 1) {
        for (let x = 0; x < definition.width; x += 1) {
          occupied.set(tileKey(structure.gridX + x, structure.gridY + y), structure);
        }
      }
    }
    return occupied;
  }

  isOccupied(structures, gridX, gridY) {
    return this.occupiedCells(structures).has(tileKey(gridX, gridY));
  }
}
