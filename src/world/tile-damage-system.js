import { tileKey } from "./coordinates.js";
import { getTileDefinition } from "./tile-registry.js";
import { canToolDigTile } from "./terrain-digging.js";
import { fail, ok } from "./placement-validator.js";

export class TileDamageSystem {
  constructor() {
    this.damageByTile = new Map();
  }

  applyDamage({ tileMap, tileX, tileY, tool, tick = 0 }) {
    const tileId = tileMap.getTile(tileX, tileY);
    const definition = getTileDefinition(tileId);
    if (!definition.breakable) return fail("INVALID_ITEM", "Tile cannot be mined.");
    if (!tool?.toolType || tool.toolType !== definition.requiredTool) return fail("WRONG_TOOL", `Needs ${definition.requiredTool}.`);
    if (!canToolDigTile(tool, definition)) return fail("TOOL_TOO_WEAK");

    const key = tileKey(tileX, tileY);
    const state = this.damageByTile.get(key) ?? {
      tileX,
      tileY,
      accumulatedDamage: 0,
      lastDamageTick: tick,
      sourceToolType: tool.toolType
    };
    state.accumulatedDamage += tool.damage ?? 10;
    state.lastDamageTick = tick;
    state.sourceToolType = tool.toolType;

    const hardness = definition.hardness ?? 1;
    if (state.accumulatedDamage < hardness) {
      this.damageByTile.set(key, state);
      return ok({
        destroyed: false,
        tileId,
        damage: state.accumulatedDamage,
        hardness,
        progress: state.accumulatedDamage / hardness
      });
    }

    tileMap.removeTile(tileX, tileY);
    this.damageByTile.delete(key);
    return ok({
      destroyed: true,
      tileId,
      damage: hardness,
      hardness,
      progress: 1,
      drops: rollDropTable(definition.dropTable ?? [])
    });
  }

  clear(tileX, tileY) {
    this.damageByTile.delete(tileKey(tileX, tileY));
  }

  progressFor(tileX, tileY) {
    const state = this.damageByTile.get(tileKey(tileX, tileY));
    return state ? state.accumulatedDamage : 0;
  }
}

export function rollDropTable(dropTable = [], random = null) {
  const drops = [];
  for (const drop of dropTable) {
    const min = drop.min ?? drop.quantity ?? 1;
    const max = drop.max ?? drop.quantity ?? min;
    const quantity = random?.int ? random.int(min, max) : min;
    if (quantity > 0) drops.push({ itemId: drop.itemId, quantity });
  }
  return drops;
}
