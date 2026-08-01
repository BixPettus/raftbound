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
    const validation = this.game.worldEditSystem?.previewState ?? this.game.buildingSystem.preview?.validation;
    const cost = selected.cost?.map((req) => `${req.quantity} ${getItemDefinition(req.itemId).name}`).join(", ") ?? "No cost";
    const domain = validation?.domain === "raft_structure" ? "Persistent raft structure" : "Raft placement";
    this.element.classList.remove("hidden");
    this.element.innerHTML = `
      <strong>${selected.name}</strong>
      <div>${domain}</div>
      <div>Cost: ${cost}</div>
      <div class="muted">${validation?.message ?? validation?.reason ?? "Move cursor over raft grid."}</div>
      <div class="muted">Left click place, R cycle, right click cancel.</div>`;
  }
}
