import { CONFIG } from "../config.js";
import { Entity, createEntityId } from "./entity.js";
import { getResourceDefinition as getRegisteredResourceDefinition } from "../world/content/resource-registry.js";
import { rollDrops } from "../items/drop-pipeline.js";

export class ResourceNode extends Entity {
  constructor({ id, type, tileX, tileY, health, destroyed = false }) {
    const definition = getRegisteredResourceDefinition(type);
    const width = definition.collider.width;
    const height = definition.collider.height;
    super({
      id,
      x: tileX * CONFIG.TILE_SIZE + (CONFIG.TILE_SIZE - width) / 2,
      y: (tileY + 1) * CONFIG.TILE_SIZE - height,
      width,
      height
    });
    this.type = type;
    this.tileX = tileX;
    this.tileY = tileY;
    this.definition = definition;
    this.health = health ?? definition.tool.health;
    this.maxHealth = definition.tool.health;
    this.requiredTool = definition.tool.requiredType;
    this.minimumToolPower = definition.tool.minimumPower;
    this.drops = definition.drops;
    this.hazardId = definition.hazardId ?? null;
    this.rendererId = definition.rendererId ?? type;
    this.destroyed = destroyed;
  }

  static create(type, tileX, tileY, id = null) {
    return new ResourceNode({ id: id ?? createEntityId(type), type, tileX, tileY });
  }

  hit(tool, inventory) {
    if (this.destroyed) return { ok: false, reason: "Already gathered." };
    if (!tool || tool.toolType !== this.requiredTool || tool.toolPower < this.minimumToolPower) {
      return { ok: false, reason: `Needs ${this.requiredTool}.` };
    }
    this.health -= tool.damage ?? 10;
    if (this.health <= 0) {
      this.destroyed = true;
      const drops = rollDrops(this.drops);
      if (inventory) for (const drop of drops) inventory.addItem(drop.itemId, drop.quantity);
      return { ok: true, destroyed: true, drops };
    }
    return { ok: true, destroyed: false };
  }
}

export function getResourceDefinition(type) {
  return getRegisteredResourceDefinition(type);
}
