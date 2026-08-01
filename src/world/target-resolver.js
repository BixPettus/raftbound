import { CONFIG } from "../config.js";
import { worldToTile } from "./coordinates.js";
import { PLACEMENT_DOMAINS, fail, ok, validateRange, hasLineOfSight } from "./placement-validator.js";

export class TargetResolver {
  resolve({ actor, pointerWorldX, pointerWorldY, actionType, itemDefinition, world, buildingSystem = null }) {
    if (actionType === "mine") return this.resolveMine({ actor, pointerWorldX, pointerWorldY, itemDefinition, world });
    if (actionType === "harvest") return this.resolveHarvest({ actor, pointerWorldX, pointerWorldY, itemDefinition, world });
    if (actionType === "spear") return this.resolveSpear({ actor, itemDefinition, world });
    if (actionType === "place") return this.resolvePlacement({ actor, pointerWorldX, pointerWorldY, itemDefinition, world, buildingSystem });
    return fail("INVALID_ITEM");
  }

  resolveMine({ actor, pointerWorldX, pointerWorldY, itemDefinition, world }) {
    const target = worldToTile(pointerWorldX, pointerWorldY);
    if (!world.tileMap.inBounds(target.tileX, target.tileY)) return fail("OUT_OF_BOUNDS");
    if (world.tileMap.getTile(target.tileX, target.tileY) === "air") return fail("INVALID_ITEM", "No terrain there.");
    if (!validateRange(actor, target.tileX, target.tileY, CONFIG.TERRAIN_DIG_RANGE_TILES)) return fail("OUT_OF_RANGE");
    if (!hasLineOfSight(world.tileMap, actor.center(), target.tileX, target.tileY)) return fail("NO_LINE_OF_SIGHT");
    return ok({ targetType: "terrain", domain: PLACEMENT_DOMAINS.ISLAND_TERRAIN, tileX: target.tileX, tileY: target.tileY, itemDefinition });
  }

  resolveHarvest({ actor, pointerWorldX, pointerWorldY, itemDefinition, world }) {
    const node = (world.island?.resources ?? []).find((candidate) => !candidate.destroyed && pointInRect(pointerWorldX, pointerWorldY, candidate));
    if (!node) return fail("INVALID_ITEM", "No resource targeted.");
    if (distance(actor.center(), node.center()) > CONFIG.PLAYER_INTERACTION_RANGE_TILES * CONFIG.TILE_SIZE) return fail("OUT_OF_RANGE");
    if (!hasLineOfSight(world.tileMap, actor.center(), node.tileX, node.tileY)) return fail("NO_LINE_OF_SIGHT");
    return ok({ targetType: "resource", targetId: node.id, node, itemDefinition });
  }

  resolveSpear({ actor, itemDefinition, world }) {
    const range = (CONFIG.PLAYER_INTERACTION_RANGE_TILES * CONFIG.TILE_SIZE) * 0.8;
    const hitBox = {
      x: actor.facing > 0 ? actor.x + actor.width : actor.x - range,
      y: actor.y + actor.height * 0.25,
      width: range,
      height: actor.height * 0.5
    };
    const enemy = (world.island?.enemies ?? []).find((candidate) => !candidate.destroyed && rectsIntersect(hitBox, candidate.bounds));
    if (!enemy) return fail("OUT_OF_RANGE", "No enemy in front.");
    return ok({ targetType: "enemy", targetId: enemy.id, enemy, itemDefinition });
  }

  resolvePlacement({ actor, pointerWorldX, pointerWorldY, itemDefinition, world, buildingSystem }) {
    const placement = itemDefinition?.placement;
    if (!placement) return fail("INVALID_ITEM");
    if (placement.type === "structure") {
      const grid = world.raft.worldToGrid(pointerWorldX, pointerWorldY);
      return ok({
        targetType: "placement",
        domain: PLACEMENT_DOMAINS.RAFT_STRUCTURE,
        gridX: grid.gridX,
        gridY: grid.gridY,
        structureType: placement.structureType,
        itemDefinition,
        buildingSystem
      });
    }

    const tile = worldToTile(pointerWorldX, pointerWorldY);
    const grid = world.raft.worldToGrid(pointerWorldX, pointerWorldY);
    const overRaft = world.raft.grid.inBounds(grid.gridX, grid.gridY) && grid.gridY <= 0;
    const domain = overRaft && placement.allowedDomains.includes(PLACEMENT_DOMAINS.RAFT_BLOCK)
      ? PLACEMENT_DOMAINS.RAFT_BLOCK
      : PLACEMENT_DOMAINS.ISLAND_TERRAIN;

    return ok({
      targetType: "placement",
      domain,
      tileX: tile.tileX,
      tileY: tile.tileY,
      gridX: grid.gridX,
      gridY: grid.gridY,
      tileId: placement.tileId,
      itemDefinition
    });
  }
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
