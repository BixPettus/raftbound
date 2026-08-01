import { CONFIG } from "../config.js";
import { getItemDefinition } from "../items/item-registry.js";
import { INVENTORY_POLICIES } from "../items/player-inventory.js";
import { getStructureDefinition } from "../raft/structure-registry.js";
import { TileDamageSystem } from "./tile-damage-system.js";
import {
  PLACEMENT_DOMAINS,
  fail,
  ok,
  validateRange,
  hasLineOfSight,
  hasIslandNeighbor,
  raftStructureCells,
  rectForTile,
  rectsIntersect
} from "./placement-validator.js";
import { tileKey } from "./coordinates.js";

export class WorldEditSystem {
  constructor({ tileDamageSystem = new TileDamageSystem() } = {}) {
    this.tileDamageSystem = tileDamageSystem;
    this.previewState = null;
  }

  preview(command, context) {
    this.previewState = this.validate(command, context);
    return this.previewState;
  }

  validate(command, context) {
    if (command.operation === "DAMAGE_TERRAIN") return this.validateTerrainDamage(command, context);
    if (command.operation === "PLACE_BLOCK") return this.validateBlockPlacement(command, context);
    if (command.operation === "PLACE_STRUCTURE") return this.validateStructurePlacement(command, context);
    return fail("INVALID_ITEM");
  }

  execute(command, context) {
    const validation = this.validate(command, context);
    if (!validation.ok) return validation;
    if (command.operation === "DAMAGE_TERRAIN") return this.executeTerrainDamage(command, context, validation);
    if (command.operation === "PLACE_BLOCK") return this.executeBlockPlacement(command, context, validation);
    if (command.operation === "PLACE_STRUCTURE") return this.executeStructurePlacement(command, context, validation);
    return fail("INVALID_ITEM");
  }

  validateTerrainDamage(command, context) {
    const { target, tool } = command;
    if (!context.world.island) return fail("INVALID_DOMAIN");
    if (!target || !Number.isFinite(target.tileX) || !Number.isFinite(target.tileY)) return fail("OUT_OF_BOUNDS");
    if (!validateRange(context.player, target.tileX, target.tileY, CONFIG.TERRAIN_DIG_RANGE_TILES)) return fail("OUT_OF_RANGE");
    if (!hasLineOfSight(context.world.tileMap, context.player.center(), target.tileX, target.tileY)) return fail("NO_LINE_OF_SIGHT");
    if (!tool?.toolType) return fail("WRONG_TOOL");
    return ok({ operation: "DAMAGE_TERRAIN", domain: PLACEMENT_DOMAINS.ISLAND_TERRAIN, tileX: target.tileX, tileY: target.tileY });
  }

  executeTerrainDamage(command, context, validation) {
    const result = this.tileDamageSystem.applyDamage({
      tileMap: context.world.tileMap,
      tileX: validation.tileX,
      tileY: validation.tileY,
      tool: command.tool,
      tick: context.tick
    });
    if (!result.ok) return result;
    if (result.destroyed) {
      this.giveOrDropItems(result.drops ?? [], context, validation.tileX, validation.tileY);
      return ok({
        operation: "DAMAGE_TERRAIN",
        domain: PLACEMENT_DOMAINS.ISLAND_TERRAIN,
        affectedCells: [{ tileX: validation.tileX, tileY: validation.tileY }],
        producedDrops: result.drops ?? [],
        saveDirty: true
      });
    }
    return ok({
      operation: "DAMAGE_TERRAIN",
      domain: PLACEMENT_DOMAINS.ISLAND_TERRAIN,
      affectedCells: [{ tileX: validation.tileX, tileY: validation.tileY }],
      progress: result.progress,
      saveDirty: false
    });
  }

  validateBlockPlacement(command, context) {
    const { target, itemDefinition } = command;
    if (!itemDefinition?.placement?.tileId) return fail("INVALID_ITEM");
    if (!itemDefinition.placement.allowedDomains.includes(target.domain)) return fail("INVALID_DOMAIN");
    if (!context.player.items.hasItems([{ itemId: itemDefinition.id, quantity: 1 }], INVENTORY_POLICIES.SELECTED_STACK)) return fail("MISSING_ITEM");
    if (target.domain === PLACEMENT_DOMAINS.ISLAND_TERRAIN) return this.validateIslandBlock(target, context);
    if (target.domain === PLACEMENT_DOMAINS.RAFT_BLOCK) return this.validateRaftBlock(target, context);
    return fail("INVALID_DOMAIN");
  }

  validateIslandBlock(target, context) {
    if (!context.world.island) return fail("INVALID_DOMAIN");
    if (!context.world.tileMap.inBounds(target.tileX, target.tileY)) return fail("OUT_OF_BOUNDS");
    if (context.world.tileMap.getTile(target.tileX, target.tileY) !== "air") return fail("CELL_OCCUPIED");
    if (!validateRange(context.player, target.tileX, target.tileY, CONFIG.TERRAIN_DIG_RANGE_TILES)) return fail("OUT_OF_RANGE");
    if (!hasLineOfSight(context.world.tileMap, context.player.center(), target.tileX, target.tileY)) return fail("NO_LINE_OF_SIGHT");
    if (!hasIslandNeighbor(context.world.tileMap, target.tileX, target.tileY)) return fail("NO_SUPPORT", "Block must connect to island terrain.");
    if (rectsIntersect(context.player.bounds, rectForTile(target.tileX, target.tileY))) return fail("PLAYER_OVERLAP");
    return ok({ operation: "PLACE_BLOCK", domain: PLACEMENT_DOMAINS.ISLAND_TERRAIN, ...target, persistent: false, message: "Temporary island placement" });
  }

  validateRaftBlock(target, context) {
    const raft = context.world.raft;
    if (!raft.grid.inBounds(target.gridX, target.gridY)) return fail("OUT_OF_BOUNDS");
    if (!validateGridRange(context.player, raft, target.gridX, target.gridY, CONFIG.TERRAIN_DIG_RANGE_TILES)) return fail("OUT_OF_RANGE");
    if (raft.hasBlock(target.gridX, target.gridY)) return fail("CELL_OCCUPIED");
    if (raftStructureCells(raft).has(tileKey(target.gridX, target.gridY))) return fail("CELL_OCCUPIED");
    if (!isSupportedRaftBlock(raft, target.gridX, target.gridY)) return fail("NO_SUPPORT", "Dirt needs a raft foundation beneath it.");
    if (rectsIntersect(context.player.bounds, raftCellRect(raft, target.gridX, target.gridY))) return fail("PLAYER_OVERLAP");
    return ok({ operation: "PLACE_BLOCK", domain: PLACEMENT_DOMAINS.RAFT_BLOCK, ...target, persistent: true, message: "Persistent raft placement" });
  }

  executeBlockPlacement(command, context, validation) {
    const reservation = context.player.items.reserveItems([{ itemId: command.itemDefinition.id, quantity: 1 }], INVENTORY_POLICIES.SELECTED_STACK);
    if (!reservation.ok) return fail("MISSING_ITEM");
    let applied = false;
    if (validation.domain === PLACEMENT_DOMAINS.ISLAND_TERRAIN) {
      applied = context.world.tileMap.setTile(validation.tileX, validation.tileY, validation.tileId, true);
    } else if (validation.domain === PLACEMENT_DOMAINS.RAFT_BLOCK) {
      context.world.raft.addBlock(validation.tileId, validation.gridX, validation.gridY);
      applied = true;
    }
    if (!applied) {
      context.player.items.rollbackReservation(reservation);
      return fail("OUT_OF_BOUNDS");
    }
    context.player.items.commitReservation(reservation);
    return ok({
      operation: "PLACE_BLOCK",
      domain: validation.domain,
      consumedItems: [{ itemId: command.itemDefinition.id, quantity: 1 }],
      affectedCells: [{ tileX: validation.tileX, tileY: validation.tileY, gridX: validation.gridX, gridY: validation.gridY }],
      saveDirty: true
    });
  }

  validateStructurePlacement(command, context) {
    const { target, itemDefinition } = command;
    const structureType = target.structureType ?? itemDefinition?.placement?.structureType;
    if (!structureType) return fail("INVALID_ITEM");
    const definition = getStructureDefinition(structureType);
    const raft = context.world.raft;
    if (!raft.grid.inBounds(target.gridX, target.gridY)) return fail("OUT_OF_BOUNDS");
    if (!validateGridRange(context.player, raft, target.gridX, target.gridY, CONFIG.TERRAIN_DIG_RANGE_TILES)) return fail("OUT_OF_RANGE");
    if (!context.player.items.hasItems(definition.cost ?? [], INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS)) return fail("MISSING_ITEM");
    const occupied = raftStructureCells(raft);
    for (let y = 0; y < definition.height; y += 1) {
      for (let x = 0; x < definition.width; x += 1) {
        const gx = target.gridX + x;
        const gy = target.gridY + y;
        if (occupied.has(tileKey(gx, gy)) || raft.hasBlock(gx, gy)) return fail("CELL_OCCUPIED");
        if (rectsIntersect(context.player.bounds, raftCellRect(raft, gx, gy))) return fail("PLAYER_OVERLAP");
      }
    }
    if (definition.mustConnect && raft.structures.length > 0 && !hasAdjacentFoundation(raft, target.gridX, target.gridY)) {
      return fail("NO_SUPPORT", "Foundation must connect.");
    }
    if (definition.requiresSupport && !hasStructureSupport(raft, target.gridX, target.gridY)) {
      return fail("NO_SUPPORT", "Needs foundation support.");
    }
    return ok({ operation: "PLACE_STRUCTURE", domain: PLACEMENT_DOMAINS.RAFT_STRUCTURE, structureType, gridX: target.gridX, gridY: target.gridY, persistent: true });
  }

  executeStructurePlacement(command, context, validation) {
    const definition = getStructureDefinition(validation.structureType);
    const reservation = context.player.items.reserveItems(definition.cost ?? [], INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
    if (!reservation.ok) return fail("MISSING_ITEM");
    const structure = context.world.raft.addStructure(validation.structureType, validation.gridX, validation.gridY);
    context.player.items.commitReservation(reservation);
    return ok({
      operation: "PLACE_STRUCTURE",
      domain: PLACEMENT_DOMAINS.RAFT_STRUCTURE,
      consumedItems: definition.cost ?? [],
      affectedCells: [{ gridX: validation.gridX, gridY: validation.gridY }],
      createdEntityId: structure.id,
      saveDirty: true
    });
  }

  giveOrDropItems(drops, context, tileX, tileY) {
    for (const drop of drops) {
      const result = context.player.items.addItem(drop.itemId, drop.quantity);
      if (result.remaining > 0) {
        context.spawnItemDrop(drop.itemId, result.remaining, (tileX + 0.5) * CONFIG.TILE_SIZE, (tileY + 0.5) * CONFIG.TILE_SIZE);
      }
    }
  }
}

function validateGridRange(player, raft, gridX, gridY, rangeTiles) {
  const world = raft.gridToWorld(gridX, gridY);
  const center = { x: world.x + CONFIG.TILE_SIZE / 2, y: world.y + CONFIG.TILE_SIZE / 2 };
  return Math.hypot(center.x - player.center().x, center.y - player.center().y) <= rangeTiles * CONFIG.TILE_SIZE;
}

function raftCellRect(raft, gridX, gridY) {
  const pos = raft.gridToWorld(gridX, gridY);
  return { x: pos.x, y: pos.y, width: CONFIG.TILE_SIZE, height: CONFIG.TILE_SIZE };
}

function isSupportedRaftBlock(raft, gridX, gridY) {
  if (gridY >= 0 || gridY < -CONFIG.RAFT_BLOCK_STACK_LIMIT) return false;
  const below = gridY + 1;
  const support = raftStructureCells(raft).get(tileKey(gridX, below));
  return support?.structureType === "wood_foundation" || raft.hasBlock(gridX, below);
}

function hasAdjacentFoundation(raft, gridX, gridY) {
  const occupied = raftStructureCells(raft);
  return [
    [gridX - 1, gridY],
    [gridX + 1, gridY],
    [gridX, gridY - 1],
    [gridX, gridY + 1]
  ].some(([x, y]) => occupied.get(tileKey(x, y))?.structureType === "wood_foundation");
}

function hasStructureSupport(raft, gridX, gridY) {
  const occupied = raftStructureCells(raft);
  return occupied.get(tileKey(gridX, gridY + 1))?.structureType === "wood_foundation"
    || occupied.get(tileKey(gridX, gridY))?.structureType === "wood_foundation";
}

export function itemForStructure(structureType) {
  const definition = getStructureDefinition(structureType);
  return definition.itemId ? getItemDefinition(definition.itemId) : null;
}
