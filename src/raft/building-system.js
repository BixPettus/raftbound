import { getStructureDefinition, listStructures } from "./structure-registry.js";
import { tileKey } from "../world/coordinates.js";

export class BuildingSystem {
  constructor(raft) {
    this.raft = raft;
    this.enabled = false;
    this.buildables = listStructures().filter((structure) => structure.itemId);
    this.selectedIndex = 0;
    this.preview = null;
  }

  toggle() {
    this.enabled = !this.enabled;
  }

  cancel() {
    this.enabled = false;
  }

  cycle() {
    this.selectedIndex = (this.selectedIndex + 1) % this.buildables.length;
  }

  get selectedStructure() {
    return this.buildables[this.selectedIndex];
  }

  updatePreview(worldX, worldY, inventory) {
    const grid = this.raft.worldToGrid(worldX, worldY);
    this.preview = {
      structureType: this.selectedStructure.id,
      gridX: grid.gridX,
      gridY: grid.gridY,
      validation: this.validatePlacement(this.selectedStructure.id, grid.gridX, grid.gridY, inventory)
    };
    return this.preview;
  }

  validatePlacement(structureType, gridX, gridY, inventory = null) {
    const definition = getStructureDefinition(structureType);
    if (!this.raft.grid.inBounds(gridX, gridY)) return { ok: false, reason: "Out of raft bounds." };
    if (inventory && definition.cost && !inventory.hasItems(definition.cost)) return { ok: false, reason: "Missing materials." };

    const occupied = this.raft.grid.occupiedCells(this.raft.structures);
    for (let y = 0; y < definition.height; y += 1) {
      for (let x = 0; x < definition.width; x += 1) {
        if (occupied.has(tileKey(gridX + x, gridY + y))) return { ok: false, reason: "Space occupied." };
      }
    }

    if (definition.mustConnect && this.raft.structures.length > 0 && !this.hasAdjacentFoundation(gridX, gridY)) {
      return { ok: false, reason: "Foundation must connect." };
    }

    if (definition.requiresSupport && !this.hasSupport(gridX, gridY)) {
      return { ok: false, reason: "Needs foundation support." };
    }

    return { ok: true, reason: "Valid placement." };
  }

  placeSelected(worldX, worldY, inventory) {
    return { ok: false, reason: "Structure placement must go through WorldEditSystem." };
  }

  hasAdjacentFoundation(gridX, gridY) {
    const occupied = this.raft.grid.occupiedCells(this.raft.structures);
    const neighbors = [
      [gridX - 1, gridY],
      [gridX + 1, gridY],
      [gridX, gridY - 1],
      [gridX, gridY + 1]
    ];
    return neighbors.some(([x, y]) => occupied.get(tileKey(x, y))?.structureType === "wood_foundation");
  }

  hasSupport(gridX, gridY) {
    const occupied = this.raft.grid.occupiedCells(this.raft.structures);
    return occupied.get(tileKey(gridX, gridY + 1))?.structureType === "wood_foundation" || occupied.get(tileKey(gridX, gridY))?.structureType === "wood_foundation";
  }
}
