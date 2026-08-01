import { CONFIG } from "../config.js";
import { Inventory } from "./inventory.js";

export class Hotbar extends Inventory {
  constructor(slots = null) {
    super(CONFIG.HOTBAR_SIZE, slots);
    this.selectedIndex = 0;
  }

  select(index) {
    this.selectedIndex = Math.max(0, Math.min(this.size - 1, index));
  }

  cycle(delta) {
    this.selectedIndex = (this.selectedIndex + delta + this.size) % this.size;
  }

  getSelectedHotbarItem() {
    return this.slots[this.selectedIndex];
  }

  serialize() {
    return {
      selectedIndex: this.selectedIndex,
      slots: this.cloneSlots()
    };
  }
}
