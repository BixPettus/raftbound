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
    const before = inventory.cloneSlots();
    inventory.removeItems(recipe.ingredients);
    const addResult = inventory.addItem(recipe.output.itemId, recipe.output.quantity);
    if (addResult.remaining > 0) {
      inventory.slots = before;
      return { ok: false, reason: "No inventory space." };
    }
    return { ok: true };
  }
}
