import { CONFIG } from "../config.js";
import { getItemDefinition } from "./item-registry.js";

export class Inventory {
  constructor(size = CONFIG.INVENTORY_SIZE, slots = null) {
    this.size = size;
    this.slots = slots ? normalizeSlots(size, slots) : Array.from({ length: size }, () => null);
  }

  cloneSlots() {
    return this.slots.map((slot) => (slot ? { ...slot } : null));
  }

  addItem(itemId, quantity = 1) {
    let remaining = quantity;
    const item = getItemDefinition(itemId);
    for (const slot of this.slots) {
      if (slot?.itemId === itemId && slot.quantity < item.stackLimit) {
        const added = Math.min(remaining, item.stackLimit - slot.quantity);
        slot.quantity += added;
        remaining -= added;
        if (remaining === 0) return { added: quantity, remaining: 0 };
      }
    }
    for (let i = 0; i < this.slots.length; i += 1) {
      if (!this.slots[i]) {
        const added = Math.min(remaining, item.stackLimit);
        this.slots[i] = { itemId, quantity: added };
        remaining -= added;
        if (remaining === 0) return { added: quantity, remaining: 0 };
      }
    }
    return { added: quantity - remaining, remaining };
  }

  canAddItem(itemId, quantity = 1) {
    const clone = new Inventory(this.size, this.cloneSlots());
    return clone.addItem(itemId, quantity).remaining === 0;
  }

  countItem(itemId) {
    return this.slots.reduce((sum, slot) => sum + (slot?.itemId === itemId ? slot.quantity : 0), 0);
  }

  hasItems(requirements = []) {
    return requirements.every((req) => this.countItem(req.itemId) >= req.quantity);
  }

  removeItem(itemId, quantity = 1) {
    if (this.countItem(itemId) < quantity) return false;
    let remaining = quantity;
    for (let i = this.slots.length - 1; i >= 0; i -= 1) {
      const slot = this.slots[i];
      if (slot?.itemId !== itemId) continue;
      const removed = Math.min(remaining, slot.quantity);
      slot.quantity -= removed;
      remaining -= removed;
      if (slot.quantity <= 0) this.slots[i] = null;
      if (remaining === 0) return true;
    }
    return true;
  }

  removeItems(requirements = []) {
    if (!this.hasItems(requirements)) return false;
    for (const req of requirements) this.removeItem(req.itemId, req.quantity);
    return true;
  }

  moveStack(fromSlot, toSlot) {
    if (!this.slots[fromSlot] || fromSlot === toSlot) return false;
    const source = this.slots[fromSlot];
    const target = this.slots[toSlot];
    if (!target) {
      this.slots[toSlot] = source;
      this.slots[fromSlot] = null;
      return true;
    }
    if (target.itemId === source.itemId) {
      const limit = getItemDefinition(source.itemId).stackLimit;
      const moved = Math.min(source.quantity, limit - target.quantity);
      target.quantity += moved;
      source.quantity -= moved;
      if (source.quantity <= 0) this.slots[fromSlot] = null;
      return moved > 0;
    }
    this.slots[fromSlot] = target;
    this.slots[toSlot] = source;
    return true;
  }

  splitStack(slotIndex, quantity) {
    const slot = this.slots[slotIndex];
    if (!slot || quantity <= 0 || quantity >= slot.quantity) return false;
    const emptyIndex = this.slots.findIndex((slot) => !slot);
    if (emptyIndex === -1) return false;
    slot.quantity -= quantity;
    this.slots[emptyIndex] = { itemId: slot.itemId, quantity };
    return true;
  }

  serialize() {
    return this.cloneSlots();
  }
}

function normalizeSlots(size, slots) {
  const normalized = Array.from({ length: size }, (_, index) => {
    const slot = slots[index];
    return slot?.itemId && Number.isFinite(slot.quantity) ? { itemId: slot.itemId, quantity: slot.quantity } : null;
  });
  return normalized;
}
