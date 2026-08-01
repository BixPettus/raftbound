import { listRecipes } from "../items/recipe-registry.js";
import { getItemDefinition } from "../items/item-registry.js";

export class CraftingUI {
  constructor(inventoryElement, game) {
    this.inventoryElement = inventoryElement;
    this.game = game;
  }

  renderInto() {
    if (!this.game.inventoryOpen) return;
    const card = this.inventoryElement.querySelector(".panel-card");
    if (!card) return;
    card.querySelector(".crafting-section")?.remove();
    const recipes = document.createElement("section");
    recipes.className = "crafting-section";
    recipes.innerHTML = `
      <h3>Crafting</h3>
      <div class="grid recipe-grid">
        ${listRecipes().map((recipe) => recipeHtml(recipe, this.game)).join("")}
      </div>`;
    card.appendChild(recipes);
    for (const button of card.querySelectorAll("[data-recipe]")) {
      button.onclick = () => this.game.craft(button.dataset.recipe);
    }
  }
}

function recipeHtml(recipe, game) {
  const output = getItemDefinition(recipe.output.itemId).name;
  const ingredients = recipe.ingredients.map((req) => `${req.quantity} ${getItemDefinition(req.itemId).name}`).join(", ");
  const hasStation = recipe.station ? game.raft.hasStation(recipe.station) : true;
  const canCraft = game.craftingSystem.canCraft(recipe, game.player.inventory, hasStation);
  return `
    <div class="recipe">
      <strong>${recipe.name}</strong>
      <div>${output} x${recipe.output.quantity}</div>
      <div class="muted">${ingredients}${recipe.station ? ` at ${recipe.station}` : ""}</div>
      <button data-recipe="${recipe.id}" ${canCraft ? "" : "disabled"}>Craft</button>
    </div>`;
}
