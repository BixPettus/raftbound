export class EncounterUI {
  constructor(element, game) {
    this.element = element;
    this.game = game;
    this.renderedKey = null;
    this.element.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button || !this.element.contains(button)) return;
      if (button.dataset.action === "accept") this.game.acceptEncounter();
      if (button.dataset.action === "decline") this.game.declineEncounter();
    });
  }

  render() {
    const encounter = this.game.pendingEncounter;
    if (!encounter) {
      this.element.classList.add("hidden");
      this.renderedKey = null;
      return;
    }
    this.element.classList.remove("hidden");
    const key = `${encounter.seed}:${encounter.biome.id}:${encounter.size}`;
    if (this.renderedKey !== key) {
      this.element.innerHTML = `
        <div class="encounter-card">
          <h2>Island ahead</h2>
          <p><strong>${encounter.biome.name}</strong> ${encounter.size} island</p>
          <p>Risk: ${encounter.biome.risk}</p>
          <p>Respond in <span data-countdown></span>s</p>
          <div class="encounter-actions">
            <button data-action="accept">Investigate</button>
            <button data-action="decline">Sail onward</button>
          </div>
        </div>`;
      this.renderedKey = key;
    }
    this.element.querySelector("[data-countdown]").textContent = Math.ceil(encounter.remaining);
  }
}
