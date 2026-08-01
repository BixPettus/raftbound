import { getItemDefinition } from "../items/item-registry.js";

export class BuildUI {
  constructor(element, game) {
    this.element = element;
    this.game = game;
  }

  render() {
    if (!this.game.buildingSystem.enabled) {
      this.element.classList.add("hidden");
      return;
    }
    const selected = this.game.buildingSystem.selectedStructure;
    const validation = this.game.buildingSystem.preview?.validation;
    const cost = selected.cost?.map((req) => `${req.quantity} ${getItemDefinition(req.itemId).name}`).join(", ") ?? "No cost";
    this.element.classList.remove("hidden");
    this.element.innerHTML = `
      <strong>${selected.name}</strong>
      <div>Cost: ${cost}</div>
      <div class="muted">${validation?.reason ?? "Move cursor over raft grid."}</div>
      <div class="muted">Left click place, R cycle, right click cancel.</div>`;
  }
}
