import { INVENTORY_POLICIES } from "./player-inventory.js";

export class CraftingSystem {
  constructor(recipeRegistry) {
    this.recipeRegistry = recipeRegistry;
  }

  canCraft(recipe, inventory, hasStation = false) {
    if (recipe.station && !hasStation) return false;
    return inventory.hasItems(recipe.ingredients);
  }

  craft(recipe, inventory, hasStation = false) {
    if (!this.canCraft(recipe, inventory, hasStation)) return { ok: false, reason: "Missing ingredients or station." };
    const reservation = inventory.reserveItems
      ? inventory.reserveItems(recipe.ingredients, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS)
      : { ok: true, before: inventory.cloneSlots() };
    if (!reservation.ok) return { ok: false, reason: "Missing ingredients or station." };
    if (inventory.commitReservation) inventory.commitReservation(reservation);
    else inventory.removeItems(recipe.ingredients);
    const addResult = inventory.addItem(recipe.output.itemId, recipe.output.quantity, INVENTORY_POLICIES.ALL_PLAYER_CONTAINERS);
    if (addResult.remaining > 0) {
      if (inventory.rollbackReservation) inventory.rollbackReservation(reservation);
      else inventory.slots = reservation.before;
      return { ok: false, reason: "No inventory space." };
    }
    return { ok: true };
  }
}
