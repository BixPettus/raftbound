import { CONFIG } from "../config.js";
import { INVENTORY_POLICIES } from "./player-inventory.js";

export function rollDrops(dropTable = [], random = null) {
  const drops = [];
  for (const drop of dropTable) {
    const chance = drop.chance ?? 1;
    if (random?.next && random.next() > chance) continue;
    const minimum = drop.minimum ?? drop.min ?? drop.quantity ?? 1;
    const maximum = drop.maximum ?? drop.max ?? drop.quantity ?? minimum;
    const quantity = random?.int ? random.int(minimum, maximum) : minimum;
    if (quantity > 0) drops.push({ itemId: drop.itemId, quantity });
  }
  return drops;
}

export function giveOrDropItems({ drops, playerItems, spawnItemDrop, x, y }) {
  for (const drop of drops ?? []) {
    const result = playerItems.addItem(drop.itemId, drop.quantity, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
    if (result.remaining > 0 && spawnItemDrop) spawnItemDrop(drop.itemId, result.remaining, x, y);
  }
}

export function tileDropPosition(tileX, tileY) {
  return {
    x: (tileX + 0.5) * CONFIG.TILE_SIZE,
    y: (tileY + 0.5) * CONFIG.TILE_SIZE
  };
}
