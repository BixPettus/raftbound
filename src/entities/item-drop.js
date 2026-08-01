import { Entity, createEntityId } from "./entity.js";

export class ItemDrop extends Entity {
  constructor({ id = null, itemId, quantity, x, y, vx = 0, vy = 0, pickupDelay = 0.25, createdTick = 0 }) {
    super({ id: id ?? createEntityId("drop"), x, y, width: 18, height: 18 });
    this.itemId = itemId;
    this.quantity = quantity;
    this.vx = vx;
    this.vy = vy;
    this.pickupDelay = pickupDelay;
    this.createdTick = createdTick;
  }

  update(dt) {
    this.recordPreviousPosition();
    this.pickupDelay = Math.max(0, this.pickupDelay - dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.max(0, 1 - 2.8 * dt);
    this.vy *= Math.max(0, 1 - 2.8 * dt);
  }

  serialize() {
    return {
      id: this.id,
      itemId: this.itemId,
      quantity: this.quantity,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      pickupDelay: this.pickupDelay,
      createdTick: this.createdTick
    };
  }
}
