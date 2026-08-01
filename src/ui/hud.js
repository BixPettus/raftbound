import { CONFIG } from "../config.js";
import { getItemDefinition } from "../items/item-registry.js";

export class Hud {
  constructor(element, game) {
    this.element = element;
    this.game = game;
  }

  render() {
    const player = this.game.player;
    if (!player) {
      this.element.innerHTML = "";
      return;
    }
    const selected = player.hotbar.getSelectedHotbarItem();
    const selectedName = selected ? getItemDefinition(selected.itemId).name : "Empty";
    const island = this.game.world.island;
    const oxygenRelevant = player.oxygen < CONFIG.MAX_OXYGEN || player.inWater;
    this.element.innerHTML = `
      <div class="hud-top">
        <div class="metric">Health<div class="bar health"><span style="width:${Math.round(player.health)}%"></span></div></div>
        ${oxygenRelevant ? `<div class="metric">Oxygen<div class="bar oxygen"><span style="width:${Math.round(player.oxygen)}%"></span></div></div>` : ""}
        <div class="metric">State<br><strong>${this.game.state.current}</strong></div>
        <div class="metric">Biome<br><strong>${island?.biome ?? "Open ocean"}</strong></div>
        <div class="metric">Seed<br><strong>${island?.seed ?? "-"}</strong></div>
        <div class="metric">Distance<br><strong>${Math.floor(this.game.distanceTravelled)} m</strong></div>
        <div class="metric">Selected<br><strong>${selectedName}</strong></div>
      </div>
      <div class="hotbar">
        ${player.hotbar.slots.map((slot, index) => slotHtml(slot, index, player.hotbar.selectedIndex)).join("")}
      </div>
      ${this.game.contextPrompt ? `<div class="prompt">${this.game.contextPrompt}</div>` : ""}`;
  }
}

function slotHtml(slot, index, selectedIndex) {
  const selectedClass = index === selectedIndex ? " selected" : "";
  if (!slot) return `<div class="hotbar-slot${selectedClass}">${index + 1}</div>`;
  const item = getItemDefinition(slot.itemId);
  return `<div class="hotbar-slot${selectedClass}"><span>${index + 1}<br>${item.name}<br>${slot.quantity > 1 ? slot.quantity : ""}</span></div>`;
}
