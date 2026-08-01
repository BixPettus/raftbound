import { getItemDefinition } from "../items/item-registry.js";

export class InventoryUI {
  constructor(element, game) {
    this.element = element;
    this.game = game;
    this.lastMarkup = "";
    this.pointerDrag = null;
    this.bind();
  }

  render() {
    if (!this.game.inventoryOpen) {
      this.element.classList.add("hidden");
      this.lastMarkup = "";
      return;
    }
    const player = this.game.player;
    const storage = this.game.openStorageId ? this.game.raft.storage.get(this.game.openStorageId) : null;
    this.element.classList.remove("hidden");
    const markup = `
      <div class="panel-card bag-card">
        <header class="bag-header">
          <div>
            <h2>Travel Bag</h2>
            <p class="muted">${summaryText(player.inventory)} carried</p>
          </div>
          <div class="bag-badge">${filledCount(player.inventory)}/${player.inventory.size}</div>
        </header>
        ${slotSection("Pouch", "inventory", player.inventory.slots)}
        ${slotSection("Belt", "hotbar", player.hotbar.slots, player.hotbar.selectedIndex)}
        ${storage ? `
          <div class="storage-actions">
            <h3>Storage crate</h3>
            <div>
              <button data-action="deposit">Deposit resources</button>
              <button data-action="withdraw">Withdraw first stack</button>
            </div>
          </div>
          ${slotGrid("storage", storage.slots)}
        ` : ""}
        <p class="muted bag-help">Drag stacks between slots. Matching stacks merge; different stacks swap.</p>
      </div>`;
    if (markup === this.lastMarkup) return;
    this.lastMarkup = markup;
    this.element.innerHTML = markup;
  }

  bind() {
    this.element.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "deposit") this.game.depositBasicResources();
      if (action === "withdraw") this.game.withdrawFirstStorageStack();
    });
    this.element.addEventListener("dragstart", (event) => {
      const slot = event.target.closest("[data-container][data-index]");
      if (!slot || !slot.draggable) return;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-raftbound-slot", JSON.stringify(slotPayload(slot)));
      slot.classList.add("dragging");
    });
    this.element.addEventListener("dragend", (event) => {
      event.target.closest(".slot")?.classList.remove("dragging");
    });
    this.element.addEventListener("dragover", (event) => {
      if (!event.target.closest("[data-container][data-index]")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    this.element.addEventListener("drop", (event) => {
      const slot = event.target.closest("[data-container][data-index]");
      if (!slot) return;
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/x-raftbound-slot");
      if (!raw) return;
      const moved = this.game.moveItemStack(JSON.parse(raw), slotPayload(slot));
      if (moved) this.lastMarkup = "";
    });
    this.element.addEventListener("pointerdown", (event) => {
      const slot = event.target.closest("[data-container][data-index]");
      if (!slot || !slot.draggable) return;
      this.pointerDrag = slotPayload(slot);
      slot.classList.add("dragging");
    });
    this.element.addEventListener("pointerup", (event) => {
      const target = event.target.closest("[data-container][data-index]");
      const dragging = this.element.querySelector(".slot.dragging");
      dragging?.classList.remove("dragging");
      if (!this.pointerDrag || !target) {
        this.pointerDrag = null;
        return;
      }
      const to = slotPayload(target);
      const sameSlot = this.pointerDrag.container === to.container && this.pointerDrag.index === to.index;
      if (!sameSlot && this.game.moveItemStack(this.pointerDrag, to)) this.lastMarkup = "";
      this.pointerDrag = null;
    });
    this.element.addEventListener("pointercancel", () => {
      this.element.querySelector(".slot.dragging")?.classList.remove("dragging");
      this.pointerDrag = null;
    });
  }
}

function slotSection(title, container, slots, selectedIndex = -1) {
  return `
    <section class="bag-section">
      <h3>${title}</h3>
      ${slotGrid(container, slots, selectedIndex)}
    </section>`;
}

function slotGrid(container, slots, selectedIndex = -1) {
  return `<div class="grid slot-grid">${slots.map((slot, index) => slotHtml(slot, container, index, selectedIndex)).join("")}</div>`;
}

function slotHtml(slot, container, index, selectedIndex) {
  const selected = index === selectedIndex ? " selected" : "";
  if (!slot) return `<div class="slot empty-slot${selected}" data-container="${container}" data-index="${index}"><span>${index + 1}</span></div>`;
  const item = getItemDefinition(slot.itemId);
  const power = item.toolPower ? `<span>Power ${item.toolPower}</span>` : "";
  const stack = item.stackLimit > 1 ? `<span>${slot.quantity}/${item.stackLimit}</span>` : "<span>Held</span>";
  return `
    <div class="slot item-slot${selected}" draggable="true" data-container="${container}" data-index="${index}">
      <div class="item-icon">${item.name.slice(0, 2).toUpperCase()}</div>
      <strong>${item.name}</strong>
      <small>${item.category}${power ? ` · ${power}` : ""}</small>
      <em>${stack}</em>
    </div>`;
}

function slotPayload(slot) {
  return {
    container: slot.dataset.container,
    index: Number(slot.dataset.index)
  };
}

function filledCount(inventory) {
  return inventory.slots.filter(Boolean).length;
}

function summaryText(inventory) {
  const groups = new Map();
  for (const slot of inventory.slots) {
    if (!slot) continue;
    const item = getItemDefinition(slot.itemId);
    groups.set(item.category, (groups.get(item.category) ?? 0) + slot.quantity);
  }
  if (groups.size === 0) return "No items";
  return [...groups.entries()].map(([category, count]) => `${count} ${category}`).join(" / ");
}
