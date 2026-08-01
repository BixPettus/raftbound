import { Entity, createEntityId } from "./entity.js";

export class ItemDrop extends Entity {
  constructor({ itemId, quantity, x, y }) {
    super({ id: createEntityId("drop"), x, y, width: 18, height: 18 });
    this.itemId = itemId;
    this.quantity = quantity;
  }
}
