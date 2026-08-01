import { CONFIG } from "../config.js";
import { Entity, createEntityId } from "./entity.js";

const RESOURCE_DEFINITIONS = {
  tree: {
    name: "Tree",
    width: 54,
    height: 168,
    health: 54,
    requiredTool: "axe",
    minimumToolPower: 1,
    drops: [{ itemId: "wood", quantity: 5 }]
  },
  surface_stone: {
    name: "Surface Stone",
    width: 38,
    height: 30,
    health: 42,
    requiredTool: "pickaxe",
    minimumToolPower: 1,
    drops: [{ itemId: "stone", quantity: 4 }]
  },
  fibre_plant: {
    name: "Fibre Plant",
    width: 32,
    height: 42,
    health: 24,
    requiredTool: "axe",
    minimumToolPower: 1,
    drops: [{ itemId: "fibre", quantity: 5 }]
  }
};

export class ResourceNode extends Entity {
  constructor({ id, type, tileX, tileY, health, destroyed = false }) {
    const definition = RESOURCE_DEFINITIONS[type];
    super({
      id,
      x: tileX * CONFIG.TILE_SIZE + (CONFIG.TILE_SIZE - definition.width) / 2,
      y: (tileY + 1) * CONFIG.TILE_SIZE - definition.height,
      width: definition.width,
      height: definition.height
    });
    this.type = type;
    this.tileX = tileX;
    this.tileY = tileY;
    this.health = health ?? definition.health;
    this.maxHealth = definition.health;
    this.requiredTool = definition.requiredTool;
    this.minimumToolPower = definition.minimumToolPower;
    this.drops = definition.drops;
    this.destroyed = destroyed;
  }

  static create(type, tileX, tileY) {
    return new ResourceNode({ id: createEntityId(type), type, tileX, tileY });
  }

  hit(tool, inventory) {
    if (this.destroyed) return { ok: false, reason: "Already gathered." };
    if (!tool || tool.toolType !== this.requiredTool || tool.toolPower < this.minimumToolPower) {
      return { ok: false, reason: `Needs ${this.requiredTool}.` };
    }
    this.health -= tool.damage ?? 10;
    if (this.health <= 0) {
      this.destroyed = true;
      for (const drop of this.drops) inventory.addItem(drop.itemId, drop.quantity);
      return { ok: true, destroyed: true, drops: this.drops };
    }
    return { ok: true, destroyed: false };
  }
}

export function getResourceDefinition(type) {
  return RESOURCE_DEFINITIONS[type];
}
