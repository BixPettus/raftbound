export const INVENTORY_POLICIES = Object.freeze({
  BAG_ONLY: "BAG_ONLY",
  HOTBAR_ONLY: "HOTBAR_ONLY",
  SELECTED_STACK: "SELECTED_STACK",
  SELECTED_FIRST: "SELECTED_FIRST",
  ALL_PLAYER_CONTAINERS: "ALL_PLAYER_CONTAINERS"
});

export class PlayerInventory {
  constructor({ bag, hotbar }) {
    this.bag = bag;
    this.hotbar = hotbar;
  }

  countItem(itemId, policy = INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS) {
    return this.containersForPolicy(policy).reduce((sum, container) => sum + container.countItem(itemId), 0);
  }

  hasItems(requirements = [], policy = INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS) {
    return requirements.every((req) => this.countItem(req.itemId, policy) >= req.quantity);
  }

  reserveItems(requirements = [], policy = INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS) {
    if (!this.hasItems(requirements, policy)) return { ok: false, reason: "MISSING_ITEM" };
    return {
      ok: true,
      requirements: requirements.map((req) => ({ ...req })),
      policy,
      bagSlots: this.bag.cloneSlots(),
      hotbarSlots: this.hotbar.cloneSlots()
    };
  }

  commitReservation(reservation) {
    if (!reservation?.ok) return false;
    return this.removeItems(reservation.requirements, reservation.policy);
  }

  rollbackReservation(reservation) {
    if (!reservation?.ok) return false;
    this.bag.slots = reservation.bagSlots.map((slot) => slot ? { ...slot } : null);
    this.hotbar.slots = reservation.hotbarSlots.map((slot) => slot ? { ...slot } : null);
    return true;
  }

  addItem(itemId, quantity = 1, policy = INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS) {
    let remaining = quantity;
    let added = 0;
    for (const container of this.containersForPolicy(policy)) {
      const result = container.addItem(itemId, remaining);
      added += result.added;
      remaining = result.remaining;
      if (remaining <= 0) break;
    }
    return { added, remaining };
  }

  removeItem(itemId, quantity = 1, policy = INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS) {
    return this.removeItems([{ itemId, quantity }], policy);
  }

  removeItems(requirements = [], policy = INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS) {
    if (!this.hasItems(requirements, policy)) return false;
    for (const req of requirements) this.removeSingleItem(req.itemId, req.quantity, policy);
    return true;
  }

  getSelectedStack() {
    const stack = this.hotbar.getSelectedHotbarItem();
    return stack ? { ...stack, container: "hotbar", index: this.hotbar.selectedIndex } : null;
  }

  consumeSelected(quantity = 1) {
    const selected = this.hotbar.getSelectedHotbarItem();
    if (!selected || selected.quantity < quantity) return false;
    selected.quantity -= quantity;
    if (selected.quantity <= 0) this.hotbar.slots[this.hotbar.selectedIndex] = null;
    return true;
  }

  moveStack(source, destination) {
    const from = this.resolveContainer(source?.container);
    const to = this.resolveContainer(destination?.container);
    if (!from || !to) return false;
    if (from === to) return from.moveStack(Number(source.index), Number(destination.index));
    return moveStackBetween(from, Number(source.index), to, Number(destination.index));
  }

  serialize() {
    return {
      inventory: this.bag.serialize(),
      hotbar: this.hotbar.serialize()
    };
  }

  containersForPolicy(policy) {
    if (policy === INVENTORY_POLICIES.BAG_ONLY) return [this.bag];
    if (policy === INVENTORY_POLICIES.HOTBAR_ONLY || policy === INVENTORY_POLICIES.SELECTED_STACK) return [this.hotbar];
    if (policy === INVENTORY_POLICIES.SELECTED_FIRST) return [this.hotbar, this.bag];
    return [this.bag, this.hotbar];
  }

  resolveContainer(container) {
    if (container === "inventory" || container === "bag") return this.bag;
    if (container === "hotbar") return this.hotbar;
    return null;
  }

  removeSingleItem(itemId, quantity, policy) {
    if (policy === INVENTORY_POLICIES.SELECTED_STACK) {
      const selected = this.hotbar.getSelectedHotbarItem();
      if (selected?.itemId !== itemId || selected.quantity < quantity) return false;
      return this.consumeSelected(quantity);
    }
    let remaining = quantity;
    for (const container of this.containersForPolicy(policy)) {
      for (let i = container.slots.length - 1; i >= 0; i -= 1) {
        const slot = container.slots[i];
        if (slot?.itemId !== itemId) continue;
        const removed = Math.min(remaining, slot.quantity);
        slot.quantity -= removed;
        remaining -= removed;
        if (slot.quantity <= 0) container.slots[i] = null;
        if (remaining <= 0) return true;
      }
    }
    return remaining <= 0;
  }
}

function moveStackBetween(source, fromIndex, target, toIndex) {
  const sourceSlot = source.slots[fromIndex];
  if (!sourceSlot || toIndex < 0 || toIndex >= target.slots.length) return false;
  const targetSlot = target.slots[toIndex];
  if (!targetSlot) {
    target.slots[toIndex] = sourceSlot;
    source.slots[fromIndex] = null;
    return true;
  }
  if (targetSlot.itemId === sourceSlot.itemId) {
    const moved = target.addItem(sourceSlot.itemId, sourceSlot.quantity);
    sourceSlot.quantity = moved.remaining;
    if (sourceSlot.quantity <= 0) source.slots[fromIndex] = null;
    return moved.added > 0;
  }
  source.slots[fromIndex] = targetSlot;
  target.slots[toIndex] = sourceSlot;
  return true;
}
